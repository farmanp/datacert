# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DataCert** is a local-first, in-browser data profiling toolkit powered by WebAssembly. It analyzes datasets (CSV/TSV/JSON/Parquet/Excel/Avro) and provides statistical summaries, quality metrics, SQL querying, and visualizations - all processing happens locally in the browser. No data ever leaves the user's device.

**Key value propositions:**
- **Privacy-first**: All processing local, safe for PII and sensitive data
- **Near-native speed**: Rust/WASM streaming engine handles massive files
- **Zero dependencies**: No Python, Docker, or cloud console needed

## Development Commands

```bash
# Development
npm run dev             # Start Vite dev server (port 3000)
npm run preview         # Preview production build

# Build
npm run build           # Full build: Rust/WASM + Vite bundle
npm run build:wasm      # WASM only: cd src/wasm && wasm-pack build --target web
npm run build:cli       # Build CLI for npm distribution

# Testing
npm run test            # Run all Vitest tests
npm run test:all        # Run all test suites (Rust + TS Unit + Integration + Accuracy)
npm run test:unit       # Run only TypeScript unit tests
npm run test:integration # Run integration tests
npm run test:accuracy   # Run statistical accuracy tests
npm run test:rust       # Run Rust tests only
npm run test:e2e        # Run Playwright E2E tests
npm run test:e2e:ui     # Run E2E tests with UI
npm run test:e2e:headed # Run E2E tests in headed browser

# Code Quality
npm run typecheck       # Run TypeScript type checker
npm run lint            # ESLint check (src/app, max-warnings 0)
npm run lint:rust       # Run Clippy on Rust code
npm run format          # Format codebase (Prettier + Rustfmt)
npm run check           # Run all checks (typecheck + lint + format:check)

# Documentation
npm run docs:start      # Start Docusaurus dev server
npm run docs:build      # Build Docusaurus static site
npm run docs:serve      # Serve built Docusaurus site
```

**Prerequisites**: Node.js 18+, Rust + Cargo, `wasm-pack` (`cargo install wasm-pack`)

## Architecture

### Hybrid Frontend + WASM Core

```
User Input → FileDropzone → profileStore.startProfiling()
    ↓
profiler.worker.ts (Web Worker)
    ↓
Profiler (WASM) → CsvParser → Profiler → Stats modules
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

### Supported File Formats

| Format | Parser | Large File Handling |
|--------|--------|---------------------|
| CSV/TSV | Rust WASM streaming | 64KB chunks |
| JSON/JSONL | Rust WASM streaming | 64KB chunks with nested flattening |
| Parquet | DuckDB-WASM | Columnar reads, >100MB uses DuckDB path |
| Excel (.xlsx/.xls) | xlsx.js in Web Worker | Sheet selection UI |
| Avro | Rust WASM | Schema extraction + data profiling |

### Large File Handling (>100MB)

For binary files (Parquet/Avro) exceeding 100MB, the system automatically switches to a DuckDB-based profiling path to avoid OOM:

```
profileStore detects large file → Worker sends 'use_large_file_mode'
    ↓
profileLargeFileWithDuckDB() → initDuckDB() (lazy singleton)
    ↓
registerParquet() → CREATE TABLE AS SELECT * FROM read_parquet()
    ↓
SQL-based stats (PERCENTILE_CONT, STDDEV_POP, etc.)
    ↓
