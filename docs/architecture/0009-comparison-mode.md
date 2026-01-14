---
id: comparison-mode
title: 9. Comparison Mode
sidebar_label: 9. Comparison Mode
---

# 9. Comparison Mode

Date: 2026-01-13

## Status

Accepted

## Context

Data practitioners frequently need to compare datasets across different dimensions:

*   **Temporal Comparison:** How has a dataset changed between two snapshots (e.g., last month vs. this month)?
*   **Source Comparison:** How do datasets from different sources differ (e.g., production vs. staging, vendor A vs. vendor B)?
*   **Quality Validation:** Does a transformed dataset match expectations compared to the source?

Currently, users must profile files individually and manually compare the results, which is error-prone and time-consuming. DataLens Profiler needs a first-class comparison mode that surfaces differences clearly.

## Decision

We will implement a **dual-file architecture with parallel processing and intelligent diffing**:

### 1. Dual-File Architecture

The comparison mode accepts two files (or cloud sources) as inputs:

```
User drops File A ("baseline") and File B ("comparison")
         ↓
    ComparisonStore coordinates
         ↓
┌─────────────────┬─────────────────┐
│  Worker A       │  Worker B       │
│  (profiles A)   │  (profiles B)   │
└─────────────────┴─────────────────┘
         ↓                 ↓
    ProfileResult A   ProfileResult B
         ↓                 ↓
    ComparisonEngine (diff & delta)
         ↓
    ComparisonResult → ComparisonReport UI
```

*   **Independent Workers:** Each file is processed by its own Web Worker instance, enabling true parallel processing on multi-core devices.
*   **Unified Coordination:** A `ComparisonStore` manages the lifecycle of both workers and triggers the comparison engine when both complete.

### 2. Schema Diffing

The comparison engine first reconciles the schemas of both files:

| Diff Category | Description |
|---------------|-------------|
| `ADDED`       | Column exists in B but not in A |
| `REMOVED`     | Column exists in A but not in B |
| `MODIFIED`    | Column exists in both but data type changed |
| `UNCHANGED`   | Column exists in both with same data type |

Schema diff is presented first, as it informs interpretation of statistical differences.

### 3. Statistics Delta Calculation

For columns present in both files, we compute deltas across all profiled metrics:

```typescript
interface ColumnDelta {
  column: string;
  diffType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  metrics: {
    rowCount: { a: number; b: number; delta: number; percentChange: number };
    nullCount: { a: number; b: number; delta: number; percentChange: number };
    distinctCount: { a: number; b: number; delta: number; percentChange: number };
    // Numeric columns
    mean?: { a: number; b: number; delta: number; percentChange: number };
    stdDev?: { a: number; b: number; delta: number; percentChange: number };
    min?: { a: number; b: number; delta: number };
    max?: { a: number; b: number; delta: number };
    // Distribution comparison
    histogramOverlap?: number;  // 0-1 score of distribution similarity
  };
}
```

*   **Absolute Delta:** `B - A` for understanding magnitude of change.
*   **Percent Change:** `((B - A) / A) * 100` for understanding relative change.
*   **Distribution Overlap:** Histogram comparison using intersection-over-union for detecting distribution shifts.

### 4. Comparison Report UI

The `ComparisonReport` component displays:

*   **Summary Card:** High-level overview (row count change, columns added/removed, data quality delta).
*   **Schema Diff Table:** Visual representation of column changes with color coding.
*   **Side-by-Side Column Cards:** For unchanged columns, show A and B statistics with delta highlights.
*   **Distribution Overlays:** Histograms rendered with both distributions overlaid for visual comparison.

## Consequences

### Positive

*   **Parallel Processing:** Dual-worker architecture maximizes CPU utilization on modern multi-core devices, processing both files simultaneously.
*   **Flexible Comparison:** Users can compare any two files regardless of origin (local, GCS, different formats).
*   **Actionable Insights:** Schema diffing and delta calculations surface meaningful differences rather than requiring manual inspection.
*   **Consistent Architecture:** Builds on existing worker and streaming infrastructure (ADR 0004, 0005) rather than introducing new patterns.

### Negative

*   **Memory Overhead:** Running two workers simultaneously doubles the memory footprint during comparison operations.
*   **Complexity:** The comparison engine adds significant logic for schema reconciliation and delta calculation.
*   **UI Density:** Displaying two datasets worth of information requires careful UX design to avoid overwhelming users.

### Neutral

*   **Schema Flexibility:** Comparison works with files of different schemas, surfacing differences rather than requiring exact matches.
*   **Asymmetric Roles:** File A is designated "baseline" and File B is "comparison," which affects how deltas are presented (positive delta = B is larger).
