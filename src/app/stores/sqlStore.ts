import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import * as duckdb from '@duckdb/duckdb-wasm';

// Query history entry
export interface QueryHistoryEntry {
  query: string;
  timestamp: number;
  rowCount: number;
}

// SQL store state interface
export interface SqlStoreState {
  // DuckDB state
  isLoading: boolean;
  isReady: boolean;
  loadError: string | null;

  // Query state
  currentQuery: string;
  isExecuting: boolean;
  queryError: string | null;
  executionTime: number | null;

  // Results
  results: Array<Record<string, unknown>> | null;
  rowCount: number;
  columnNames: string[];

  // Query history (session only)
  queryHistory: QueryHistoryEntry[];

  // Table info
  tableName: string;
  tableLoaded: boolean;
}

function createSqlStore() {
  const [store, setStore] = createStore<SqlStoreState>({
    // DuckDB state
    isLoading: false,
    isReady: false,
    loadError: null,

    // Query state
    currentQuery: '',
    isExecuting: false,
    queryError: null,
    executionTime: null,

    // Results
    results: null,
    rowCount: 0,
    columnNames: [],

    // Query history (session only)
    queryHistory: [],

    // Table info
    tableName: 'data',
    tableLoaded: false,
  });

  // DuckDB instance (not reactive)
  let db: duckdb.AsyncDuckDB | null = null;
  let connection: duckdb.AsyncDuckDBConnection | null = null;

  /**
   * Lazy load DuckDB-WASM from CDN
   * Updates isLoading/isReady state
   */
  const initDuckDB = async (): Promise<boolean> => {
    // Already initialized
    if (db && store.isReady) {
      return true;
    }

    // Already loading
    if (store.isLoading) {
      return false;
    }

    setStore({
      isLoading: true,
      loadError: null,
    });

    try {
      // Get bundle info from JSDelivr CDN
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      // Fetch worker script to avoid CORS issues
      const workerResponse = await fetch(bundle.mainWorker!);
      const workerScript = await workerResponse.text();
      const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);

      const worker = new Worker(workerUrl);
      const logger = new duckdb.ConsoleLogger();
      db = new duckdb.AsyncDuckDB(logger, worker);

      // Instantiate the database
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      // Create a persistent connection
      connection = await db.connect();

      setStore({
        isLoading: false,
        isReady: true,
        loadError: null,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize DuckDB';
      setStore({
        isLoading: false,
        isReady: false,
        loadError: errorMessage,
      });
      return false;
    }
  };

  /**
   * Load an uploaded file into DuckDB as a table
   * Supports CSV, JSON, and Parquet files
   */
  const loadFileIntoTable = async (file: File, tableName?: string): Promise<boolean> => {
    if (!db || !connection) {
      setStore('loadError', 'DuckDB not initialized');
      return false;
    }

    const name = tableName || 'data';
    const fileName = file.name.toLowerCase();

    setStore({
      isLoading: true,
      loadError: null,
      tableLoaded: false,
      tableName: name,
    });

    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Register the file in DuckDB's virtual filesystem
      await db.registerFileBuffer(file.name, uint8Array);

      // Drop existing table if it exists
      await connection.query(`DROP TABLE IF EXISTS "${name}"`);

      // Create table based on file type
      let createQuery: string;
      if (fileName.endsWith('.parquet')) {
        createQuery = `CREATE TABLE "${name}" AS SELECT * FROM read_parquet('${file.name}')`;
      } else if (fileName.endsWith('.json') || fileName.endsWith('.jsonl')) {
        createQuery = `CREATE TABLE "${name}" AS SELECT * FROM read_json_auto('${file.name}')`;
      } else {
        // Default to CSV (handles .csv, .tsv, etc.)
        createQuery = `CREATE TABLE "${name}" AS SELECT * FROM read_csv_auto('${file.name}')`;
      }

      await connection.query(createQuery);

      setStore({
        isLoading: false,
        tableLoaded: true,
        tableName: name,
        currentQuery: `SELECT * FROM "${name}" LIMIT 100`,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
      setStore({
        isLoading: false,
        loadError: errorMessage,
        tableLoaded: false,
      });
      return false;
    }
  };

  /**
   * Execute a SQL query and update results
   * Tracks execution time and adds to history
   */
  const executeQuery = async (sql: string): Promise<boolean> => {
    if (!connection) {
      setStore('queryError', 'DuckDB not connected');
      return false;
    }

    if (!sql.trim()) {
      setStore('queryError', 'Query cannot be empty');
      return false;
    }

    setStore({
      isExecuting: true,
      queryError: null,
      executionTime: null,
    });

    const startTime = performance.now();

    try {
      const result = await connection.query(sql);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Convert Arrow result to array of objects
      // Handle BigInt serialization by converting to string
      const rows = result.toArray().map((row) => {
        const obj = row.toJSON();
        // Convert BigInt values to strings
        for (const key in obj) {
          if (typeof obj[key] === 'bigint') {
            obj[key] = obj[key].toString();
          }
        }
        return obj;
      });

      // Get column names from schema
      const columnNames = result.schema.fields.map((field) => field.name);

      // Add to query history
      const historyEntry: QueryHistoryEntry = {
        query: sql,
        timestamp: Date.now(),
        rowCount: rows.length,
      };

      setStore({
        isExecuting: false,
        results: rows,
        rowCount: rows.length,
        columnNames,
        executionTime,
        queryError: null,
        currentQuery: sql,
        queryHistory: [...store.queryHistory, historyEntry],
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed';
      setStore({
        isExecuting: false,
        queryError: errorMessage,
        executionTime: null,
      });
      return false;
    }
  };

  /**
   * Clear query results
   */
  const clearResults = () => {
    setStore({
      results: null,
      rowCount: 0,
      columnNames: [],
      queryError: null,
      executionTime: null,
    });
  };

  /**
   * Update current query text
   */
  const setQuery = (sql: string) => {
    setStore('currentQuery', sql);
  };

  /**
   * Reset the store to initial state
   * Closes DuckDB connection if open
   */
  const reset = async () => {
    if (connection) {
      try {
        await connection.close();
      } catch {
        // Ignore close errors
      }
      connection = null;
    }

    if (db) {
      try {
        await db.terminate();
      } catch {
        // Ignore terminate errors
      }
      db = null;
    }

    setStore({
      isLoading: false,
      isReady: false,
      loadError: null,
      currentQuery: '',
      isExecuting: false,
      queryError: null,
      executionTime: null,
      results: null,
      rowCount: 0,
      columnNames: [],
      queryHistory: [],
      tableName: 'data',
      tableLoaded: false,
    });
  };

  /**
   * Get the DuckDB connection for advanced operations
   * Returns null if not initialized
   */
  const getConnection = (): duckdb.AsyncDuckDBConnection | null => {
    return connection;
  };

  /**
   * Get the DuckDB instance for advanced operations
   * Returns null if not initialized
   */
  const getDb = (): duckdb.AsyncDuckDB | null => {
    return db;
  };

  return {
    // State
    store,

    // Actions
    initDuckDB,
    loadFileIntoTable,
    executeQuery,
    clearResults,
    setQuery,
    reset,

    // Advanced access
    getConnection,
    getDb,
  };
}

// Create singleton store instance using createRoot
export const sqlStore = createRoot(createSqlStore);
