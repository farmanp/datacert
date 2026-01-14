---
id: batch-processing
title: 10. Batch Processing
sidebar_label: 10. Batch Processing
---

# 10. Batch Processing

Date: 2026-01-13

## Status

Accepted

## Context

Data practitioners frequently work with multiple related files that need to be analyzed together:

*   **Multi-file Datasets:** Large datasets split across multiple files (e.g., daily exports, partitioned data).
*   **Schema Evolution:** Tracking how data schemas and quality change over time across multiple snapshots.
*   **Data Consolidation:** Aggregating statistics from multiple sources into a unified view.
*   **Trend Analysis:** Comparing metrics across multiple files to identify patterns and anomalies.

The existing single-file profiling and dual-file comparison modes do not address these multi-file scenarios efficiently. Users would need to profile files one by one and manually aggregate or compare results.

## Decision

We will implement a **batch processing system with three distinct modes**, each addressing a specific multi-file use case:

### 1. Architecture Overview

```
User drops multiple files
         ↓
    BatchStore coordinates
         ↓
    Mode Selection (Sequential | Merge | Comparison)
         ↓
┌─────────────────────────────────────────────────────────┐
│                    Processing Pipeline                   │
├─────────────────┬─────────────────┬─────────────────────┤
│  Sequential     │  Merge          │  N-way Comparison   │
│  - Profile each │  - Profile all  │  - Profile all      │
│  - Tab results  │  - Validate     │  - Set baseline     │
│                 │    schemas      │  - Compute deltas   │
│                 │  - Aggregate    │  - Analyze trends   │
│                 │    statistics   │                     │
└─────────────────┴─────────────────┴─────────────────────┘
         ↓
    Results View (per mode)
```

### 2. Batch Store State Management

```typescript
interface BatchStoreState {
  mode: 'sequential' | 'merge' | 'comparison' | null;
  files: BatchFileEntry[];
  currentIndex: number;
  isProcessing: boolean;
  isCancelled: boolean;
  activeTabId: string | null;

  // Merge mode
  schemaValidation: BatchSchemaValidation | null;
  showSchemaDialog: boolean;
  mergedStats: MergedStats | null;

  // Comparison mode
  comparisonDeltas: ComparisonDelta[];
  trendAnalysis: TrendAnalysis[];
}

interface BatchFileEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  results: ProfileResult | null;
  isBaseline?: boolean;  // For comparison mode
}
```

### 3. Sequential Mode

Profile multiple files independently, displaying results in a tabbed interface:

*   **Worker Reuse:** Single worker instance is reused between files (terminated and recreated for clean state).
*   **Memory Efficient:** Only one file is processed at a time, avoiding memory spikes from parallel processing.
*   **Progress Tracking:** Per-file progress bars with overall batch progress indicator.
*   **Fault Tolerant:** Failed files can be retried individually without restarting the entire batch.

### 4. Merge Mode

Combine multiple files with compatible schemas into aggregated statistics:

```typescript
interface MergedStats {
  totalRows: number;
  fileCount: number;
  fileNames: string[];
  columns: MergedColumnStats[];
  healthScore: number;
}

interface MergedColumnStats {
  name: string;
  inferredType: string;
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  topValues?: Array<{ value: string; count: number; percentage: number }>;
  contributingFiles: string[];
}
```

**Schema Validation:**
*   Extract schema signature from first file (baseline).
*   Compare subsequent files against baseline.
*   Surface added/removed columns and type changes.
*   Allow user to proceed despite mismatches (flexible merge).

**Statistics Aggregation:**
*   **Count:** Sum of all row counts.
*   **Mean:** Weighted average: `Σ(mean_i × count_i) / Σ(count_i)`.
*   **Standard Deviation:** Pooled variance formula for combining populations.
*   **Min/Max:** Overall minimum/maximum across all files.
*   **Distinct Count:** Estimated sum (capped at total rows, acknowledges undercount).
*   **Top Values:** Merged frequency counts, re-ranked by total occurrences.

### 5. N-way Comparison Mode

Compare multiple files against a designated baseline:

```typescript
interface ComparisonDelta {
  fileId: string;
  fileName: string;
  totalRows: number;
  columns: ColumnDelta[];
  addedColumns: string[];
  removedColumns: string[];
  typeChanges: Array<{ column: string; fromType: string; toType: string }>;
}

interface ColumnDelta {
  column: string;
  baselineType: string;
  comparisonType: string;
  metrics: {
    nullRate: MetricChange;
    distinctCount: MetricChange;
    mean?: MetricChange;
    stdDev?: MetricChange;
    min?: MetricChange;
    max?: MetricChange;
  };
}

interface TrendAnalysis {
  column: string;
  metric: 'nullRate' | 'mean' | 'distinctCount';
  direction: 'improving' | 'degrading' | 'stable' | 'volatile';
  values: TrendValue[];
  volatility: number;
}
```

**Trend Detection:**
*   Track metric changes across all comparison files.
*   Classify trends as improving (moving toward better quality), degrading (moving toward worse quality), stable (minimal change), or volatile (inconsistent changes).
*   Visualize trends with directional indicators.

## Consequences

### Positive

*   **Scalable Analysis:** Users can analyze dozens of files in a single session without manual coordination.
*   **Memory Efficient:** Sequential worker reuse prevents memory bloat from parallel processing.
*   **Flexible Schema Handling:** Merge mode gracefully handles schema variations rather than failing on mismatches.
*   **Actionable Insights:** Trend analysis surfaces patterns that would be invisible when viewing files individually.
*   **Reuses Existing Infrastructure:** Builds on the profiler worker (ADR 0005) and comparison engine (ADR 0009).

### Negative

*   **Sequential Bottleneck:** Processing files one at a time is slower than potential parallel processing.
*   **Approximate Statistics:** Merged statistics (especially distinct counts and pooled variance) are approximations.
*   **Memory Growth:** Large batches accumulate ProfileResults in memory, which could be problematic for very large batches.
*   **UI Complexity:** Three distinct modes require different result views and user education.

### Neutral

*   **No True Parallel Processing:** Unlike dual-file comparison, batch processing uses sequential workers for simplicity and memory efficiency.
*   **Baseline-Centric Comparison:** N-way comparison requires designating one file as the baseline, which affects interpretation of deltas.
*   **Schema Flexibility Trade-off:** Allowing schema mismatches in merge mode enables flexibility but produces partial column data.

## Related ADRs

*   [0004-streaming-processing.md](0004-streaming-processing.md) - Streaming chunk processing
*   [0005-web-worker-offloading.md](0005-web-worker-offloading.md) - Worker architecture
*   [0009-comparison-mode.md](0009-comparison-mode.md) - Dual-file comparison
