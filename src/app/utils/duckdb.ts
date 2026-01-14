/**
 * DuckDB-WASM utility for FEAT-020 SQL Mode
 *
 * Provides lazy-loaded DuckDB-WASM initialization with singleton pattern,
 * query execution with timeout, and BigInt serialization handling.
 */
import type * as DuckDBTypes from '@duckdb/duckdb-wasm';

// Type alias for cleaner usage
type AsyncDuckDB = DuckDBTypes.AsyncDuckDB;
type AsyncDuckDBConnection = DuckDBTypes.AsyncDuckDBConnection;

// Singleton instance
let dbInstance: AsyncDuckDB | null = null;
let dbInitPromise: Promise<AsyncDuckDB> | null = null;
let workerUrl: string | null = null;

// Constants
const QUERY_TIMEOUT_MS = 30_000; // 30 seconds
const LARGE_RESULT_WARNING_THRESHOLD = 100_000; // Warn if more than 100k rows

/**
 * Error class for DuckDB-specific errors
 */
export class DuckDBError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
    ) {
        super(message);
        this.name = 'DuckDBError';
    }
}

/**
 * Serializes query results, converting BigInt values to strings
 * to avoid JSON serialization issues.
 */
export function serializeResults<T>(rows: T[]): T[] {
    return JSON.parse(
        JSON.stringify(rows, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
    );
}

/**
 * Initializes DuckDB-WASM using JSDelivr CDN.
 * Uses a blob URL for the worker to avoid CORS issues.
 * This function is idempotent - multiple calls return the same instance.
 *
 * @returns Promise resolving to the initialized AsyncDuckDB instance
 * @throws DuckDBError if initialization fails
 */
export async function initDuckDB(): Promise<AsyncDuckDB> {
    // Return existing instance if already initialized
    if (dbInstance) {
        return dbInstance;
    }

    // Return existing initialization promise if in progress
    if (dbInitPromise) {
        return dbInitPromise;
    }

    // Start initialization
    dbInitPromise = (async () => {
        try {
            // Dynamically import DuckDB-WASM (lazy loading)
            const duckdb = await import('@duckdb/duckdb-wasm');

            // Get bundle info from JSDelivr CDN
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

            if (!bundle.mainWorker) {
                throw new DuckDBError('No main worker found in bundle', 'BUNDLE_ERROR');
            }

            // Fetch worker script and create blob URL to avoid CORS issues
            const workerResponse = await fetch(bundle.mainWorker);
            if (!workerResponse.ok) {
                throw new DuckDBError(
                    `Failed to fetch worker script: ${workerResponse.statusText}`,
                    'WORKER_FETCH_ERROR',
                );
            }

            const workerScript = await workerResponse.text();
            const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
            workerUrl = URL.createObjectURL(workerBlob);

            // Create worker and logger
            const worker = new Worker(workerUrl);
            const logger = new duckdb.ConsoleLogger();

            // Create and instantiate the database
            const db = new duckdb.AsyncDuckDB(logger, worker);
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

            dbInstance = db;
            return db;
        } catch (error) {
            // Clear the promise so initialization can be retried
            dbInitPromise = null;

            if (error instanceof DuckDBError) {
                throw error;
            }

            throw new DuckDBError(
                `Failed to initialize DuckDB: ${error instanceof Error ? error.message : String(error)}`,
                'INIT_ERROR',
            );
        }
    })();

    return dbInitPromise;
}

/**
 * Gets the DuckDB instance, initializing if necessary.
 *
 * @returns Promise resolving to the AsyncDuckDB instance
 * @throws DuckDBError if not initialized and initialization fails
 */
export async function getDuckDB(): Promise<AsyncDuckDB> {
    if (dbInstance) {
        return dbInstance;
    }
    return initDuckDB();
}

/**
 * Query result with metadata
 */
export interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
    rowCount: number;
    columnNames: string[];
    executionTimeMs: number;
    warning?: string;
}

/**
 * Executes a SQL query with timeout protection.
 *
 * @param sql - The SQL query to execute
 * @param timeoutMs - Optional timeout in milliseconds (default: 30000)
 * @returns Promise resolving to the query results
 * @throws DuckDBError if query fails or times out
 */