ProfilerResult → UI
```

### Directory Structure

```
src/
├── app/                        # SolidJS frontend application
│   ├── pages/
│   │   ├── Home.tsx            # Main page with dropzone/results toggle
│   │   ├── SqlMode.tsx         # SQL Mode - DuckDB query interface
│   │   ├── TreeMode.tsx        # Tree Mode - hierarchical JSON structure view
│   │   ├── Compare.tsx         # Dual-file comparison mode
│   │   ├── Batch.tsx           # Multi-file batch processing
│   │   └── DuckDBSpike.tsx     # DuckDB experimentation page
│   ├── components/
│   │   ├── FileDropzone.tsx    # File upload with drag-drop
│   │   ├── ProfileReport.tsx   # Profile results display
│   │   ├── SqlEditor.tsx       # SQL query editor with syntax highlighting
│   │   ├── QueryResults.tsx    # SQL query results table
│   │   ├── TreeProfileView.tsx # Tree structure visualization
│   │   ├── ColumnCard.tsx      # Individual column statistics card
│   │   ├── Histogram.tsx       # Distribution visualization
│   │   ├── CorrelationMatrix.tsx # Numeric column correlations
│   │   ├── ExportFormatSelector.tsx # Export to GE/Soda/JSON Schema
│   │   ├── ValidationResultsView.tsx # Schema validation results
│   │   └── ...                 # 40+ components total
│   ├── stores/
│   │   ├── fileStore.ts        # File upload state (persists across navigation)
│   │   ├── profileStore.ts     # Profiling state, worker coordination, results
│   │   ├── sqlStore.ts         # SQL Mode state (DuckDB, queries, results)
│   │   ├── treeStore.ts        # Tree Mode structure analysis state
│   │   ├── comparisonStore.ts  # Dual-file comparison state
│   │   ├── batchStore.ts       # Batch processing state
│   │   ├── validationStore.ts  # Schema validation state
│   │   └── drilldownStore.ts   # Anomaly drill-down state
│   ├── utils/
│   │   ├── duckdb.ts           # DuckDB-WASM lazy loader and query utilities
│   │   ├── duckdbToCSV.ts      # Convert query results to CSV for profiling
│   │   ├── exportGreatExpectations.ts  # Export to Great Expectations format
│   │   ├── exportSodaChecks.ts # Export to Soda Checks YAML
│   │   ├── exportJsonSchema.ts # Export to JSON Schema
│   │   ├── importGreatExpectations.ts  # Import GE suite for validation
│   │   ├── importSodaChecks.ts # Import Soda checks for validation
│   │   ├── parquet-schema.ts   # Parquet schema extraction
│   │   └── structure-scanner.ts # JSON structure analysis
│   ├── workers/
│   │   ├── profiler.worker.ts  # Main profiling Web Worker (loads WASM)
│   │   └── excel.worker.ts     # Excel file parsing worker
│   ├── services/
│   │   └── gcs-streaming.service.ts # GCS remote file streaming
│   └── types/
│       ├── generated.ts        # TypeScript types generated from Rust (ts-rs)
│       └── errors.ts           # Error type definitions
├── cli/                        # CLI for CI/CD integration
│   └── index.ts                # Entry point: npx datacert profile <file>
└── wasm/                       # Rust data engine
    ├── Cargo.toml              # Dependencies: wasm-bindgen, csv, serde, etc.
    └── src/
        ├── lib.rs              # WASM exports: DataCertProfiler, JsonProfiler, etc.
        ├── parser/             # Parsers for CSV, JSON/JSONL, Avro
        │   ├── csv.rs          # CSV streaming parser with auto-delimiter
        │   ├── json.rs         # JSON/JSONL streaming parser
        │   └── avro.rs         # Avro schema and data parsing
        ├── stats/              # Statistics modules
        │   ├── profiler.rs     # Main profiler orchestration
        │   ├── types.rs        # DataType enum, BaseStats, StatAccumulator
        │   ├── numeric.rs      # Numeric stats (mean, std_dev, percentiles)
        │   ├── categorical.rs  # Frequency tables, top values
        │   ├── histogram.rs    # Histogram bin generation
        │   ├── correlation.rs  # Pearson correlation matrix
        │   └── tree.rs         # Tree structure analysis
        ├── quality/            # Data quality metrics
        └── export/             # Export format generators

