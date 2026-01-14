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

  const wasmPath = path.resolve(__dirname, '../../wasm/pkg/datacert_wasm_bg.wasm');
  const wasmBuffer = fs.readFileSync(wasmPath);
  
  await init(wasmBuffer);
  initialized = true;
}

export { DataCertProfiler };
