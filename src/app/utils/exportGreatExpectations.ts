import { ProfileResult, ColumnProfile } from '../stores/profileStore';

/**
 * Great Expectations Suite JSON structure (GX 1.x format)
 */
export interface GXExpectation {
  expectation_type: string;
  kwargs: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface GXSuite {
  expectation_suite_name: string;
  meta: {
    generated_by: string;
    generated_at: string;
    source_file: string;
    tolerance: number;
    datalens_version: string;
  };
  expectations: GXExpectation[];
  ge_cloud_id?: null;
}

/**
 * Options for generating the GX Suite
 */
export interface GXExportOptions {
  /** Name for the expectation suite (default: datalens_generated_suite) */
  suiteName?: string;
  /** Tolerance for numeric bounds (0-1, default: 0.1 = 10%) */
  tolerance?: number;
  /** Include type expectations (default: true) */
  includeTypeExpectations?: boolean;
  /** Include null expectations (default: true) */
  includeNullExpectations?: boolean;
  /** Include numeric range expectations (default: true) */
  includeRangeExpectations?: boolean;
  /** Include uniqueness expectations for columns with 100% unique values (default: true) */
  includeUniquenessExpectations?: boolean;
  /** Minimum completeness threshold to include null expectation (0-1, default: 0.5) */
  minCompletenessForNullExpectation?: number;
}

const DEFAULT_OPTIONS: Required<GXExportOptions> = {
  suiteName: 'datalens_generated_suite',
  tolerance: 0.1,
  includeTypeExpectations: true,
  includeNullExpectations: true,
  includeRangeExpectations: true,
  includeUniquenessExpectations: true,
  minCompletenessForNullExpectation: 0.5,
};

/**
 * Maps DataLens inferred types to Great Expectations type strings
 */
function mapTypeToGX(dataLensType: string): string | null {
  const typeMap: Record<string, string> = {
    'Integer': 'INTEGER',
    'Numeric': 'FLOAT',
    'String': 'STRING',
    'Boolean': 'BOOLEAN',
    'Date': 'DATE',
    'DateTime': 'DATETIME',
  };
  return typeMap[dataLensType] ?? null;
}

/**
 * Applies tolerance to a numeric value
 */
function applyTolerance(value: number, tolerance: number, direction: 'lower' | 'upper'): number {
  const adjustment = Math.abs(value) * tolerance;
  if (direction === 'lower') {
    return value - adjustment;
  }
  return value + adjustment;
}

/**
 * Round to reasonable precision for expectations
 */
function roundValue(value: number, decimals: number = 6): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Generates expectations for a single column
 */
function generateColumnExpectations(
  column: ColumnProfile,
  _totalRows: number,
  options: Required<GXExportOptions>
): GXExpectation[] {
  const expectations: GXExpectation[] = [];
  const { base_stats, numeric_stats, categorical_stats } = column;
  const columnName = column.name;

  // Skip empty columns entirely
  if (base_stats.inferred_type === 'Empty' || base_stats.inferred_type === 'Null') {
    return expectations;
  }

  // 1. Column existence expectation
  expectations.push({
    expectation_type: 'expect_column_to_exist',
    kwargs: {
      column: columnName,
    },
  });

  // 2. Type expectation
  if (options.includeTypeExpectations && base_stats.inferred_type !== 'Mixed') {
    const gxType = mapTypeToGX(base_stats.inferred_type);
    if (gxType) {
      expectations.push({
        expectation_type: 'expect_column_values_to_be_of_type',
        kwargs: {
          column: columnName,
          type_: gxType,
        },
      });
    }
  }

  // 3. Null expectation (using mostly parameter)
  if (options.includeNullExpectations) {
    const completeness = base_stats.count > 0
      ? (base_stats.count - base_stats.missing) / base_stats.count
      : 0;

    // Only add null expectation if data has reasonable completeness
    if (completeness >= options.minCompletenessForNullExpectation) {
      // Apply tolerance: if data has 5% nulls and tolerance is 10%, allow up to 15% nulls
      // mostly = 1 - (null_rate + null_rate * tolerance)
      const nullRate = base_stats.missing / base_stats.count;
      const allowedNullRate = nullRate + (nullRate * options.tolerance);
      const mostly = Math.max(0, roundValue(1 - allowedNullRate, 4));

      expectations.push({
        expectation_type: 'expect_column_values_to_not_be_null',
        kwargs: {
          column: columnName,
          mostly: mostly,
        },
      });
    }
  }

  // 4. Numeric range expectations
  if (options.includeRangeExpectations && numeric_stats) {
    const minValue = roundValue(
      applyTolerance(numeric_stats.min, options.tolerance, 'lower')
    );
    const maxValue = roundValue(
      applyTolerance(numeric_stats.max, options.tolerance, 'upper')
    );

    expectations.push({
      expectation_type: 'expect_column_values_to_be_between',
      kwargs: {
        column: columnName,
        min_value: minValue,
        max_value: maxValue,
        mostly: 1.0,
      },
    });

    // Add mean expectation if we have sufficient data
    if (base_stats.count >= 10 && numeric_stats.mean !== null) {
      const meanLower = roundValue(
        applyTolerance(numeric_stats.mean, options.tolerance, 'lower')
      );
      const meanUpper = roundValue(
        applyTolerance(numeric_stats.mean, options.tolerance, 'upper')
      );

      expectations.push({
        expectation_type: 'expect_column_mean_to_be_between',
        kwargs: {
          column: columnName,
          min_value: meanLower,
          max_value: meanUpper,
        },
      });
    }
  }

  // 5. Uniqueness expectation
  if (options.includeUniquenessExpectations) {
    const validCount = base_stats.count - base_stats.missing;
    // Check if column is 100% unique (or very close, within 0.1%)
    if (validCount > 0 && base_stats.distinct_estimate >= validCount * 0.999) {
      expectations.push({
        expectation_type: 'expect_column_values_to_be_unique',
        kwargs: {
          column: columnName,
        },
      });
    }
  }

  // 6. Boolean value set expectation
  if (base_stats.inferred_type === 'Boolean') {
    expectations.push({
      expectation_type: 'expect_column_values_to_be_in_set',
      kwargs: {
        column: columnName,
        value_set: [true, false, 'true', 'false', 'True', 'False', '1', '0', 1, 0],
      },
    });
  }

  // 7. Top values expectation for categorical columns with limited cardinality
  if (categorical_stats && base_stats.inferred_type === 'String') {
    const validCount = base_stats.count - base_stats.missing;
    // Only add value set expectation for low-cardinality columns
    if (categorical_stats.unique_count <= 20 && validCount > 0) {
      const valueSet = categorical_stats.top_values.map(tv => tv.value);
      expectations.push({
        expectation_type: 'expect_column_distinct_values_to_be_in_set',
        kwargs: {
          column: columnName,
          value_set: valueSet,
        },
      });
    }
  }

  return expectations;
}

/**
 * Generates a Great Expectations Suite JSON from a DataLens ProfileResult.
 *
 * @param results - The ProfileResult from DataLens profiling
 * @param filename - Source file name for metadata
 * @param options - Export configuration options
 * @returns GXSuite object ready for JSON serialization
 */
export function generateGXSuite(
  results: ProfileResult,
  filename: string,
  options: GXExportOptions = {}
): GXSuite {
  const opts: Required<GXExportOptions> = { ...DEFAULT_OPTIONS, ...options };

  const expectations: GXExpectation[] = [];

  // Generate expectations for each column
  for (const column of results.column_profiles) {
    const columnExpectations = generateColumnExpectations(column, results.total_rows, opts);
    expectations.push(...columnExpectations);
  }

  // Add table-level expectations
  if (results.total_rows > 0) {
    // Row count expectation with tolerance
    const minRows = Math.floor(results.total_rows * (1 - opts.tolerance));
    const maxRows = Math.ceil(results.total_rows * (1 + opts.tolerance));

    expectations.push({
      expectation_type: 'expect_table_row_count_to_be_between',
      kwargs: {
        min_value: minRows,
        max_value: maxRows,
      },
    });
  }

  // Column count expectation
  expectations.push({
    expectation_type: 'expect_table_column_count_to_equal',
    kwargs: {
      value: results.column_profiles.length,
    },
  });

  return {
    expectation_suite_name: opts.suiteName,
    meta: {
      generated_by: 'DataLens Profiler',
      generated_at: new Date().toISOString(),
      source_file: filename,
      tolerance: opts.tolerance,
      datalens_version: '0.1.0',
    },
    expectations,
    ge_cloud_id: null,
  };
}

/**
 * Generates a Great Expectations Suite JSON string.
 *
 * @param results - The ProfileResult from DataLens profiling
 * @param filename - Source file name for metadata
 * @param options - Export configuration options
 * @returns JSON string formatted for Great Expectations
 */
export function generateGXSuiteJSON(
  results: ProfileResult,
  filename: string,
  options: GXExportOptions = {}
): string {
  const suite = generateGXSuite(results, filename, options);
  return JSON.stringify(suite, null, 2);
}

/**
 * Returns a descriptive summary of what expectations will be generated.
 * Useful for showing users a preview before export.
 */
export function getExpectationSummary(
  results: ProfileResult,
  options: GXExportOptions = {}
): {
  totalExpectations: number;
  byType: Record<string, number>;
  columnsIncluded: number;
  columnsSkipped: string[];
} {
  const opts: Required<GXExportOptions> = { ...DEFAULT_OPTIONS, ...options };
  const byType: Record<string, number> = {};
  const columnsSkipped: string[] = [];
  let columnsIncluded = 0;

  for (const column of results.column_profiles) {
    if (column.base_stats.inferred_type === 'Empty' || column.base_stats.inferred_type === 'Null') {
      columnsSkipped.push(column.name);
      continue;
    }

    columnsIncluded++;
    const expectations = generateColumnExpectations(column, results.total_rows, opts);

    for (const exp of expectations) {
      byType[exp.expectation_type] = (byType[exp.expectation_type] || 0) + 1;
    }
  }

  // Add table-level expectations to count
  if (results.total_rows > 0) {
    byType['expect_table_row_count_to_be_between'] = 1;
  }
  byType['expect_table_column_count_to_equal'] = 1;

  const totalExpectations = Object.values(byType).reduce((sum, count) => sum + count, 0);

  return {
    totalExpectations,
    byType,
    columnsIncluded,
    columnsSkipped,
  };
}
