import init, {
  DataCertProfiler,
  ParquetProfiler,
  JsonProfiler,
  AvroProfiler,
  RowExtractor,
  CorrelationCalculator,
} from '../../wasm/pkg/datacert_wasm';

let profiler: DataCertProfiler | ParquetProfiler | JsonProfiler | AvroProfiler | null = null;
let extractor: RowExtractor | null = null;
let mode: 'csv' | 'parquet' | 'json' | 'avro' = 'csv';

// Size threshold for large file mode (100MB)
// Files exceeding this size for Parquet/Avro will be routed to DuckDB
const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024; // 100MB

// Worker globals for buffering
interface ProfilerWorkerGlobals {
  parquetBuffer: Uint8Array[] | null;
  avroBuffer: Uint8Array[] | null;
  extractedRows: [number, string[]][] | null;
  totalBytesReceived: number;
  useLargeFileMode: boolean;
  startTime: number | null;
}

const workerGlobals: ProfilerWorkerGlobals = {
  parquetBuffer: null,
  avroBuffer: null,
  extractedRows: null,
  totalBytesReceived: 0,
  useLargeFileMode: false,
  startTime: null,
};

/**
 * Check memory pressure using performance.memory API (Chrome only)
 * Returns the memory usage ratio (0-1) or null if API not available
 */
function checkMemoryPressure(): { ratio: number; usedMB: number; limitMB: number } | null {
  // performance.memory is Chrome-specific
  const perf = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  if (perf.memory) {
    const usedMB = perf.memory.usedJSHeapSize / (1024 * 1024);
    const limitMB = perf.memory.jsHeapSizeLimit / (1024 * 1024);
    const ratio = usedMB / limitMB;
    return { ratio, usedMB, limitMB };
  }
  return null;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case 'init':
        await init();
        self.postMessage({ type: 'ready' });
        break;

      case 'start_profiling': {
        const { delimiter, hasHeaders, format, fileSize } = data;

        // Reset worker globals for new profiling session
        workerGlobals.totalBytesReceived = 0;
        workerGlobals.useLargeFileMode = false;
        workerGlobals.parquetBuffer = null;
        workerGlobals.avroBuffer = null;
        workerGlobals.startTime = performance.now();

        // Check if this is a large Parquet/Avro file that should use DuckDB
        const isLargeFile = fileSize && fileSize > LARGE_FILE_THRESHOLD_BYTES;
        const isBinaryFormat = format === 'parquet' || format === 'avro';

        if (isLargeFile && isBinaryFormat) {
          // Signal to main thread that this file should use DuckDB path
          workerGlobals.useLargeFileMode = true;
          self.postMessage({
            type: 'use_large_file_mode',
            format: format,
            fileSize: fileSize,
            threshold: LARGE_FILE_THRESHOLD_BYTES,
          });
          return; // Don't proceed with WASM profiler
        }

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
          profiler = new DataCertProfiler(delimiter, hasHeaders);
        }

        self.postMessage({ type: 'started' });
        break;
      }

      case 'process_chunk': {
        if (!profiler) throw new Error('Profiler not initialized');
        const chunk = new Uint8Array(data);

        // Track total bytes received
        workerGlobals.totalBytesReceived += chunk.byteLength;

        // Check memory pressure for binary formats that buffer
        if (mode === 'parquet' || mode === 'avro') {
          const memoryStatus = checkMemoryPressure();
          if (memoryStatus) {
            if (memoryStatus.ratio > 0.9) {
              // Critical memory pressure - abort to prevent OOM
              self.postMessage({
                type: 'memory_critical',
                usedMB: Math.round(memoryStatus.usedMB),
                limitMB: Math.round(memoryStatus.limitMB),
                ratio: memoryStatus.ratio,
              });
              throw new Error(
                `Memory pressure critical (${Math.round(memoryStatus.ratio * 100)}% used). ` +
                  `File too large for in-memory processing. Try using SQL Mode for large Parquet files.`,
              );
            } else if (memoryStatus.ratio > 0.8) {
              // High memory pressure - warn but continue
              self.postMessage({
                type: 'memory_warning',
                usedMB: Math.round(memoryStatus.usedMB),
                limitMB: Math.round(memoryStatus.limitMB),
                ratio: memoryStatus.ratio,
              });
            }
          }
        }

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
          parseResult = (profiler as DataCertProfiler).parse_and_profile_chunk(chunk);
          self.postMessage({ type: 'chunk_processed', result: parseResult });
        }
        break;
      }

      case 'finalize': {
        if (!profiler) throw new Error('Profiler not initialized');

        let finalStats;
        if (mode === 'parquet') {
          if (workerGlobals.parquetBuffer) {
            const totalLength = workerGlobals.parquetBuffer.reduce(
              (acc, val) => acc + val.length,
              0,
            );
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
          finalStats = (profiler as DataCertProfiler).finalize();
        }

        const durationSeconds = workerGlobals.startTime
          ? (performance.now() - workerGlobals.startTime) / 1000
          : 0;

        self.postMessage({
          type: 'final_stats',
          result: finalStats,
          performanceMetrics: {
            durationSeconds,
            fileSizeBytes: workerGlobals.totalBytesReceived,
          },
        });
        profiler = null;
        workerGlobals.startTime = null;
        break;
      }

      case 'detect_delimiter': {
        const detectProfiler = new DataCertProfiler(undefined, false);
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

      case 'compute_correlation': {
        const { headers, rows, numericColumnIndices } = data;
        const calculator = new CorrelationCalculator();
        calculator.set_headers(headers);
        calculator.set_numeric_columns(numericColumnIndices);
        calculator.add_rows(rows);
        const result = calculator.compute();
        self.postMessage({ type: 'correlation_computed', result });
        break;
      }

      case 'process_rows': {
        // Direct row profiling - bypasses File I/O for SQL query results
        const { rows, columnNames } = data as {
          rows: Record<string, unknown>[];
          columnNames: string[];
        };

        // Convert rows to CSV string
        const csvContent = [
          columnNames.join(','),
          ...rows.map((row) =>
            columnNames
              .map((col) => {
                const val = row[col];
                if (val === null || val === undefined) return '';
                const str = String(val);
                // Escape quotes and wrap in quotes if contains comma/newline/quote
                if (str.includes('"') || str.includes(',') || str.includes('\n')) {
                  return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
              })
              .join(','),
          ),
        ].join('\n');

        // Initialize CSV profiler with comma delimiter and headers
        mode = 'csv';
        profiler = new DataCertProfiler(44, true); // 44 = comma ASCII
        workerGlobals.startTime = performance.now();
        workerGlobals.totalBytesReceived = 0; // Reset for SQL rows

        // Process the CSV content
        const encoder = new TextEncoder();
        const bytes = encoder.encode(csvContent);
        (profiler as DataCertProfiler).parse_and_profile_chunk(bytes);

        // Finalize and return results
        const finalStats = (profiler as DataCertProfiler).finalize();

        const durationSeconds = workerGlobals.startTime
          ? (performance.now() - workerGlobals.startTime) / 1000
          : 0;

        self.postMessage({
          type: 'final_stats',
          result: finalStats,
          performanceMetrics: {
            durationSeconds,
            fileSizeBytes: bytes.byteLength, // In this mode, we use the generated CSV size
          },
        });
        profiler = null;
        workerGlobals.startTime = null;
        break;
      }

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
};
