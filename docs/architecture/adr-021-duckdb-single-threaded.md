# ADR-021: DuckDB-WASM Single-Threaded Mode Constraint

**Status**: Accepted  
**Date**: 2026-01-14  
**Deciders**: Engineering Team  
**Related**: FEAT-020 (SQL Mode)

## Context

DataCert uses DuckDB-WASM to provide SQL querying capabilities in the browser through the SQL Mode feature. During implementation and deployment, we encountered a critical error:

```
Error: DuckDB was compiled without threads! 
Setting total_threads != external_threads is not allowed.
```

This error occurred in multiple places where DuckDB was being initialized with threading parameters.

## Decision

**We will use DuckDB-WASM in single-threaded mode only.**

All DuckDB initialization code must:
1. Pass `undefined` (not `bundle.pthreadWorker`) to `db.instantiate()`
2. Never set `threads` configuration in SQL queries
3. Document this constraint in code comments

### Implementation

```typescript
// ✅ CORRECT - Single-threaded mode
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, undefined);

// ❌ WRONG - Attempts threading
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
await conn.query(`SET threads=2`); // Also wrong
```

## Rationale

### Why Single-Threaded?

1. **npm Distribution**: The standard DuckDB-WASM package from npm (`@duckdb/duckdb-wasm`) is compiled **without pthread support** for maximum browser compatibility
2. **Browser Constraints**: Threading in WASM requires:
   - `SharedArrayBuffer` support
   - `Cross-Origin-Isolation` headers (COOP/COEP)
   - Browser-specific threading implementations
3. **Complexity vs Benefit**: For typical DataCert use cases (profiling datasets under 1GB), single-threaded performance is sufficient

### Threading-Enabled Build

DuckDB-WASM *can* be compiled with threading using the `coi` (Cross-Origin Isolated) bundle:
```typescript
// Available but not used in DataCert
const bundle = {
  coi: {
    mainModule: "...",
    mainWorker: "...",
    pthreadWorker: "..." // Only available in custom builds
  }
}
```

However, this requires:
- Custom compilation of DuckDB-WASM
- Strict CORS/COEP headers on the web server
- Potential browser compatibility issues

## Consequences

### Positive

- ✅ Works with standard npm package
- ✅ Broader browser compatibility
- ✅ Simpler deployment (no special headers required)
- ✅ Predictable performance across environments

### Negative

- ❌ Reduced query performance on multi-core systems
- ❌ Limited parallelism for large aggregations
- ❌ Maximum memory pressure on single thread

### Mitigations

For users with large datasets:
1. Memory limit set to 1GB to prevent OOM crashes
2. Query timeout at 30 seconds
3. Warning for result sets > 100k rows
4. CLI profiler recommended for files > 500MB

## Affected Code

All DuckDB initialization points (identified during bug fix):
1. `src/app/utils/duckdb.ts` - Shared utility
2. `src/app/pages/SqlMode.tsx` - SQL Mode component
3. `src/app/stores/sqlStore.ts` - SQL state management
4. `src/app/pages/DuckDBSpike.tsx` - Test/spike page

## References

- [DuckDB-WASM Documentation](https://duckdb.org/docs/api/wasm/overview.html)
- [SharedArrayBuffer Requirements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- Issue: v0.1.6-v0.1.9 threading bug fix

## Notes

This is a **platform limitation**, not a DataCert architectural choice. If DuckDB-WASM ships with threading support by default in future versions, we can re-evaluate this decision.
