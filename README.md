# DataLens Profiler

## Project Overview

**DataLens Profiler** is a high-performance, browser-based Progressive Web Application (PWA) for data profiling. It analyzes datasets (CSV, JSON, JSONL, Parquet) to provide statistical summaries, quality metrics, and visualizations without data ever leaving the user's device.

The application supports cloud storage integration with Google Cloud Storage (GCS) for seamless access to remote datasets, and includes a comparison mode for analyzing differences between datasets.

### Architecture

The project employs a hybrid architecture:

- **Frontend:** Built with **SolidJS** and **TypeScript** for a reactive, performant UI. Styled with **Tailwind CSS**.
- **Core Engine:** Data parsing and statistical analysis are implemented in **Rust** and compiled to **WebAssembly (Wasm)** for near-native performance.
- **Build Tool:** **Vite** handles the bundling and development server, integrating both the SolidJS frontend and the Wasm module.

## Tech Stack

- **Frontend Framework:** SolidJS (v1.8+)
- **Language:** TypeScript (v5.0+)
- **Styling:** Tailwind CSS (v3.3+)
- **Core Logic:** Rust (Edition 2021) -> WebAssembly (`wasm-bindgen`)
- **Build System:** Vite (v5.0+), wasm-pack
- **Testing:** Vitest, Testing Library
- **Linting/Formatting:** ESLint, Prettier

## Key Features

- **Multi-format support:** CSV, JSON, JSONL, Parquet with automatic delimiter detection for CSV/TSV
- **Comprehensive statistics:** Mean, median, standard deviation, percentiles, min/max, and more
- **Data quality metrics:** Missing value percentages, uniqueness ratios, and data type detection
- **Histogram visualizations:** Auto-binned histograms for numeric column distributions
- **Correlation matrix:** Visualize relationships between numeric columns
- **File comparison mode:** Compare two datasets side-by-side to identify differences
- **Cloud storage integration:** Connect to Google Cloud Storage (GCS) for remote file access
- **Export capabilities:** Export reports to HTML, JSON, CSV, or PDF formats
- **PWA with offline support:** Install as a native-like app with full offline functionality
- **Privacy-first:** All data processing happens locally in your browser - no data leaves your device

## Supported File Formats

| Format  | Extensions | Notes                  |
| :------ | :--------- | :--------------------- |
| CSV     | .csv       | Auto-detects delimiter |
| TSV     | .tsv       | Tab-separated          |
| JSON    | .json      | Array of objects       |
| JSONL   | .jsonl     | JSON Lines format      |
| Parquet | .parquet   | Apache Parquet         |

## Directory Structure

- **`src/app/`**: SolidJS frontend application code.
  - `components/`: Reusable UI components.
  - `pages/`: Application views/routes.
  - `stores/`: State management (SolidJS signals/stores).
  - `workers/`: Web Workers for off-loading heavy tasks.
  - `types/`: TypeScript type definitions.
  - `services/`: External service integrations (GCS, etc.).
- **`src/wasm/`**: Rust source code for the data profiling engine.
  - `src/parser/`: CSV/Data parsing logic.
  - `src/stats/`: Statistical analysis modules.
- **`docs/architecture/`**: Architecture Decision Records (ADRs) and design documentation.
- **`docs/user-guides/`**: User documentation and setup guides.
- **`tickets/`**: Documentation of features and tasks (Agile/Jira-style tickets).

## Development Workflow

### Prerequisites

- Node.js (Latest LTS recommended)
- Rust & Cargo (Latest stable)
- `wasm-pack` (`cargo install wasm-pack`)

### Key Commands

| Command                   | Description                                                                    |
| :------------------------ | :----------------------------------------------------------------------------- |
| `npm run dev`             | Starts the Vite development server.                                            |
| `npm run build`           | Builds the complete project (Wasm + Frontend) for production.                  |
| `npm run build:wasm`      | Compiles the Rust code to WebAssembly (required before `dev` if Wasm changes). |
| `npm run test`            | Runs the test suite using Vitest.                                              |
| `npm run test:all`        | Runs all test suites (Rust + TypeScript + Integration + Accuracy).             |
| `npm run test:unit`       | Runs only TypeScript unit tests.                                               |
| `npm run test:rust`       | Runs Rust tests only.                                                          |
| `npm run typecheck`       | Runs the TypeScript type checker.                                              |
| `npm run lint`            | Runs ESLint to check for code quality issues.                                  |
| `npm run format`          | Formats code using Prettier and Rustfmt.                                       |
| `npm run check`           | Runs all checks (typecheck + lint + format:check).                             |
| `npm run preview`         | Previews the production build locally.                                         |

### Building the Project

The build process is two-step:

1.  **Wasm Compilation:** Rust code in `src/wasm` is compiled to `src/wasm/pkg` using `wasm-pack`.
2.  **Frontend Bundling:** Vite bundles the SolidJS app and imports the Wasm module from `src/wasm/pkg`.

_Note: The `npm run build` command handles both steps sequentially._

## Cloud Storage

DataLens Profiler supports Google Cloud Storage (GCS) integration, allowing you to profile files directly from your cloud buckets without downloading them first.

For setup instructions and authentication configuration, see [GCS Setup Guide](docs/user-guides/gcs-setup.md).

## Documentation

- **[User Guide](USER_GUIDE.md):** Complete guide for using DataLens Profiler
- **[Architecture Decision Records](docs/architecture/):** Technical decisions and rationale
- **[User Guides](docs/user-guides/):** Setup guides and tutorials

## Conventions & Guidelines

- **Ticket-Driven:** Development follows the tickets defined in the `tickets/` directory. Refer to them for requirements and acceptance criteria.
- **State Management:** Use SolidJS primitives (`createSignal`, `createStore`) for local and global state.
- **Styling:** Utility-first CSS using Tailwind. Avoid writing custom CSS files unless necessary.
- **Wasm Interop:** Communication between JS and Rust should handle data types carefully using `serde-wasm-bindgen`. Heavy computation belongs in Rust; UI rendering belongs in SolidJS.
