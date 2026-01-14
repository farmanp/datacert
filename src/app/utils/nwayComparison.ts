/**
 * N-way Comparison Utilities
 *
 * Provides functions to compute deltas and trend analysis for comparing
 * multiple files against a baseline in batch processing mode.
 */

import { ProfileResult, ColumnProfile } from '../stores/profileStore';

/**
 * Metric values extracted from a column profile
 */
export interface MetricValues {
  rowCount: number;
  nullRate: number;
  distinctCount: number;
  mean?: number;
  stdDev?: number;
}

/**
 * Change details for a specific metric
 */
export interface MetricChange {
  delta: number;
  pctChange: number | null;
}

/**
 * Delta information for a single column between baseline and comparison file
 */
export interface ColumnDelta {
  column: string;
  baseline: MetricValues;
  current: MetricValues;
  changes: {
    rowCount: MetricChange;
    nullRate: MetricChange;
    distinctCount: MetricChange;
    mean?: MetricChange;
    stdDev?: MetricChange;
  };
  typeChanged: boolean;
  baselineType: string;
  currentType: string;
}

/**
 * Comparison delta for a single file against the baseline
 */
export interface ComparisonDelta {
  fileId: string;
  fileName: string;
  deltas: ColumnDelta[];
  addedColumns: string[];
  removedColumns: string[];
  totalRowsBaseline: number;
  totalRowsCurrent: number;
}

/**
 * Trend direction for a metric across multiple files
 */
export type TrendDirection = 'improving' | 'degrading' | 'stable' | 'volatile';

/**
 * Value point in a trend analysis
 */
export interface TrendValue {
  fileId: string;
  fileName: string;
  value: number;
  delta: number;
}

/**
 * Trend analysis for a column metric across all comparison files
 */
export interface TrendAnalysis {
  column: string;
  metric: 'mean' | 'nullRate' | 'distinctCount';
  direction: TrendDirection;
  values: TrendValue[];
  baselineValue: number;
}

/**
 * Threshold constants for determining trend direction
 */
const STABLE_THRESHOLD = 0.01; // 1% change is considered stable
const VOLATILITY_THRESHOLD = 0.5; // 50% of values changing direction indicates volatility

/**
 * Extract metric values from a column profile
 */
function extractMetrics(profile: ColumnProfile, _totalRows: number): MetricValues {
  const nullRate =
    profile.base_stats.count > 0 ? profile.base_stats.missing / profile.base_stats.count : 0;

  return {
    rowCount: profile.base_stats.count,
    nullRate,
    distinctCount: profile.base_stats.distinct_estimate,
    mean: profile.numeric_stats?.mean,
    stdDev: profile.numeric_stats?.std_dev,
  };
}

/**
 * Calculate the change between two numeric values
 */
function calculateChange(baseline: number, current: number): MetricChange {
  const delta = current - baseline;
  const pctChange = baseline !== 0 ? (delta / Math.abs(baseline)) * 100 : null;

  return { delta, pctChange };
}

/**
 * Calculate the change between two optional numeric values
 */
function calculateOptionalChange(
  baseline: number | undefined,
  current: number | undefined
): MetricChange | undefined {
  if (baseline === undefined || current === undefined) {
    return undefined;
  }
  return calculateChange(baseline, current);
}

/**
 * Compute deltas between a baseline profile result and a comparison profile result
 */
