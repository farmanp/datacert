# SPIKE-008: Store Usage Audit - Findings

**Date:** 2025-01-15
**Status:** Complete
**Decision:** Merge `drilldownStore` and `validationStore` into `profileStore`

---

## Store Dependency Map

| Store | Size (LOC) | Direct Component Users | Key Responsibility |
|-------|------------|------------------------|-------------------|
| **fileStore** | 303 | FileDropzone, Home, ProfileReport, ExportFormatSelector, ValidationRuleImporter, ColumnCard, RemoteSourcesModal, GCSUrlInput, TreeProfileView, SqlMode, BatchDropzone, DualDropzone, ResultsTable | File selection, validation, upload progress |
| **profileStore** | 951 | Home, ProfileReport, FileDropzone, TreeProfileView, SqlMode, ExportFormatSelector, ValidationRuleImporter, ColumnCard, GCSUrlInput, ResultsTable, MiniHistogram, Histogram | Profiling orchestration, worker coordination, results |
| **sqlStore** | 359 | SqlMode only | SQL query execution, DuckDB state |
| **treeStore** | 244 | TreeProfileView, TreeNode, TreeNodeDetail | JSON tree structure analysis |
| **comparisonStore** | 468 | Compare, DualDropzone | Two-file comparison |
| **batchStore** | 835 | Batch, BatchFileList, BatchDropzone, BatchResultsTabs, BatchModeSelector, NWayComparisonView | Multi-file batch processing |
| **validationStore** | 57 | ValidationRuleImporter, ValidationResultsView | Validation results storage |
| **drilldownStore** | 177 | AnomalyDrilldown, ColumnCard, FilteredRowsTable | Anomaly row inspection |

---

## Inter-Store Dependencies

All dependencies are **directional with no circular patterns:**

```
profileStore ← imports ← fileStore
comparisonStore ← imports ← profileStore (types), fileStore (constants)
batchStore ← imports ← profileStore (types), fileStore (constants)
drilldownStore ← imports ← profileStore (types), fileStore

sqlStore: standalone (no store dependencies)
treeStore: standalone (no store dependencies)
validationStore: standalone (no store dependencies)
```

**Safe to merge without circular dependency risk.**

---

## Key Finding: drilldownStore and validationStore Usage

### drilldownStore - ALWAYS used with profileStore

- Called via `ColumnCard.tsx` when clicking on missing/outlier/PII badges
- Data comes from: `profileStore.store.results` (column profiles contain anomaly indices)
- Only meaningful after profiling completes
- **Verdict: Tightly coupled to profileStore**

### validationStore - ALWAYS used with profileStore

- `ValidationRuleImporter` accesses `profileStore.store.results` to validate
- Cannot validate without profile data first
- **Verdict: Validation requires profile results to function**

---

## Data Flow

```
FileDropzone
    ↓ (via fileStore.selectFile)
fileStore.store.file
    ↓ (triggers profileStore.startProfiling)
profileStore + worker
    ↓ (sends chunks)
profiler.worker.ts (WASM)
    ↓ (returns final_stats)
profileStore.store.results
    ↓ (flows to UI)
ProfileReport, ColumnCard
    ↓ (when anomaly badge clicked)
drilldownStore.openDrilldown(column, anomaly_indices)
    ↓
validationStore (independent consumption)
ValidationRuleImporter consumes profileStore results
```

---

## Bundle Size Impact

| Store | File Size | Gzip Est. |
|-------|-----------|-----------|
| fileStore | 7.1K | ~2.2K |
| profileStore | 29K | ~7.5K |
| sqlStore | 8.4K | ~2.8K |
| treeStore | 5.8K | ~1.8K |
| comparisonStore | 12K | ~3.2K |
| batchStore | 21K | ~5.5K |
| validationStore | 1.2K | ~0.5K |
| drilldownStore | 5.7K | ~1.8K |
| **Total** | **90.2K** | **~25K** |

**Merge savings:** ~2.3K gzip

---

## Recommendations

### MERGE (Strong Recommendation)

1. **`drilldownStore` → `profileStore`**
   - Rationale: Drilldown is purely a view mode of profile results
   - Risk: **ZERO** - no other components import drilldownStore except ColumnCard and AnomalyDrilldown
   - Bundle savings: ~1.8K gzip

2. **`validationStore` → `profileStore`**
   - Rationale: Validation is another analysis mode of profile results
   - Risk: **ZERO** - validationStore is simple setter/getter pattern (57 LOC)
   - Bundle savings: ~0.5K gzip

### KEEP SEPARATE

- **fileStore** - File operations are orthogonal to profiling
- **sqlStore** - SQL Mode is orthogonal, lazy-loaded independently
- **treeStore** - Tree Mode is feature-specific, can be removed without affecting core
- **comparisonStore** - Comparison is a distinct feature mode
- **batchStore** - Batch processing is a distinct feature mode

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| profileStore grows from 951 → ~1100 LOC | Low | Still manageable |
| Interface bloat | Low | Organize as sub-state objects |
| Component coupling | Low | Components already import profileStore |
| Test complexity | Low | Minimal test changes needed |
| Circular dependencies | None | Verified safe |

---

## Implementation Plan (for INFRA-006)

```typescript
interface ProfileStoreState {
  results: ProfilerResult | null;
  // ... existing fields ...

  // NEW: Drill-down sub-state (from drilldownStore)
  drilldown: {
    isOpen: boolean;
    columnName: string;
    anomalyType: DrilldownType;
    rowIndices: number[];
    currentPage: number;
  };

  // NEW: Validation sub-state (from validationStore)
  validation: {
    summaries: ValidationSummary[];
    isEvaluating: boolean;
    error: string | null;
  };
}
```

---

## Decision

**Approved:** Merge `drilldownStore` and `validationStore` into `profileStore`

**Result:** 8 stores → 6 stores

**Next step:** INFRA-006 (Store Consolidation)
