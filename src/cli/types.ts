export interface CliOptions {
    output?: string;
    format: 'json' | 'html' | 'markdown' | 'csv';
    quiet?: boolean;
    failOnMissing?: number;
    failOnDuplicates?: boolean;
    tolerance: number;
}

export interface ProfileResult {
    column_count: number;
    row_count: number;
    columns: Record<string, any>;
    warnings: any[];
    // Add other expected fields from WASM finalize()
}
