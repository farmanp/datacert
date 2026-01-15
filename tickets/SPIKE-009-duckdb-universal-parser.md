# SPIKE-009: DuckDB Universal Parser Feasibility

## 1. Research Intent (Required)
We need to understand **whether DuckDB can replace multiple parsing paths**
In order to decide **if we should unify all file parsing through DuckDB instead of maintaining 5+ separate paths**

**Success Looks Like:**
A clear recommendation on whether to adopt DuckDB as the universal parser, with performance data and tradeoff analysis.

## 2. Key Questions (Required)
1. **Performance:** How does DuckDB parsing compare to WASM streaming for small files (<10MB)?
2. **Memory:** What's the memory footprint difference? (streaming = O(chunk) vs DuckDB = O(file)?)
3. **Bundle size:** DuckDB is ~30MB, currently lazy-loaded. Impact of loading it for all files?
4. **Format support:** Does DuckDB handle all our formats natively? (CSV, JSON, JSONL, Parquet, Excel, Avro)
5. **Streaming:** Can DuckDB do streaming/chunked reads, or must it load full file?
6. **Error handling:** Is DuckDB error messaging as good as our custom parsers?

## 3. Scope & Constraints (Required)
**In Scope:**
- Benchmark DuckDB parsing vs WASM parsing for CSV, JSON, Parquet
- Test memory usage patterns
- Explore DuckDB streaming capabilities
- Document format support gaps
- Create POC of unified parsing path

**Out of Scope:**
- Production-ready implementation
- Excel parsing (xlsx.js is working fine)
- Avro parsing (separate concern)
- UI changes

**Timebox:** 2 days

## 4. AI Execution Instructions (Required)
**Allowed:**
- Throwaway benchmark code
- POC implementations
- DuckDB experimentation in `/spike/duckdb` page
- Performance measurements

**Ambiguity Rule:**
Favor learning speed over correctness. Quick benchmarks over comprehensive testing.

## 5. Planned Git Commit Message (Required)
- `chore(spike): explore DuckDB as universal parser`

## 6. Decision Outcome (To be filled upon completion)
**Decision:** We will / will not adopt DuckDB as universal parser

**Rationale:**
- [Performance findings]
- [Memory findings]
- [Format support findings]

**Trade-offs:**
- [Benefits]
- [Drawbacks]

**Recommendation:**
- [ ] Full adoption: DuckDB for all formats
- [ ] Hybrid: DuckDB for large files, WASM for small
- [ ] Status quo: Keep current multi-path architecture

## 7. Deliverables
- [ ] Benchmark results: DuckDB vs WASM parsing times
- [ ] Memory usage comparison
- [ ] Format support matrix
- [ ] POC code (throwaway)
- [ ] Key questions answered
- [ ] Decision recorded with rationale

## Current Processing Paths (for reference)
```
CSV/JSON      → WASM streaming parser → WASM profiler
Parquet (sm)  → WASM parser → WASM profiler
Parquet (lg)  → DuckDB → SQL stats → ProfilerResult
Excel         → xlsx.js worker → CSV string → WASM
SQL results   → Direct rows → WASM profiler
```

**Proposed (if spike succeeds):**
```
All formats   → DuckDB (parse) → WASM profiler (stats only)
     OR
Small files   → WASM streaming (fast startup)
Large files   → DuckDB (handles scale)
```

## References
- [Simplification Notes](../docs/SIMPLIFICATION_NOTES.md)
- [SPIKE-005: DuckDB WASM Feasibility](./SPIKE-005-duckdb-wasm-feasibility.md) - prior research
- Related: INFRA-006 (Store Consolidation)
