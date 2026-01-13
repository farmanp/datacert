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

**Key design principles:**

- All data processing in Rust/WASM for performance
- Web Worker offloads computation from main thread
- Streaming architecture processes files in 64KB chunks
- No data leaves the user's device

### Directory Structure

```
src/app/                    # SolidJS frontend
├── pages/Home.tsx          # Main page with dropzone/results toggle
├── components/             # UI components (FileDropzone, ProfileReport, ColumnCard, Histogram, etc.)
├── stores/                 # State management
│   ├── fileStore.ts        # File upload state
│   └── profileStore.ts     # Profiling results and worker coordination
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

- `fileStore`: Manages file selection, validation, upload progress
- `profileStore`: Manages profiling state, spawns worker, stores results

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

## Testing

- Framework: Vitest with jsdom environment
- Setup: `src/app/setupTests.ts`
- Test files: `*.test.tsx` pattern
- Run single test: `npx vitest run path/to/test.test.tsx`
