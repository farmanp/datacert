# DataCert

**DataCert** is a local-first, in-browser data quality certification toolkit powered by WebAssembly. Profile, query, and validate your data without leaving your browser - all processing happens locally on your device.

## What is DataCert?

DataCert is the tool you reach for when you need to quickly understand and certify your data quality without spinning up infrastructure. It's your data certification toolkit - always ready.

**Core Capabilities:**
- **Profile** - Comprehensive statistical profiling with quality metrics
- **Query** - SQL Mode powered by DuckDB-WASM for ad-hoc analysis
- **Validate** - Import/export Great Expectations, Soda Checks, JSON Schema
- **Compare** - Side-by-side dataset comparison and schema drift detection
- **Export** - HTML reports, JSON, CSV, Markdown, and more

## Why DataCert?

| Problem | DataCert Solution |
|---------|-------------------|
| "I need to quickly check this CSV" | Drop it in, instant profile |
| "pandas-profiling requires Python setup" | Browser-based, no install |
| "I can't upload sensitive data to cloud tools" | 100% local processing |
| "I need to run a quick SQL query" | DuckDB-WASM built-in |
| "I want to compare two versions of a dataset" | Compare Mode |

## Features

- **Multi-format support:** CSV, TSV, JSON, JSONL, Parquet, Excel (.xlsx)
- **Comprehensive statistics:** Mean, median, std dev, percentiles, min/max
- **Data quality metrics:** Missing values, uniqueness, type detection, PII detection
- **Histogram visualizations:** Auto-binned distributions for numeric columns
- **Correlation matrix:** Visualize relationships between numeric columns
- **SQL Mode:** Query your data with DuckDB-WASM, profile results
- **Comparison mode:** Detect schema drift and statistical changes
- **Validation exports:** Great Expectations, Soda Checks, JSON Schema
- **Cloud integration:** Google Cloud Storage (GCS) support
- **PWA:** Install as a native-like app with offline support
- **Privacy-first:** No data leaves your device

## Quick Start

Run locally:

```bash
# Clone and install
git clone https://github.com/farmanp/datacert.git
cd datacert
npm install

# Build WASM and start dev server
npm run build:wasm
npm run dev
```

## CLI Usage

DataCert includes a powerful CLI for automation and CI/CD pipelines. For detailed instructions, see the [CLI Guide](docs/guides/cli.md).

```bash
# Profile a single file to JSON (stdout)
npx datacert profile data.csv

# Profile multiple files and save to a directory
npx datacert profile "*.csv" --output reports/ --format html

# CI/CD Quality Gate: fail if more than 5% missing values
npx datacert profile data.csv --fail-on-missing 5
```

**Options:**
- `-o, --output <path>`: Output file or directory
- `-f, --format <type>`: Output format: `json`|`html`|`markdown` (default: `json`)
- `-q, --quiet`: Suppress progress output
- `--fail-on-missing <pct>`: Exit 1 if any column > pct% missing
- `--fail-on-duplicates`: Exit 1 if any column has duplicates
- `--help`: Show usage information

## Architecture

```
datacert
├── Frontend: SolidJS + TypeScript + Tailwind CSS
├── Core Engine: Rust → WebAssembly (wasm-bindgen)
├── SQL Mode: DuckDB-WASM (lazy-loaded)
└── Build: Vite + wasm-pack
```

**Key Design Principles:**
- All data processing in Rust/WASM for performance
- Streaming architecture processes files in 64KB chunks
- Web Workers offload computation from main thread
- No data leaves the user's device

## Development

### Prerequisites

- Node.js (LTS)
- Rust + Cargo
- wasm-pack (`cargo install wasm-pack`)

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Full production build (WASM + Frontend) |
| `npm run build:wasm` | Compile Rust to WebAssembly |
| `npm run test` | Run test suite |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint checks |
| `npm run check` | All checks (typecheck + lint + format) |

### Directory Structure

```
src/
├── app/          # SolidJS frontend
│   ├── components/
│   ├── pages/
│   ├── stores/
│   └── workers/
└── wasm/         # Rust core engine
    └── src/
        ├── parser/
        └── stats/

docs/             # Documentation
tickets/          # Development tickets
```

## Supported Formats

| Format | Extensions | Notes |
|--------|------------|-------|
| CSV | .csv | Auto-detects delimiter |
| TSV | .tsv | Tab-separated |
| JSON | .json | Array of objects |
| JSONL | .jsonl | JSON Lines format |
| Parquet | .parquet | Apache Parquet |
| Excel | .xlsx | Multi-sheet support |

## Roadmap

See [tickets/README.md](tickets/README.md) for the full backlog. Highlights:

- **CLI / Headless Mode** - CI/CD integration
- **Profile Diff** - Schema drift detection
- **Shareable Links** - Collaboration without uploading data
- **VS Code Extension** - Profile files in your editor

## Documentation

- [SQL Mode Guide](docs/guides/sql-mode.md)
- [Export Formats](docs/guides/exports.md)
- [Validation Guide](docs/guides/validation.md)
- [Statistics Reference](docs/reference/statistics.md)
- [GCS Setup](docs/user-guides/gcs-setup.md)

## License

MIT
