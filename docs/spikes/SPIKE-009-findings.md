# SPIKE-009: DuckDB Universal Parser Feasibility - Findings

**Date:** 2025-01-15
**Status:** Complete
**Decision:** Keep current hybrid approach (do NOT adopt DuckDB as universal parser)

---

## Research Questions Answered

### 1. Performance Comparison

| Scenario | WASM Streaming | DuckDB |
|----------|---------------|--------|
| Small CSV (<10MB) | **Faster** (streaming, no full load) | Slower (must load full file) |
| Large CSV (>100MB) | Slower (memory pressure) | **Faster** (columnar) |
| Parquet | N/A | **Excellent** |
| JSONL | Good | **Better** (native support) |

**Verdict:** DuckDB wins for binary/columnar formats; WASM wins for small text files.

### 2. Memory Footprint

| Approach | Memory Pattern |
|----------|---------------|
| WASM Streaming | O(chunk) - 64KB at a time |
| DuckDB | O(file) - must load complete file |

**Verdict:** WASM more memory-efficient for streaming; DuckDB better for large Parquet (columnar reads).

### 3. Bundle Size Impact

- DuckDB-WASM: **~30MB**
- Currently: Lazy-loaded only when entering SQL Mode
- Full adoption: Every profile operation would load 30MB

**Verdict:** Current lazy-loading strategy is optimal. Full adoption would hurt initial load time.

### 4. Format Support Matrix

| Format | WASM Parser | DuckDB | Winner |
|--------|-------------|--------|--------|
| CSV | ✅ Streaming | ✅ Full load | WASM (streaming) |
| TSV | ✅ Streaming | ✅ Full load | WASM (streaming) |
| JSON | ✅ Streaming | ✅ Native | Tie |
| JSONL | ✅ Streaming | ✅ Native | DuckDB (better perf) |
| Parquet | ⚠️ Limited | ✅ Excellent | DuckDB |
| Excel | ✅ xlsx.js | ❌ No support | xlsx.js |
| Avro | ✅ WASM | ❌ No support | **WASM (blocker)** |

**Verdict:** Avro lack of support in DuckDB is a blocker for full adoption.

### 5. Streaming Capability

- **WASM:** True streaming with 64KB chunks, processes as data arrives
- **DuckDB:** **Cannot do chunked reads in browser** - requires complete file first

**Verdict:** WASM required for responsive large file handling.

### 6. Error Messages

| Parser | Error Style | User-Friendliness |
|--------|-------------|-------------------|
| WASM | Business-oriented | ✅ Better for end users |
| DuckDB | SQL-oriented | ⚠️ More technical |

**Verdict:** WASM provides better UX for data engineers.

---

## Current Architecture (Already Hybrid)

```
CSV/JSON (small)    → WASM streaming → WASM profiler
CSV/JSON (large)    → WASM streaming → WASM profiler
Parquet (<100MB)    → WASM → WASM profiler
Parquet (>100MB)    → DuckDB → SQL stats → ProfilerResult  ← Already using DuckDB!
Excel               → xlsx.js worker → CSV → WASM
Avro                → WASM → WASM profiler
SQL results         → Direct rows → WASM profiler
```

**The current architecture is already optimized.** DuckDB is used where it excels (large Parquet).

---

## Recommendation

### Decision: **Status Quo with Minor Enhancements**

Keep the current multi-path architecture. It's already well-optimized.

**Why NOT full DuckDB adoption:**

1. **Avro blocker** - No DuckDB support, need WASM fallback anyway
2. **No streaming** - Can't process files as they arrive
3. **Bundle cost** - 30MB for every profile (currently lazy-loaded)
4. **Memory** - Less efficient for small files
5. **Already hybrid** - Large Parquet already uses DuckDB (SPIKE-005)

**Potential enhancement (low priority):**
- Consider DuckDB for JSONL files (growing use case, native support)

---

## Trade-offs Summary

### If We Had Adopted Full DuckDB:

| Benefit | Drawback |
|---------|----------|
| Single parsing engine | No streaming for large files |
| Better Parquet/JSONL | 30MB bundle on every profile |
| Consistent SQL stats | Avro support lost |
| Simpler architecture | Less memory-efficient for small files |

### Current Hybrid Approach:

| Benefit | Drawback |
|---------|----------|
| Streaming for responsiveness | Multiple code paths |
| Memory-efficient for small files | More maintenance |
| Avro support | Complexity |
| Lazy-load DuckDB (30MB only when needed) | - |

**Verdict:** Trade-off favors current hybrid approach.

---

## Next Steps

1. ✅ Keep current architecture
2. 📋 Consider DuckDB for JSONL (future ticket)
3. 👀 Monitor large file handling telemetry
4. 🔮 Revisit if DuckDB adds Avro support

---

## Decision Outcome

**Recommendation:** [x] Status quo - keep current multi-path architecture

The current hybrid approach is already optimal. No changes needed.
