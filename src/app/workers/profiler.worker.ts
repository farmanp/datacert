import init, { DataLensProfiler, ParquetProfiler, JsonProfiler, AvroProfiler, RowExtractor } from '../../wasm/pkg/datalens_wasm';

let profiler: DataLensProfiler | ParquetProfiler | JsonProfiler | AvroProfiler | null = null;
let extractor: RowExtractor | null = null;
let mode: 'csv' | 'parquet' | 'json' | 'avro' = 'csv';

// Worker globals for buffering
interface ProfilerWorkerGlobals {
  parquetBuffer: Uint8Array[] | null;
  avroBuffer: Uint8Array[] | null;
  extractedRows: [number, string[]][] | null;
}

const workerGlobals: ProfilerWorkerGlobals = {
  parquetBuffer: null,
  avroBuffer: null,
  extractedRows: null
};

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
                    profiler = new JsonProfiler(undefined, undefined);
                } else if (format === 'avro') {
                    mode = 'avro';
                    profiler = new AvroProfiler();
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
                    if (!workerGlobals.parquetBuffer) {
                        workerGlobals.parquetBuffer = [];
                    }
                    workerGlobals.parquetBuffer.push(chunk);
                    self.postMessage({ type: 'chunk_processed', result: null });
                } else if (mode === 'avro') {
                    if (!workerGlobals.avroBuffer) {
                        workerGlobals.avroBuffer = [];
                    }
                    workerGlobals.avroBuffer.push(chunk);
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
                    if (workerGlobals.parquetBuffer) {
                        const totalLength = workerGlobals.parquetBuffer.reduce((acc, val) => acc + val.length, 0);
                        const fullBuffer = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const arr of workerGlobals.parquetBuffer) {
                            fullBuffer.set(arr, offset);
                            offset += arr.length;
                        }

                        finalStats = (profiler as ParquetProfiler).parse_and_profile(fullBuffer);
                        workerGlobals.parquetBuffer = null;
                    } else {
                        finalStats = null;
                    }
                } else if (mode === 'avro') {
                    if (workerGlobals.avroBuffer) {
                        const totalLength = workerGlobals.avroBuffer.reduce((acc, val) => acc + val.length, 0);
                        const fullBuffer = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const arr of workerGlobals.avroBuffer) {
                            fullBuffer.set(arr, offset);
                            offset += arr.length;
                        }

                        finalStats = (profiler as AvroProfiler).parse_and_profile(fullBuffer);
                        workerGlobals.avroBuffer = null;
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

            case 'init_extractor': {
                const { indices, delimiter, hasHeaders } = data;
                extractor = new RowExtractor(new Uint32Array(indices), delimiter, hasHeaders);
                self.postMessage({ type: 'extractor_ready' });
                break;
            }

            case 'extract_chunk': {
                if (!extractor) throw new Error('Extractor not initialized');
                const chunk = new Uint8Array(data);
                const matches = extractor.process_chunk(chunk) as [number, string[]][];
                if (!workerGlobals.extractedRows) workerGlobals.extractedRows = [];
                workerGlobals.extractedRows.push(...matches);
                self.postMessage({ type: 'extractor_chunk_processed' });
                break;
            }

            case 'finalize_extraction': {
                if (!extractor) throw new Error('Extractor not initialized');
                const finalMatches = extractor.flush() as [number, string[]][];
                if (!workerGlobals.extractedRows) workerGlobals.extractedRows = [];
                workerGlobals.extractedRows.push(...finalMatches);
                self.postMessage({ type: 'extraction_complete', result: workerGlobals.extractedRows });
                workerGlobals.extractedRows = null;
                extractor = null;
                break;
            }

            default:
                console.warn('Unknown message type:', type);
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: (error as Error).message });
    }
};
