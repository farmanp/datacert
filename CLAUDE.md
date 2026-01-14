# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DataLens Profiler is a browser-based Progressive Web Application for data profiling. It analyzes datasets (CSV/TSV/JSON) and provides statistical summaries, quality metrics, and visualizations - all processing happens locally in the browser via WebAssembly.

## Development Commands

```bash
npm run dev             # Start Vite dev server (port 3000)
npm run build           # Full build: Rust/WASM + Vite bundle
npm run build:wasm      # WASM only: cd src/wasm && wasm-pack build --target web
npm run test            # Run all Vitest tests
npm run test:all        # Run all test suites (Rust + TS Unit + Integration + Accuracy)
npm run test:unit       # Run only TypeScript unit tests
npm run test:integration # Run integration tests
npm run test:accuracy    # Run statistical accuracy tests
npm run test:rust       # Run Rust tests only
npm run docs:start     # Start Docusaurus dev server
npm run docs:build     # Build Docusaurus static site
npm run docs:serve     # Serve built Docusaurus site
npm run typecheck       # Run TypeScript type checker
npm run lint            # ESLint check (src/app, max-warnings 0)
npm run format          # Format codebase (Prettier + Rustfmt)
npm run check           # Run all checks (typecheck + lint + format:check)
npm run preview         # Preview production build
```

**Prerequisites**: Node.js LTS, Rust + Cargo, `wasm-pack` (`cargo install wasm-pack`)

## Architecture

### Hybrid Frontend + WASM Core

```
User Input → FileDropzone → profileStore.startProfiling()
    ↓
profiler.worker.ts (Web Worker)
    ↓
DataLensProfiler (WASM) → CsvParser → Profiler → Stats modules
    ↓
64KB streaming chunks processed
    ↓
ProfileResult → profileStore.results → ProfileReport UI
```

### SQL Mode Architecture (DuckDB-WASM)

```
ProfileReport UI
    ↓
[SQL Mode Button]
    ↓
SqlMode.tsx ← fileStore (file persists across navigation)
    ↓
duckdb.ts (lazy-loads DuckDB-WASM from JSDelivr CDN, ~30MB)
    ↓
sqlStore.loadFileIntoTable() → CREATE TABLE data AS SELECT * FROM 'file.csv'
    ↓
SqlEditor.tsx → User writes SQL query
    ↓
sqlStore.executeQuery() → DuckDB executes query in-browser
    ↓
QueryResults.tsx (preview first 1,000 rows, BigInt→string serialization)
    ↓
[Profile Results Button]
    ↓
Convert results to CSV → fileStore.setFile() → profileStore.startProfiling()
    ↓
ProfileReport UI (for filtered/transformed data)
```

**SQL Mode design decisions:**

- **Lazy loading**: DuckDB-WASM (~30MB) loaded only when user enters SQL Mode
- **Singleton pattern**: Single DuckDB instance reused across queries
- **30s query timeout**: Prevents runaway queries from freezing browser
- **BigInt serialization**: All BigInt values converted to strings for JSON safety
- **1,000 row preview**: Full results available for profiling, UI shows preview
- **File persistence**: fileStore maintains file across page navigation

**Key design principles:**

- All data processing in Rust/WASM for performance
- Web Worker offloads computation from main thread
- Streaming architecture processes files in 64KB chunks
- No data leaves the user's device

### Directory Structure

```
src/app/                    # SolidJS frontend
├── pages/
│   ├── Home.tsx            # Main page with dropzone/results toggle
│   └── SqlMode.tsx         # SQL Mode page with DuckDB query interface
├── components/
│   ├── FileDropzone.tsx    # File upload dropzone
│   ├── ProfileReport.tsx   # Profile results display (includes SQL Mode button)
│   ├── SqlEditor.tsx       # SQL query editor with syntax highlighting
│   ├── QueryResults.tsx    # SQL query results table
│   └── ...                 # ColumnCard, Histogram, etc.
├── stores/
│   ├── fileStore.ts        # File upload state (persists across navigation)
│   ├── profileStore.ts     # Profiling results and worker coordination
│   └── sqlStore.ts         # SQL Mode state (DuckDB, queries, results)
├── utils/
│   ├── duckdb.ts           # DuckDB-WASM lazy loader and query utilities
│   └── duckdbToCSV.ts      # Convert query results to CSV for profiling
└── workers/
    └── profiler.worker.ts  # Web Worker that loads WASM and processes chunks

src/wasm/                   # Rust data engine
├── Cargo.toml              # Dependencies: wasm-bindgen, csv, serde, hyperloglogplus
└── src/
    ├── lib.rs              # WASM exports: DataLensProfiler, CsvStreamingParser
    ├── parser/             # CSV streaming parser with auto-delimiter detection
    └── stats/              # Statistics modules
        ├── profiler.rs     # Main profiler orchestration
        ├── types.rs        # DataType enum, BaseStats, StatAccumulator trait
        ├── numeric.rs      # Numeric stats (mean, std_dev, percentiles, etc.)
        ├── categorical.rs  # Frequency tables, top values
        └── histogram.rs    # Histogram bin generation

tickets/                    # Development tickets (active/, done/)
```