tickets/                        # Development tickets in AI-ready format
docs/                           # Documentation source
website/                        # Docusaurus documentation site
e2e/                            # Playwright E2E tests
tests/                          # Vitest test suites (unit, integration, accuracy)
```

### State Management Pattern

Uses SolidJS stores created via `createRoot` for singleton instances:

| Store | Purpose |
|-------|---------|
| `fileStore` | File selection, validation, upload progress (persists across navigation) |
| `profileStore` | Profiling state, worker coordination, results |
| `sqlStore` | SQL Mode state, DuckDB initialization, query execution |
| `treeStore` | Tree Mode JSON structure analysis |
| `comparisonStore` | Dual-file comparison state and results |
| `batchStore` | Multi-file batch processing state |
| `validationStore` | Schema validation state (GE/Soda/JSON Schema) |
| `drilldownStore` | Anomaly drill-down row inspection |

### Worker Communication Protocol

**Messages to worker:**
- `init` - Initialize WASM module
- `start_profiling` - Begin profiling with config (delimiter, hasHeaders, format, fileSize)
- `process_chunk` - Send 64KB data chunk (Transferable ArrayBuffer)
- `process_rows` - Direct row profiling from SQL results (bypasses file I/O)
- `finalize` - Complete profiling and compute final stats

**Messages from worker:**
- `ready` - WASM initialized, ready to profile
- `started` - Profiling started, send chunks
- `final_stats` - Complete ProfilerResult
- `error` - Error message
- `use_large_file_mode` - File >100MB, switch to DuckDB path
- `memory_warning` - High memory usage detected
- `memory_critical` - Critical memory, may OOM

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

| Task | File |
|------|------|
| Add UI component | `src/app/components/` |
| Modify main page | `src/app/pages/Home.tsx` |
| Change file handling | `src/app/stores/fileStore.ts` |
| Modify profiling logic | `src/app/stores/profileStore.ts` |
| Change worker protocol | `src/app/workers/profiler.worker.ts` |
| Modify WASM exports | `src/wasm/src/lib.rs` |
| Add/modify statistics | `src/wasm/src/stats/` |
| Modify CSV parsing | `src/wasm/src/parser/csv.rs` |
| Modify JSON parsing | `src/wasm/src/parser/json.rs` |
| Modify SQL Mode | `src/app/pages/SqlMode.tsx` |
| Change SQL state | `src/app/stores/sqlStore.ts` |
| Modify DuckDB loading | `src/app/utils/duckdb.ts` |
| Modify Tree Mode | `src/app/pages/TreeMode.tsx`, `src/app/stores/treeStore.ts` |
| Add export format | `src/app/utils/export*.ts` |
| Add import format | `src/app/utils/import*.ts` |
| Modify CLI | `src/cli/index.ts` |
| Add data quality rule | `src/wasm/src/quality/` |
| Modify E2E tests | `e2e/` |

## CLI Usage

DataCert includes a CLI for CI/CD integration:

```bash
# Profile a file
npx datacert profile data.csv

# Fail if missing values exceed threshold
npx datacert profile data.csv --fail-on-missing 5

# Output as JSON
npx datacert profile data.csv --format json
```

The CLI reuses the same WASM engine as the web UI.

## Testing

**Unit/Integration Tests (Vitest):**
- Framework: Vitest with jsdom environment
- Setup: `src/app/setupTests.ts`
- Test files: `*.test.ts` / `*.test.tsx` pattern
- Run single test: `npx vitest run path/to/test.test.tsx`

**E2E Tests (Playwright):**
- Config: `playwright.config.ts`
- Test files: `e2e/*.spec.ts`
- Run: `npm run test:e2e`
- Debug: `npm run test:e2e:debug`

**Rust Tests:**
- Run: `npm run test:rust` or `cd src/wasm && cargo test`

## Development Roadmap

See `tickets/README.md` for the full backlog organized by phase and sprint.

### Completed Features
- CSV/TSV streaming parser with auto-delimiter detection
- JSON/JSONL parser with nested object flattening
- Parquet support (via DuckDB for large files)
- Excel (.xlsx/.xls) support with sheet selection
- Avro support with schema viewer
- SQL Mode (DuckDB-WASM) - query local files with SQL
- Tree Mode - hierarchical JSON structure visualization
- Comparison Mode - dual-file schema drift detection
- Batch Mode - multi-file processing
- Export to Great Expectations, Soda Checks, JSON Schema
- Import validation rules from GE/Soda/JSON Schema
- CLI for CI/CD pipelines
- PWA with offline support

### Spike Research Completed
- `SPIKE-001` - Streaming architecture: 64KB chunks, online algorithms, O(1) memory
- `SPIKE-005` - DuckDB-WASM: 1M rows in 97ms, enables SQL mode and large file handling

### Upcoming High-Impact Features
| Feature | Description | Impact |
|---------|-------------|--------|
| FEAT-029 | Profile Diff / Schema Drift Detection | Unique differentiator |
| FEAT-030 | Shareable Profile Links | Collaboration, virality |
| FEAT-031 | Remote URL Profiling (S3/GCS/HTTP) | Enterprise use cases |
| FEAT-032 | dbt Integration | dbt ecosystem adoption |
| FEAT-034 | Smart Data Quality Suggestions | Actionable insights |
| FEAT-035 | VS Code Extension | Developer adoption |

### Tickets Location
- `tickets/` - All development tickets in AI-ready format
- `tickets/README.md` - Implementation order, dependency graph, strategic priorities
