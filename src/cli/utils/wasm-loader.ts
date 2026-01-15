import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import init, { DataCertProfiler } from '../../wasm/pkg/datacert_wasm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;

export async function loadWasm() {
  if (initialized) return;

  // After compilation, wasm-loader.js is at dist/cli/cli/utils/
  // WASM file is at dist/cli/wasm/pkg/
  // From cli/utils: .. -> cli, ../.. -> dist/cli, ../../wasm/pkg -> dist/cli/wasm/pkg
  const wasmPath = path.resolve(__dirname, '../../wasm/pkg/datacert_wasm_bg.wasm');
  const wasmBuffer = fs.readFileSync(wasmPath);

  await init(wasmBuffer);
  initialized = true;
}

export { DataCertProfiler };