export function computeDeltas(
  baseline: ProfileResult,
  comparison: ProfileResult,
  comparisonFileId: string,
  comparisonFileName: string
): ComparisonDelta {
  const baselineProfiles = new Map<string, ColumnProfile>();
  const comparisonProfiles = new Map<string, ColumnProfile>();

  for (const profile of baseline.column_profiles) {
    baselineProfiles.set(profile.name, profile);
  }

  for (const profile of comparison.column_profiles) {
    comparisonProfiles.set(profile.name, profile);
  }

  const allColumns = new Set([...baselineProfiles.keys(), ...comparisonProfiles.keys()]);
  const deltas: ColumnDelta[] = [];
  const addedColumns: string[] = [];
  const removedColumns: string[] = [];

  for (const columnName of allColumns) {
    const baselineProfile = baselineProfiles.get(columnName);
    const comparisonProfile = comparisonProfiles.get(columnName);

    if (!baselineProfile && comparisonProfile) {
      addedColumns.push(columnName);
      continue;
    }

    if (baselineProfile && !comparisonProfile) {
      removedColumns.push(columnName);
      continue;
    }

    if (baselineProfile && comparisonProfile) {
      const baselineMetrics = extractMetrics(baselineProfile, baseline.total_rows);
      const currentMetrics = extractMetrics(comparisonProfile, comparison.total_rows);

      const columnDelta: ColumnDelta = {
        column: columnName,
        baseline: baselineMetrics,
        current: currentMetrics,
        changes: {
          rowCount: calculateChange(baselineMetrics.rowCount, currentMetrics.rowCount),
          nullRate: calculateChange(baselineMetrics.nullRate, currentMetrics.nullRate),
          distinctCount: calculateChange(baselineMetrics.distinctCount, currentMetrics.distinctCount),
          mean: calculateOptionalChange(baselineMetrics.mean, currentMetrics.mean),
          stdDev: calculateOptionalChange(baselineMetrics.stdDev, currentMetrics.stdDev),
        },
        typeChanged:
          baselineProfile.base_stats.inferred_type !== comparisonProfile.base_stats.inferred_type,
        baselineType: baselineProfile.base_stats.inferred_type,
        currentType: comparisonProfile.base_stats.inferred_type,
      };

      deltas.push(columnDelta);
    }
  }

  return {
    fileId: comparisonFileId,
    fileName: comparisonFileName,
    deltas,
    addedColumns,
    removedColumns,
    totalRowsBaseline: baseline.total_rows,
    totalRowsCurrent: comparison.total_rows,
  };
}

/**
 * Determine the trend direction based on a series of delta values
 */
function determineTrendDirection(
  baselineValue: number,
  values: TrendValue[],
  lowerIsBetter: boolean = false
): TrendDirection {
  if (values.length === 0) {
    return 'stable';
  }

  // Calculate relative changes
  const relativeChanges = values.map((v) => {
    if (baselineValue === 0) return v.delta;
    return v.delta / Math.abs(baselineValue);
  });

  // Check if all changes are within stable threshold
  const allStable = relativeChanges.every((change) => Math.abs(change) < STABLE_THRESHOLD);
  if (allStable) {
    return 'stable';
  }

  // Count positive and negative changes
  const positiveCount = relativeChanges.filter((c) => c > STABLE_THRESHOLD).length;
  const negativeCount = relativeChanges.filter((c) => c < -STABLE_THRESHOLD).length;
  const significantCount = positiveCount + negativeCount;

  // Check for volatility (mixed directions)
  if (significantCount > 0) {
    const minRatio = Math.min(positiveCount, negativeCount) / significantCount;
    if (minRatio > VOLATILITY_THRESHOLD) {
      return 'volatile';
    }
  }

  // Determine overall trend direction
  const avgChange = relativeChanges.reduce((sum, c) => sum + c, 0) / relativeChanges.length;

  if (Math.abs(avgChange) < STABLE_THRESHOLD) {
    return 'stable';
  }

  // For null rate, lower is better (improvement)
  // For other metrics, we use the lowerIsBetter parameter
  if (lowerIsBetter) {
    return avgChange < 0 ? 'improving' : 'degrading';
  } else {
    return avgChange > 0 ? 'improving' : 'degrading';
  }
}

/**
 * Compute trend analysis for all columns across multiple comparison files
 */
