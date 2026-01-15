# DataCert Architecture Simplification Notes

**Date:** 2025-01-15
**Status:** Discussion notes for future consideration

---

## Current State Assessment

### Architecture Strengths

- **WASM for data processing** - Right choice. Rust gives near-native speed and memory safety
- **Web Worker isolation** - Keeps UI responsive during large file processing
- **Streaming with online algorithms** - Welford's variance, HyperLogLog distinct counts, t-digest quantiles. Bounded memory, O(1) space
- **64KB chunk size** - Good balance between overhead and responsiveness
- **DuckDB fallback for large files** - Pragmatic approach to avoid OOM
- **Privacy-first architecture** - Not just marketing, the design enforces it

### Concerns

#### Feature Sprawl
```
Modes:   Home, SQL Mode, Tree Mode, Compare, Batch
Exports: Great Expectations, Soda Checks, JSON Schema
Imports: All three above
Plus:    CLI, PWA, GCS streaming, Excel worker...
```

For a tool positioning as "simple and instant," there's significant complexity under the hood.

#### Store Proliferation (8 stores)
- `fileStore` - File selection, validation, upload progress
- `profileStore` - Profiling state, worker coordination, results
- `sqlStore` - SQL Mode state, DuckDB initialization
- `treeStore` - Tree Mode JSON structure analysis
- `comparisonStore` - Dual-file comparison state
- `batchStore` - Multi-file batch processing
- `validationStore` - Schema validation state
- `drilldownStore` - Anomaly drill-down row inspection

#### Multiple Processing Paths
```
CSV/JSON      → WASM streaming
Parquet (sm)  → WASM
Parquet (lg)  → DuckDB
Excel         → xlsx.js worker → CSV → WASM
SQL results   → direct rows → WASM
```

Each path has different error handling, progress reporting, and edge cases.

---

## Simplification Recommendations

### Feature Tiers

#### Tier 1: Core (Ship & Polish First)
```
Home.tsx → ProfileReport → Export
     ↓
  SqlMode.tsx (differentiator)
```

**Stores needed:** `fileStore`, `profileStore`, `sqlStore` — three stores for the core loop.

**Rationale:** Profile + SQL Mode identified as the essential features. This is the "instant gratification" loop that hooks users.

#### Tier 2: Power User Features (Defer or Gate)

| Feature | Recommendation | Rationale |
|---------|----------------|-----------|
| Compare Mode | v2 or "Pro" | Valuable but not the hook |
| Batch Mode | v2 or "Pro" | Power users want this, not first-time users |
| Tree Mode | Consider removing | Niche JSON structure analysis feels like separate tool |
| Validation imports | Phase 2 | Export first, import later (flip the flow) |

#### Tier 3: Simplification Targets

**Exports:**
- Keep: Great Expectations (most popular in market)
- Keep: JSON Schema (universal standard)
- Defer: Soda Checks (smaller market share, add in v2)

---

### Store Consolidation

**Current:** 8 stores
**Proposed:** 5 stores

| Merge | Into | Rationale |
|-------|------|-----------|
| `drilldownStore` | `profileStore` | Drilldown is just "show me the bad rows" - a view of profile results |
| `validationStore` | `profileStore` | Validation is another view/mode of results |
| `treeStore` | Delete or keep isolated | Only if Tree Mode stays |

**Result:** `fileStore`, `profileStore`, `sqlStore`, `comparisonStore`, `batchStore`

If Compare/Batch are deferred: just **3 stores** for core functionality.

---

### Processing Path Unification

**Current problem:** 5+ different paths to profile data, each with different error handling.

**Potential solution:** Standardize on DuckDB as universal parser.

```
Current:
  CSV → WASM parser → WASM profiler
  JSON → WASM parser → WASM profiler
  Parquet → DuckDB → ??? → WASM profiler
  Excel → Worker → CSV → WASM parser → WASM profiler

Proposed:
  ALL formats → DuckDB (parses everything) → WASM profiler (stats only)
```

**Tradeoffs:**
- Pro: One parsing path, one error handling strategy
- Pro: DuckDB handles CSV, JSON, Parquet natively
- Con: DuckDB is 30MB, currently lazy-loaded only for SQL Mode
- Con: Lose streaming for small files (DuckDB loads full file)

**Hybrid approach:** Keep WASM streaming for files < 50MB, DuckDB for larger files. Reduces paths from 5 to 2.

---

### UX Simplification

Rather than removing features, **reduce prominence:**

1. **Primary nav:** Home, SQL Mode only
2. **"More Tools" menu:** Compare, Batch, Tree Mode
3. **Export modal:** Show GE + JSON Schema prominently, Soda as "More formats"
4. **Feature flags:** Gate advanced features for gradual rollout

---

## Summary

| Area | Current | Recommended |
|------|---------|-------------|
| Modes in primary nav | 5 | 2 (Home, SQL) |
| Stores | 8 | 3-5 |
| Export formats (prominent) | 3 | 2 |
| Processing paths | 5+ | 2 |

**Core principle:** The architecture is sound. The issue is surface area. Don't delete features—reduce prominence until core is bulletproof.

---

## Action Items (When Ready)

- [ ] Audit store usage - confirm which can be merged
- [ ] Add feature flags infrastructure
- [ ] Implement "More Tools" navigation pattern
- [ ] Profile DuckDB-for-all-formats approach
- [ ] User research: which features are actually used?
