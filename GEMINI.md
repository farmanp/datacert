# DataLens Profiler

## Project Overview

**DataLens Profiler** is a high-performance, browser-based Progressive Web Application (PWA) for data profiling. It analyzes datasets (starting with CSV) to provide statistical summaries, quality metrics, and visualizations without data ever leaving the user's device.

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

## Directory Structure

- **`src/app/`**: SolidJS frontend application code.
  - `components/`: Reusable UI components.
  - `pages/`: Application views/routes.
  - `stores/`: State management (SolidJS signals/stores).
  - `workers/`: Web Workers for off-loading heavy tasks.
- **`src/wasm/`**: Rust source code for the data profiling engine.
  - `src/parser/`: CSV/Data parsing logic.
  - `src/stats/`: Statistical analysis modules.
- **`docs/architecture/`**: Architecture Decision Records (ADRs) and design documentation.
- **`tickets/`**: Documentation of features and tasks (Agile/Jira-style tickets).

## Development Workflow

### Prerequisites

- Node.js (Latest LTS recommended)
- Rust & Cargo (Latest stable)
- `wasm-pack` (`cargo install wasm-pack`)

### Key Commands

| Command              | Description                                                                    |
| :------------------- | :----------------------------------------------------------------------------- |
| `npm run dev`        | Starts the Vite development server.                                            |
| `npm run build`      | Builds the complete project (Wasm + Frontend) for production.                  |
| `npm run build:wasm` | Compiles the Rust code to WebAssembly (required before `dev` if Wasm changes). |
| `npm run test`       | Runs the test suite using Vitest.                                              |
| `npm run lint`       | Runs ESLint to check for code quality issues.                                  |
| `npm run preview`    | Previews the production build locally.                                         |

### Building the Project

The build process is two-step:

1.  **Wasm Compilation:** Rust code in `src/wasm` is compiled to `src/wasm/pkg` using `wasm-pack`.
2.  **Frontend Bundling:** Vite bundles the SolidJS app and imports the Wasm module from `src/wasm/pkg`.

_Note: The `npm run build` command handles both steps sequentially._

## Conventions & Guidelines

- **Ticket-Driven:** Development follows the tickets defined in the `tickets/` directory. Refer to them for requirements and acceptance criteria.
- **State Management:** Use SolidJS primitives (`createSignal`, `createStore`) for local and global state.
- **Styling:** Utility-first CSS using Tailwind. Avoid writing custom CSS files unless necessary.
- **Wasm Interop:** Communication between JS and Rust should handle data types carefully using `serde-wasm-bindgen`. Heavy computation belongs in Rust; UI rendering belongs in SolidJS.