export function computeTrends(
  baseline: ProfileResult,
  comparisons: ComparisonDelta[]
): TrendAnalysis[] {
  const trends: TrendAnalysis[] = [];
  const baselineProfiles = new Map<string, ColumnProfile>();

  for (const profile of baseline.column_profiles) {
    baselineProfiles.set(profile.name, profile);
  }

  // Collect all columns that exist in baseline
  for (const [columnName, baselineProfile] of baselineProfiles) {
    const baselineMetrics = extractMetrics(baselineProfile, baseline.total_rows);
    const hasNumericStats = baselineProfile.numeric_stats !== null;

    // Analyze null rate trend
    const nullRateValues: TrendValue[] = [];
    for (const comp of comparisons) {
      const delta = comp.deltas.find((d) => d.column === columnName);
      if (delta) {
        nullRateValues.push({
          fileId: comp.fileId,
          fileName: comp.fileName,
          value: delta.current.nullRate,
          delta: delta.changes.nullRate.delta,
        });
      }
    }

    if (nullRateValues.length > 0) {
      trends.push({
        column: columnName,
        metric: 'nullRate',
        direction: determineTrendDirection(baselineMetrics.nullRate, nullRateValues, true),
        values: nullRateValues,
        baselineValue: baselineMetrics.nullRate,
      });
    }

    // Analyze distinct count trend
    const distinctValues: TrendValue[] = [];
    for (const comp of comparisons) {
      const delta = comp.deltas.find((d) => d.column === columnName);
      if (delta) {
        distinctValues.push({
          fileId: comp.fileId,
          fileName: comp.fileName,
          value: delta.current.distinctCount,
          delta: delta.changes.distinctCount.delta,
        });
      }
    }

    if (distinctValues.length > 0) {
      trends.push({
        column: columnName,
        metric: 'distinctCount',
        direction: determineTrendDirection(baselineMetrics.distinctCount, distinctValues, false),
        values: distinctValues,
        baselineValue: baselineMetrics.distinctCount,
      });
    }

    // Analyze mean trend (only for numeric columns)
    if (hasNumericStats && baselineMetrics.mean !== undefined) {
      const meanValues: TrendValue[] = [];
      for (const comp of comparisons) {
        const delta = comp.deltas.find((d) => d.column === columnName);
        if (delta && delta.changes.mean) {
          meanValues.push({
            fileId: comp.fileId,
            fileName: comp.fileName,
            value: delta.current.mean!,
            delta: delta.changes.mean.delta,
          });
        }
      }

      if (meanValues.length > 0) {
        trends.push({
          column: columnName,
          metric: 'mean',
          direction: determineTrendDirection(baselineMetrics.mean, meanValues, false),
          values: meanValues,
          baselineValue: baselineMetrics.mean,
        });
      }
    }
  }

  return trends;
}

/**
 * Get a summary of significant changes across all comparisons
 */
export interface ComparisonSummary {
  totalFilesCompared: number;
  totalColumnsTracked: number;
  significantChanges: number;
  addedColumns: number;
  removedColumns: number;
  typeChanges: number;
}

/**
 * Calculate a summary of all comparison deltas
 */
export function getComparisonSummary(comparisons: ComparisonDelta[]): ComparisonSummary {
  const allColumns = new Set<string>();
  let significantChanges = 0;
  let totalAddedColumns = 0;
  let totalRemovedColumns = 0;
  let typeChanges = 0;

  for (const comp of comparisons) {
    totalAddedColumns += comp.addedColumns.length;
    totalRemovedColumns += comp.removedColumns.length;

    for (const delta of comp.deltas) {
      allColumns.add(delta.column);

      if (delta.typeChanged) {
        typeChanges++;
      }

      // Count significant changes (>5% change in any key metric)
      const isSignificant =
        Math.abs(delta.changes.nullRate.pctChange ?? 0) > 5 ||
        Math.abs(delta.changes.distinctCount.pctChange ?? 0) > 5 ||
        Math.abs(delta.changes.mean?.pctChange ?? 0) > 5;

      if (isSignificant) {
        significantChanges++;
      }
    }
  }

  return {
    totalFilesCompared: comparisons.length,
    totalColumnsTracked: allColumns.size,
    significantChanges,
    addedColumns: totalAddedColumns,
    removedColumns: totalRemovedColumns,
    typeChanges,
  };
}

/**
 * Sort comparisons by amount of change (most changed first)
 */
export function sortByMostChanged(deltas: ColumnDelta[]): ColumnDelta[] {
  return [...deltas].sort((a, b) => {
    const scoreA = calculateChangeScore(a);
    const scoreB = calculateChangeScore(b);
    return scoreB - scoreA;
  });
}

/**
 * Calculate a change score for a column delta (higher = more change)
 */
function calculateChangeScore(delta: ColumnDelta): number {
  let score = 0;

  // Type change is significant
  if (delta.typeChanged) {
    score += 100;
  }

  // Add absolute percentage changes
  score += Math.abs(delta.changes.nullRate.pctChange ?? 0);
  score += Math.abs(delta.changes.distinctCount.pctChange ?? 0);
  score += Math.abs(delta.changes.mean?.pctChange ?? 0);
  score += Math.abs(delta.changes.stdDev?.pctChange ?? 0);

  return score;
}
