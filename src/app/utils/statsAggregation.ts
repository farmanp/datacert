import { ProfileResult, ColumnProfile, FreqEntry } from '../stores/profileStore';

/**
 * Represents merged column statistics across multiple files
 */
export interface MergedColumnStats {
  name: string;
  count: number;
  missing: number;
  distinctEstimate: number;
  inferredType: string;
  // Numeric stats (when applicable)
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  sum?: number;
  variance?: number;
  median?: number;
  // Categorical top values merged
  topValues?: { value: string; count: number }[];
}

/**
 * Represents the merged statistics from multiple files
 */
export interface MergedStats {
  totalRows: number;
  totalFiles: number;
  columnStats: MergedColumnStats[];
  fileNames: string[];
}

/**
 * Merges frequency entries from multiple profiles
 * Combines counts for the same values and re-ranks by total count
 */
function mergeTopValues(
  topValuesArray: (FreqEntry[] | null | undefined)[],
  topN: number = 10,
): { value: string; count: number }[] {
  const mergedCounts = new Map<string, number>();

  for (const topValues of topValuesArray) {
    if (!topValues) continue;
    for (const entry of topValues) {
      const currentCount = mergedCounts.get(entry.value) || 0;
      mergedCounts.set(entry.value, currentCount + entry.count);
    }
  }

  // Convert to array, sort by count descending, take top N
  return Array.from(mergedCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * Calculates pooled variance from multiple datasets
 * Uses the formula: pooled_var = (sum of (n_i * var_i) + sum of (n_i * (mean_i - pooled_mean)^2)) / total_n
 */
function calculatePooledVariance(
  datasets: { count: number; mean: number; variance: number }[],
): number {
  const totalCount = datasets.reduce((sum, d) => sum + d.count, 0);
  if (totalCount === 0) return 0;

  // Calculate pooled mean
  const pooledMean =
    datasets.reduce((sum, d) => sum + d.count * d.mean, 0) / totalCount;

  // Calculate pooled variance using parallel algorithm
  let pooledVar = 0;
  for (const d of datasets) {
    if (d.count === 0) continue;
    // Within-group variance contribution
    pooledVar += d.count * d.variance;
    // Between-group variance contribution
    const meanDiff = d.mean - pooledMean;
    pooledVar += d.count * meanDiff * meanDiff;
  }

  return pooledVar / totalCount;
}

/**
 * Merges column statistics across multiple column profiles
 */
function mergeColumnStats(columns: ColumnProfile[]): MergedColumnStats {
  if (columns.length === 0) {
    throw new Error('Cannot merge empty columns array');
  }

  const name = columns[0].name;

  // Aggregate base stats
  const totalCount = columns.reduce((sum, c) => sum + c.base_stats.count, 0);
  const totalMissing = columns.reduce((sum, c) => sum + c.base_stats.missing, 0);

  // Estimate distinct values (sum of distincts, capped at total rows)
  const distinctSum = columns.reduce((sum, c) => sum + c.base_stats.distinct_estimate, 0);
  const distinctEstimate = Math.min(distinctSum, totalCount);

  // Determine the most common inferred type
  const typeCounts = new Map<string, number>();
  for (const c of columns) {
    const type = c.base_stats.inferred_type;
    typeCounts.set(type, (typeCounts.get(type) || 0) + c.base_stats.count);
  }
  let inferredType = columns[0].base_stats.inferred_type;
  let maxTypeCount = 0;
  for (const [type, count] of typeCounts) {
    if (count > maxTypeCount) {
      maxTypeCount = count;
      inferredType = type;
    }
  }

  const result: MergedColumnStats = {
    name,
    count: totalCount,
    missing: totalMissing,
    distinctEstimate,
    inferredType,
  };

  // Merge numeric stats if available
  const numericColumns = columns.filter((c) => c.numeric_stats !== null);
  if (numericColumns.length > 0) {
    // Calculate weighted mean
    const totalNumericCount = numericColumns.reduce((sum, c) => sum + (c.numeric_stats?.count || 0), 0);

    if (totalNumericCount > 0) {
      // Weighted mean
      const weightedSum = numericColumns.reduce(
        (sum, c) => sum + (c.numeric_stats?.count || 0) * (c.numeric_stats?.mean || 0),
        0,
      );
      result.mean = weightedSum / totalNumericCount;

      // Overall sum
      result.sum = numericColumns.reduce((sum, c) => sum + (c.numeric_stats?.sum || 0), 0);

      // Min/Max across all
      result.min = Math.min(...numericColumns.map((c) => c.numeric_stats?.min ?? Infinity));
      result.max = Math.max(...numericColumns.map((c) => c.numeric_stats?.max ?? -Infinity));

      // Pooled variance and std dev
      const datasets = numericColumns
        .filter((c) => c.numeric_stats && c.numeric_stats.count > 0)
        .map((c) => ({
          count: c.numeric_stats!.count,
          mean: c.numeric_stats!.mean,
          variance: c.numeric_stats!.variance,
        }));

      if (datasets.length > 0) {
        result.variance = calculatePooledVariance(datasets);
        result.stdDev = Math.sqrt(result.variance);
      }

      // Median - use weighted average of medians as approximation
      // This is not mathematically precise but provides a reasonable estimate
      const medianSum = numericColumns.reduce(
        (sum, c) => sum + (c.numeric_stats?.count || 0) * (c.numeric_stats?.median || 0),
        0,
      );
      result.median = medianSum / totalNumericCount;
    }
  }

  // Merge categorical top values
  const categoricalColumns = columns.filter((c) => c.categorical_stats !== null);
  if (categoricalColumns.length > 0) {
    const topValuesArrays = categoricalColumns.map((c) => c.categorical_stats?.top_values);
    result.topValues = mergeTopValues(topValuesArrays);
  }

  return result;
}

/**
 * Merges multiple ProfileResults into unified statistics
 * Assumes schemas are compatible (same column names in same order)
 */
export function mergeProfiles(
  profiles: { fileName: string; profile: ProfileResult }[],
): MergedStats {
  if (profiles.length === 0) {
    throw new Error('Cannot merge empty profiles array');
  }

  const totalRows = profiles.reduce((sum, p) => sum + p.profile.total_rows, 0);
  const fileNames = profiles.map((p) => p.fileName);

  // Use first profile as template for column structure
  const baseProfile = profiles[0].profile;
  const columnCount = baseProfile.column_profiles.length;

  // Group columns by position across all profiles
  const mergedColumnStats: MergedColumnStats[] = [];

  for (let i = 0; i < columnCount; i++) {
    const columnsAtPosition: ColumnProfile[] = [];

    for (const p of profiles) {
      if (i < p.profile.column_profiles.length) {
        columnsAtPosition.push(p.profile.column_profiles[i]);
      }
    }

    if (columnsAtPosition.length > 0) {
      mergedColumnStats.push(mergeColumnStats(columnsAtPosition));
    }
  }

  return {
    totalRows,
    totalFiles: profiles.length,
    columnStats: mergedColumnStats,
    fileNames,
  };
}

/**
 * Merges profiles with flexible column matching (by name instead of position)
 * Handles cases where column order might differ across files
 */
export function mergeProfilesFlexible(
  profiles: { fileName: string; profile: ProfileResult }[],
): MergedStats {
  if (profiles.length === 0) {
    throw new Error('Cannot merge empty profiles array');
  }

  const totalRows = profiles.reduce((sum, p) => sum + p.profile.total_rows, 0);
  const fileNames = profiles.map((p) => p.fileName);

  // Collect all unique column names while preserving order from first file
  const baseColumnOrder = profiles[0].profile.column_profiles.map((c) => c.name);
  const allColumnNames = new Set<string>(baseColumnOrder);

  // Add any columns from other files that might be missing from the first
  for (const p of profiles) {
    for (const col of p.profile.column_profiles) {
      allColumnNames.add(col.name);
    }
  }

  // Build merged stats for each column
  const mergedColumnStats: MergedColumnStats[] = [];

  for (const colName of allColumnNames) {
    const columnsWithName: ColumnProfile[] = [];

    for (const p of profiles) {
      const col = p.profile.column_profiles.find((c) => c.name === colName);
      if (col) {
        columnsWithName.push(col);
      }
    }

    if (columnsWithName.length > 0) {
      mergedColumnStats.push(mergeColumnStats(columnsWithName));
    }
  }

  return {
    totalRows,
    totalFiles: profiles.length,
    columnStats: mergedColumnStats,
    fileNames,
  };
}