export async function executeQuery<T = Record<string, unknown>>(
    sql: string,
    timeoutMs: number = QUERY_TIMEOUT_MS,
): Promise<QueryResult<T>> {
    const db = await getDuckDB();
    let conn: AsyncDuckDBConnection | null = null;

    const startTime = performance.now();

    try {
        // Create connection
        conn = await db.connect();

        // Execute query with timeout
        const queryPromise = conn.query(sql);

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(
                    new DuckDBError(
                        `Query timed out after ${timeoutMs}ms. Consider adding LIMIT or optimizing your query.`,
                        'TIMEOUT',
                    ),
                );
            }, timeoutMs);
        });

        const result = await Promise.race([queryPromise, timeoutPromise]);

        const executionTimeMs = performance.now() - startTime;

        // Convert Arrow table to array of objects
        const arrowRows = result.toArray();
        const rows = arrowRows.map((row) => row.toJSON() as T);

        // Serialize to handle BigInt values
        const serializedRows = serializeResults(rows);

        // Get column names from schema
        const columnNames = result.schema.fields.map((field) => field.name);

        // Prepare result with optional warning
        const queryResult: QueryResult<T> = {
            rows: serializedRows,
            rowCount: serializedRows.length,
            columnNames,
            executionTimeMs,
        };

        // Add memory warning for large result sets
        if (serializedRows.length >= LARGE_RESULT_WARNING_THRESHOLD) {
            queryResult.warning = `Large result set (${serializedRows.length.toLocaleString()} rows). Consider adding LIMIT to reduce memory usage.`;
        }

        return queryResult;
    } catch (error) {
        if (error instanceof DuckDBError) {
            throw error;
        }

        throw new DuckDBError(
            `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
            'QUERY_ERROR',
        );
    } finally {
        // Always close the connection
        if (conn) {
            try {
                await conn.close();
            } catch {
                // Ignore close errors
            }
        }
    }
}

/**
 * Registers a CSV file in DuckDB for querying.
 *
 * @param name - The table name to use
 * @param file - The File object containing CSV data
 * @returns Promise resolving when registration is complete
 */
export async function registerCSV(name: string, file: File): Promise<void> {
    const db = await getDuckDB();
    await db.registerFileHandle(name, file, 2 /* DuckDBDataProtocol.BROWSER_FILEREADER */, true);
}

/**
 * Registers a Parquet file in DuckDB for querying.
 *
 * @param name - The table name to use
 * @param file - The File object containing Parquet data
 * @returns Promise resolving when registration is complete
 */
export async function registerParquet(name: string, file: File): Promise<void> {
    const db = await getDuckDB();
    await db.registerFileHandle(name, file, 2 /* DuckDBDataProtocol.BROWSER_FILEREADER */, true);
}

/**
 * Creates a table from CSV content string.
 *
 * @param tableName - The name for the new table
 * @param csvContent - The CSV content as a string
 * @returns Promise resolving when table is created
 */
export async function createTableFromCSV(tableName: string, csvContent: string): Promise<void> {
    const db = await getDuckDB();

    // Register the CSV content as a file
    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csvContent);
    await db.registerFileBuffer(`${tableName}.csv`, csvBytes);

    // Create table from the registered file
    await executeQuery(`CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${tableName}.csv')`);
}

/**
 * Drops a table if it exists.
 *
 * @param tableName - The name of the table to drop
 * @returns Promise resolving when table is dropped
 */
export async function dropTable(tableName: string): Promise<void> {
    await executeQuery(`DROP TABLE IF EXISTS ${tableName}`);
}

/**
 * Lists all tables in the database.
 *
 * @returns Promise resolving to array of table names
 */
export async function listTables(): Promise<string[]> {
    const result = await executeQuery<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table'`);
    return result.rows.map((row) => row.name);
}

/**
 * Gets the schema of a table.
 *
 * @param tableName - The name of the table
 * @returns Promise resolving to column information
 */
export async function getTableSchema(
    tableName: string,
): Promise<Array<{ column_name: string; column_type: string }>> {
    const result = await executeQuery<{ column_name: string; column_type: string }>(
        `DESCRIBE ${tableName}`,
    );
    return result.rows;
}

/**
 * Checks if DuckDB has been initialized.
 *
 * @returns true if DuckDB is initialized
 */
export function isInitialized(): boolean {
    return dbInstance !== null;
}

/**
 * Terminates DuckDB and cleans up resources.
 * After calling this, initDuckDB() must be called again to use DuckDB.
 */
export async function terminate(): Promise<void> {
    if (dbInstance) {
        try {
            await dbInstance.terminate();
        } catch {
            // Ignore termination errors
        }
        dbInstance = null;
    }

    if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
        workerUrl = null;
    }

    dbInitPromise = null;
}