### State Management Pattern

Uses SolidJS stores created via `createRoot` for singleton instances:

- `fileStore`: Manages file selection, validation, upload progress (persists across navigation)
- `profileStore`: Manages profiling state, spawns worker, stores results
- `sqlStore`: Manages SQL Mode state, DuckDB initialization, query execution, results

### Worker Communication Protocol

Messages to worker: `init`, `start_profiling`, `process_chunk`, `finalize`, `detect_delimiter`
Messages from worker: `ready`, `started`, `chunk_processed`, `final_stats`, `error`, `delimiter_detected`

## Code Conventions

### SolidJS/TypeScript

- ESLint rules enforce SolidJS reactivity (`solid/reactivity`, `solid/no-destructure`)
- State accessed via `store.property`, not destructured in reactive contexts
- Prettier: 2 spaces, 100 char width, semicolons, trailing commas

### Rust/WASM

- Edition 2021, release profile with `opt-level = "s"` and LTO
- Serialization via `serde` + `serde-wasm-bindgen` for JS interop
- Key crates: `csv`, `encoding_rs`, `hyperloglogplus` (distinct estimation), `chrono`

## Streaming Architecture (SPIKE-001 Findings)

### Data Flow
```
File → ReadableStream (64KB chunks) → Transferable ArrayBuffer → Worker → WASM → Online Stats → JSON Result
```

### Online Algorithms

| Statistic | Algorithm | Space | Notes |
|-----------|-----------|-------|-------|
| Mean/Sum | Running accumulator | O(1) | Exact |
| Variance/StdDev | Welford's | O(1) | Numerically stable |
| Median/Quantiles | t-digest | ~2KB | <0.01% error for P1/P99 |
| Distinct Count | HyperLogLog | ~1.5KB | 2% error, uses `hyperloglogplus` crate |
| Top-N Values | Count-Min Sketch + Heap | ~1KB | For top-10 tracking |
| Histogram | Dynamic binning | O(bins) | Derived from quantiles |

### Performance Targets

| File Size | Time | Memory |
|-----------|------|--------|
| 10MB | < 3s | < 50MB |
| 100MB | < 15s | < 200MB |
| 500MB | < 60s | < 1GB |

### Browser Compatibility

- **ReadableStream**: 97%+ (Chrome 43+, Firefox 65+, Safari 10.1+)
- **SharedArrayBuffer**: 95% (requires COOP/COEP headers - optional enhancement)
- **WASM in Workers**: Universal modern browser support
- **Transferable ArrayBuffer**: Universal support

## Key Entry Points

| Task                   | File                                 |
| ---------------------- | ------------------------------------ |
| Add UI component       | `src/app/components/`                |
| Modify main page       | `src/app/pages/Home.tsx`             |
| Change file handling   | `src/app/stores/fileStore.ts`        |
| Modify profiling logic | `src/app/stores/profileStore.ts`     |
| Change worker protocol | `src/app/workers/profiler.worker.ts` |
| Modify WASM exports    | `src/wasm/src/lib.rs`                |
| Add/modify statistics  | `src/wasm/src/stats/`                |
| Modify CSV parsing     | `src/wasm/src/parser/csv.rs`         |
| Modify SQL Mode        | `src/app/pages/SqlMode.tsx`          |
| Change SQL state       | `src/app/stores/sqlStore.ts`         |
| Modify DuckDB loading  | `src/app/utils/duckdb.ts`            |

## Testing

- Framework: Vitest with jsdom environment
- Setup: `src/app/setupTests.ts`
- Test files: `*.test.tsx` pattern
- Run single test: `npx vitest run path/to/test.test.tsx`

## Development Roadmap

See `tickets/README.md` for the full backlog. Key phases:

1. **Foundation**: Project scaffold, CSV parser, basic stats, core UI, PWA
2. **Core Features**: Advanced stats (t-digest, HLL), quality metrics, visualizations, exports
3. **Polish**: Parquet support, comparison mode, correlation matrix, test suite
4. **Phase 4**: Cloud storage integration research (GCS), database warehouse feasibility

### Active Tickets Location
- `tickets/` - All development tickets in AI-ready format
- `tickets/README.md` - Implementation order and dependency graph

### Spike Research
- `SPIKE-001` - Streaming architecture (completed) - findings in this file
- `SPIKE-002` - Cloud storage feasibility (planned)
- `SPIKE-003` - GCS integration design (planned)
- `SPIKE-004` - Database warehouse feasibility (planned)
- `SPIKE-005` - DuckDB-WASM for SQL query profiling (completed) - **HIGHLY FEASIBLE**
  - 1M rows: 97ms generate, 12ms aggregate, 85MB memory
  - Enables SQL mode, remote Parquet, instant drill-downs

### Completed Features
- `FEAT-020` - DuckDB SQL Mode (completed) - query data with SQL, profile results

### Upcoming High-Impact Features (P1)
- `FEAT-016` - Anomaly drill-down (view failing rows, not just counts)
- `FEAT-017` - Excel (.xlsx/.xls) support
- `FEAT-018` - Apache Avro support
- `FEAT-019` - Markdown export (copy to clipboard for PRs/tickets)
