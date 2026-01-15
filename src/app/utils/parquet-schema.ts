import { initDuckDB, executeQuery, registerParquet } from './duckdb';
import type { TreeNode } from './structure-scanner';

/**
 * Read Parquet schema and convert to tree structure for Tree Mode
 */
export async function readParquetSchema(file: File): Promise<{
    tree: TreeNode;
    totalColumns: number;
    maxDepth: number;
}> {
    // Initialize DuckDB
    await initDuckDB();

    // Register Parquet file temporarily for schema reading
    const tempName = 'schema_scan.parquet';
    await registerParquet(tempName, file);

    // Get schema using DESCRIBE (doesn't read data, just metadata)
    const schemaResult = await executeQuery<{ column_name: string; column_type: string }>(
        `DESCRIBE SELECT * FROM read_parquet('${tempName}')`
    );

    // Build tree from flat column list
    const root: TreeNode = {
        path: '$',
        depth: 0,
        data_type: 'object',
        population: 100, // Schema columns always exist
        child_count: 0,
        children: [],
    };

    let maxDepth = 0;
    let totalColumns = 0;

    // Parse each column and add to tree
    for (const col of schemaResult.rows) {
        const columnName = col.column_name;
        const columnType = col.column_type;

        // Parse nested structure from column name
        // Supports both "user.preferences.email" and "user_preferences_email"
        const parts = parseColumnPath(columnName);
        const depth = parts.length;
        maxDepth = Math.max(maxDepth, depth);
        totalColumns++;

        // Add to tree
        addColumnToTree(root, parts, columnType, depth);
    }

    // Update child counts recursively
    updateChildCounts(root);

    return {
        tree: root,
        totalColumns,
        maxDepth,
    };
}

/**
 * Parse column name into path parts
 * Handles both dotted (user.preferences) and underscored (user_preferences) notation
 */
function parseColumnPath(columnName: string): string[] {
    // First try splitting by dots (nested struct notation)
    if (columnName.includes('.')) {
        return columnName.split('.');
    }

    // If no dots, try splitting by underscores (flattened notation)
    // But be careful: some columns might legitimately have underscores
    // Heuristic: if column has multiple underscores and no dots, assume nested
    const underscoreCount = (columnName.match(/_/g) || []).length;
    if (underscoreCount >= 2) {
        return columnName.split('_');
    }

    // Otherwise, treat as single column
    return [columnName];
}

/**
 * Add a column to the tree structure
 */
function addColumnToTree(
    parent: TreeNode,
    parts: string[],
    columnType: string,
    fullDepth: number
): void {
    if (parts.length === 0) return;

    const [first, ...rest] = parts;
    const isLeaf = rest.length === 0;

    // Find or create child node
    let child = parent.children?.find(c => {
        const childName = c.path.split('.').pop() || c.path;
        return childName === first;
    });

    if (!child) {
        const childPath = parent.path === '$' ? `$.${first}` : `${parent.path}.${first}`;

        child = {
            path: childPath,
            depth: parent.depth + 1,
            data_type: isLeaf ? mapParquetTypeToNodeType(columnType) : 'object',
            population: 100, // Schema columns always present
            child_count: 0,
            children: isLeaf ? undefined : [],
        };

        if (!parent.children) {
            parent.children = [];
        }
        parent.children.push(child);
    }

    // Recurse for nested parts
    if (!isLeaf && child.children) {
        addColumnToTree(child, rest, columnType, fullDepth);
    }
}

/**
 * Map Parquet/DuckDB type to TreeNode type
 */
function mapParquetTypeToNodeType(parquetType: string): TreeNode['data_type'] {
    const typeUpper = parquetType.toUpperCase();

    if (typeUpper.includes('INT') || typeUpper.includes('BIGINT') || typeUpper.includes('SMALLINT')) {
        return 'number';
    }
    if (typeUpper.includes('DOUBLE') || typeUpper.includes('FLOAT') || typeUpper.includes('DECIMAL')) {
        return 'number';
    }
    if (typeUpper.includes('VARCHAR') || typeUpper.includes('TEXT') || typeUpper.includes('STRING')) {
        return 'string';
    }
    if (typeUpper.includes('BOOL')) {
        return 'boolean';
    }
    if (typeUpper.includes('DATE') || typeUpper.includes('TIME') || typeUpper.includes('TIMESTAMP')) {
        return 'string'; // Treat dates as strings for now
    }
    if (typeUpper.includes('STRUCT')) {
        return 'object';
    }
    if (typeUpper.includes('LIST') || typeUpper.includes('ARRAY')) {
        return 'array';
    }

    return 'string'; // Default fallback
}

/**
 * Update child counts recursively
 */
function updateChildCounts(node: TreeNode): number {
    if (!node.children || node.children.length === 0) {
        node.child_count = 0;
        return 1; // Leaf node counts as 1
    }

    let totalDescendants = 0;
    for (const child of node.children) {
        totalDescendants += updateChildCounts(child);
    }

    node.child_count = node.children.length;
    return totalDescendants;
}

/**
 * Count total leaf nodes (actual columns) in tree
 */
export function countLeafNodes(node: TreeNode): number {
    if (!node.children || node.children.length === 0) {
        return 1;
    }

    return node.children.reduce((sum, child) => sum + countLeafNodes(child), 0);
}

/**
 * Get all leaf paths (actual column names for DuckDB SELECT)
 */
export function getLeafPaths(node: TreeNode): string[] {
    if (!node.children || node.children.length === 0) {
        return [node.path.replace(/^\$\./, '')]; // Remove $. prefix
    }

    return node.children.flatMap(child => getLeafPaths(child));
}
