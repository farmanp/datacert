/**
 * CSV conversion utility for DuckDB query results
 *
 * Converts query result rows to properly escaped CSV format.
 */

/**
 * Escapes a value for CSV format.
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any existing quotes
 * - Converts null/undefined to empty string
 *
 * @param value - The value to escape
 * @returns The escaped string value
 */
function escapeCSVValue(value: unknown): string {
    // Handle null/undefined as empty string
    if (value === null || value === undefined) {
        return '';
    }

    // Convert to string
    const str = String(value);

    // Check if escaping is needed
    const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');

    if (needsQuotes) {
        // Double any existing quotes and wrap in quotes
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/**
 * Converts an array of row objects to CSV format.
 *
 * @param rows - Array of objects where each object represents a row
 * @returns CSV string with headers and data rows
 *
 * @example
 * ```ts
 * const rows = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 }
 * ];
 * const csv = convertToCSV(rows);
 * // Returns:
 * // name,age
 * // Alice,30
 * // Bob,25
 * ```
 */
export function convertToCSV(rows: Array<Record<string, unknown>>): string {
    // Handle empty array
    if (rows.length === 0) {
        return '';
    }

    // Get column names from first row
    const columns = Object.keys(rows[0]);

    // Handle empty columns
    if (columns.length === 0) {
        return '';
    }

    // Build header row
    const headerRow = columns.map(escapeCSVValue).join(',');

    // Build data rows
    const dataRows = rows.map((row) => {
        return columns.map((col) => escapeCSVValue(row[col])).join(',');
    });

    // Combine header and data rows
    return [headerRow, ...dataRows].join('\n');
}

/**
 * Converts rows to CSV and triggers a file download.
 *
 * @param rows - Array of objects to convert
 * @param filename - Name for the downloaded file (should end in .csv)
 */
export function downloadCSV(rows: Array<Record<string, unknown>>, filename: string): void {
    const csv = convertToCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Converts rows to CSV with a custom column order.
 *
 * @param rows - Array of objects to convert
 * @param columnOrder - Array of column names in desired order
 * @returns CSV string with specified column order
 */
export function convertToCSVWithOrder(
    rows: Array<Record<string, unknown>>,
    columnOrder: string[],
): string {
    // Handle empty array
    if (rows.length === 0 || columnOrder.length === 0) {
        return '';
    }

    // Build header row with specified order
    const headerRow = columnOrder.map(escapeCSVValue).join(',');

    // Build data rows with specified column order
    const dataRows = rows.map((row) => {
        return columnOrder.map((col) => escapeCSVValue(row[col])).join(',');
    });

    // Combine header and data rows
    return [headerRow, ...dataRows].join('\n');
}
