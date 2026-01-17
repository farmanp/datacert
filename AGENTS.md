# Repository Guidelines

## Project Structure & Module Organization

- `src/app/`: SolidJS frontend (pages, components, stores, workers, utils).
- `src/wasm/`: Rust/WASM core engine (parsers, stats, quality, exports).
- `src/cli/`: Node CLI entry (`src/cli/index.ts`).
- `tests/`: Vitest unit/integration/accuracy suites.
- `e2e/`: Playwright end-to-end specs.
- `docs/` and `website/`: documentation sources (Docusaurus).
- `tickets/`: roadmap specs and task tracking.

## Build, Test, and Development Commands

- `npm run dev`: start Vite dev server for the web UI.
- `npm run build`: build WASM + production web bundle.
- `npm run build:wasm`: build Rust WASM module (`src/wasm`).
- `npm run build:cli`: build CLI bundle for npm distribution.
- `npm run test`: run the standard test suite via `scripts/test.sh`.
- `npm run test:unit|test:integration|test:accuracy`: run targeted Vitest suites.
- `npm run test:e2e`: run Playwright specs from `e2e/`.
- `npm run test:rust`: run Rust tests in `src/wasm`.
- `npm run lint`, `npm run format`, `npm run typecheck`: quality gates.

## Coding Style & Naming Conventions

- TypeScript/SolidJS: 2-space indentation, 100-char width, semicolons, trailing commas (Prettier).
- ESLint enforces SolidJS reactivity rules; avoid destructuring stores in reactive contexts.
- Rust: `cargo fmt` for formatting, `cargo clippy -D warnings` for linting.
- Test files: `*.test.ts` / `*.test.tsx` (Vitest), `e2e/*.spec.ts` (Playwright).

## Testing Guidelines

- Primary unit/integration framework: Vitest (jsdom).
- E2E: Playwright; config in `playwright.config.ts`.
- Rust tests live under `src/wasm`; run with `npm run test:rust`.
- Expect PRs to pass the full suite (`npm run test`) before merge.

## Commit & Pull Request Guidelines

- Commit messages follow a Conventional Commit style (`feat:`, `fix:`, `chore:`), using present tense.
- Reference issues when applicable (e.g., `fix: handle empty CSV (Fixes #123)`).
- PRs should include a clear description, linked issues, and screenshots for UI changes.

## Security & Configuration Tips

- Prerequisites: Node.js 18+, Rust stable, `wasm-pack` installed.
- Large files may switch to DuckDB/WASM paths automatically; validate memory-sensitive changes carefully.
