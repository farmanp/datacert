# DataCert CLI

This directory contains the source code for the DataCert Command Line Interface.

## Architecture

The CLI is a Node.js wrapper around the Core Engine (Rust/WebAssembly).

- `index.ts`: Entry point and command definition (using `commander`).
- `commands/`: Implementation of CLI commands.
- `utils/`: Shared utilities, including the WASM loader.
- `types.ts`: TypeScript definitions for CLI-specific structures.

### WASM Integration

Unlike the browser-based UI, which fetches the WASM binary over HTTP, the CLI loads the `.wasm` file directly from the filesystem using standard Node.js `fs` modules. See `utils/wasm-loader.ts` for implementation details.

## Development

### Building
The CLI has its own TypeScript configuration to ensure compatibility with Node.js modules.

```bash
npm run build:cli
```

This will:
1. Compile TypeScript to `dist/cli/`.
2. Copy the WASM binary from `src/wasm/pkg/` to the build directory.
3. Set executable permissions on the entry point.

### Running Tests
(TBD - Integration tests for the CLI will be added in `tests/integration/cli.test.ts`)

## Documentation
For user-facing documentation, see `docs/guides/cli.md`.
