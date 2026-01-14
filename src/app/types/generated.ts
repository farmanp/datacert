/**
 * Auto-generated types from Rust via ts-rs
 *
 * These types are generated from the Rust structs in src/wasm/src/ using ts-rs.
 * Do not edit directly - instead modify the Rust structs and regenerate.
 *
 * Re-run: cd src/wasm && cargo test
 *
 * NOTE: The raw generated types use `bigint` for u64/usize fields. This file
 * provides adapted types that use `number` for backwards compatibility with
 * existing code. The WASM serialization layer converts BigInt to number.
 */

// Re-export raw generated types with Raw prefix for direct access
export type { BaseStats as RawBaseStats } from '../../wasm/bindings/BaseStats';
export type { CategoricalStats as RawCategoricalStats } from '../../wasm/bindings/CategoricalStats';
export type { ColumnProfile as RawColumnProfile } from '../../wasm/bindings/ColumnProfile';
export type { FreqEntry as RawFreqEntry } from '../../wasm/bindings/FreqEntry';
export type { Histogram as RawHistogram } from '../../wasm/bindings/Histogram';
export type { HistogramBin as RawHistogramBin } from '../../wasm/bindings/HistogramBin';
export type { NumericStats as RawNumericStats } from '../../wasm/bindings/NumericStats';
export type { ProfilerResult as RawProfilerResult } from '../../wasm/bindings/ProfilerResult';
export type { DataType as RawDataType } from '../../wasm/bindings/DataType';

// Re-export types that don't have bigint fields and don't need adaptation
export type { ColumnQualityMetrics } from '../../wasm/bindings/ColumnQualityMetrics';
export type { CorrelationMatrix } from '../../wasm/bindings/CorrelationMatrix';
export type { QualityIssue } from '../../wasm/bindings/QualityIssue';
export type { Severity } from '../../wasm/bindings/Severity';

// Import types needed for adapted interfaces
import type { ColumnQualityMetrics } from '../../wasm/bindings/ColumnQualityMetrics';
import type { QualityIssue } from '../../wasm/bindings/QualityIssue';

/**
 * Extended DataType that includes additional variants used in the codebase.
 * The WASM layer returns the raw DataType, but some code paths use extended variants.
 */
export type DataType =
  | 'Integer'
  | 'Numeric'
  | 'String'
  | 'Boolean'
  | 'Date'
  | 'Null'
  // Additional variants used in the existing codebase
  | 'Mixed' // Used when column has multiple data types
  | 'Empty' // Used when column has no non-null values
  // Lowercase variants for compatibility (some code uses these)
  | 'string'
  | 'integer'
  | 'numeric'
  | 'boolean'
  | 'date';

/**
 * Adapted types with `number` instead of `bigint` for backwards compatibility.
 * The WASM serialization layer (serde-wasm-bindgen) converts these to JS numbers.
 */

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface Histogram {
  bins: Array<HistogramBin>;
  min: number;
  max: number;
  bin_width: number;
}

export interface FreqEntry {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoricalStats {
  top_values: Array<FreqEntry>;
  unique_count: number;
}

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  sum: number;
  count: number;
  std_dev: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  median: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface BaseStats {
  count: number;
  missing: number;
  distinct_estimate: number;
  inferred_type: DataType;
}

export interface ColumnProfile {
  name: string;
  base_stats: BaseStats;
  numeric_stats: NumericStats | null;
  categorical_stats: CategoricalStats | null;
  histogram: Histogram | null;
  min_length: number | null;
  max_length: number | null;
  notes: Array<string>;
  quality_metrics: ColumnQualityMetrics | null;
  integer_count: number;
  numeric_count: number;
  boolean_count: number;
  date_count: number;
  total_valid: number;
  sample_values: Array<string>;
  missing_rows: Array<number>;
  pii_rows: Array<number>;
  outlier_rows: Array<number>;
}

export interface ProfilerResult {
  column_profiles: Array<ColumnProfile>;
  total_rows: number;
  duplicate_issues: Array<QualityIssue>;
  avro_schema: string | null;
}

// Type aliases for backwards compatibility
export type ProfileResult = ProfilerResult;
export type CorrelationMatrixResult = {
  columns: Array<string>;
  matrix: Array<Array<number>>;
};
