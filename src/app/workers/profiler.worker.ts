import init, { DataLensProfiler, ParquetProfiler, JsonProfiler, CorrelationCalculator } from '../../wasm/pkg/datalens_wasm';

let profiler: DataLensProfiler | ParquetProfiler | JsonProfiler | null = null;
let mode: 'csv' | 'parquet' | 'json' = 'csv';
let correlationCalculator: CorrelationCalculator | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case 'init':
        await init();
        self.postMessage({ type: 'ready' });
        break;

      case 'start_profiling': {
        const { delimiter, hasHeaders, format } = data;
        
        if (format === 'parquet') {
            mode = 'parquet';
            profiler = new ParquetProfiler();
        } else if (format === 'json') {
            mode = 'json';
            // Use defaults for depth/keys
            profiler = new JsonProfiler(undefined, undefined); 
        } else {
            mode = 'csv';
            profiler = new DataLensProfiler(delimiter, hasHeaders);
        }
        
        self.postMessage({ type: 'started' });
        break;
      }

      case 'process_chunk': {
        if (!profiler) throw new Error('Profiler not initialized');
        const chunk = new Uint8Array(data);
        
        let parseResult;
        if (mode === 'parquet') {
            if (!self.parquetBuffer) {
                self.parquetBuffer = [];
            }
            self.parquetBuffer.push(chunk);
            self.postMessage({ type: 'chunk_processed', result: null });
        } else if (mode === 'json') {
            parseResult = (profiler as JsonProfiler).parse_and_profile_chunk(chunk);
            self.postMessage({ type: 'chunk_processed', result: parseResult });
        } else {
            parseResult = (profiler as DataLensProfiler).parse_and_profile_chunk(chunk);
            self.postMessage({ type: 'chunk_processed', result: parseResult });
        }
        break;
      }

      case 'finalize': {
        if (!profiler) throw new Error('Profiler not initialized');
        
        let finalStats;
        if (mode === 'parquet') {
            if (self.parquetBuffer) {
                const totalLength = self.parquetBuffer.reduce((acc: number, val: Uint8Array) => acc + val.length, 0);
                const fullBuffer = new Uint8Array(totalLength);
                let offset = 0;
                for (const arr of self.parquetBuffer) {
                    fullBuffer.set(arr, offset);
                    offset += arr.length;
                }
                
                finalStats = (profiler as ParquetProfiler).parse_and_profile(fullBuffer);
                self.parquetBuffer = null;
            } else {
                finalStats = null;
            }
        } else if (mode === 'json') {
            finalStats = (profiler as JsonProfiler).finalize();
        } else {
            finalStats = (profiler as DataLensProfiler).finalize();
        }
        
        self.postMessage({ type: 'final_stats', result: finalStats });
        profiler = null;
        break;
      }

      case 'detect_delimiter': {
        const detectProfiler = new DataLensProfiler(undefined, false);
        const detectChunk = new Uint8Array(data);
        const detected = detectProfiler.auto_detect_delimiter(detectChunk);
        self.postMessage({ type: 'delimiter_detected', delimiter: detected });
        break;
      }

      case 'compute_correlation': {
        // data should contain: { headers: string[], rows: string[][], numericColumnIndices: number[] }
        const { headers, rows, numericColumnIndices } = data;

        if (!correlationCalculator) {
          correlationCalculator = new CorrelationCalculator();
        } else {
          correlationCalculator.clear();
        }

        correlationCalculator.set_headers(headers);
        correlationCalculator.set_numeric_columns(numericColumnIndices);
        correlationCalculator.add_rows(rows);

        const correlationResult = correlationCalculator.compute();
        self.postMessage({ type: 'correlation_computed', result: correlationResult });
        break;
      }

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
};

// Add buffer to global scope for this worker instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any;
