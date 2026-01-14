import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { fileStore } from './fileStore';
import { gcsStreamingService } from '../services/gcs-streaming.service';
import type { ProfilerError } from '../types/errors';
import { createProfilerError, createTypedError } from '../types/errors';
import {
  initDuckDB,
  executeQuery,
  registerParquet,
  DuckDBError,
} from '../utils/duckdb';

// Re-export generated types for backwards compatibility
// Other files can continue importing from profileStore
export type {
  BaseStats,
  CategoricalStats,
  ColumnProfile,
  ColumnQualityMetrics,
  CorrelationMatrix,
  CorrelationMatrixResult,
  DataType,
  FreqEntry,
  Histogram,
  HistogramBin,
  NumericStats,
  ProfileResult,
  ProfilerResult,
  QualityIssue,
  Severity,
} from '../types/generated';

import type { ProfilerResult } from '../types/generated';

export interface ProfileStoreState {
  results: ProfilerResult | null;
  isProfiling: boolean;
  isCancelling: boolean;
  error: string | null;
  profilerError: ProfilerError | null;
  progress: number;
  viewMode: 'table' | 'cards' | 'validation';
  /** True when processing large binary files (>100MB Parquet/Avro) via DuckDB */
  largeFileMode: boolean;
  /** Memory warning message if memory pressure detected */
  memoryWarning: string | null;
}

function createProfileStore() {
  const [store, setStore] = createStore<ProfileStoreState>({
    results: null,
    isProfiling: false,
    isCancelling: false,
    error: null,
    profilerError: null,
    progress: 0,
    viewMode: 'table',
    largeFileMode: false,
    memoryWarning: null,
  });

  let worker: Worker | null = null;

  const startProfiling = () => {
    const fileInfo = fileStore.store.file;
    if (!fileInfo) return;

    setStore({
      isProfiling: true,
      isCancelling: false,
      error: null,
      profilerError: null,
      progress: 0,
      results: null,
      largeFileMode: false,
      memoryWarning: null,
    });

    worker = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e) => {
      const { type, result, error } = e.data;

      switch (type) {
        case 'ready': {
          const nameLower = fileInfo.name.toLowerCase();
          const isParquet = nameLower.endsWith('.parquet');
          const isJson = nameLower.endsWith('.json') || nameLower.endsWith('.jsonl');
          const isExcel = nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls');

          if (isExcel) {
            if (fileInfo.file) {
              processExcel(fileInfo.file);
            }
            return; // Handled by Excel pipeline
          }

          let format = 'csv';
          if (isParquet) format = 'parquet';
          else if (isJson) format = 'json';
          else if (nameLower.endsWith('.avro')) format = 'avro';

          worker?.postMessage({
            type: 'start_profiling',
            data: {
              delimiter: undefined,
              hasHeaders: true,
              format: format,
              fileSize: fileInfo.size, // Pass file size for large file detection
            },
          });
          break;
        }

        case 'use_large_file_mode': {
          // Worker detected large binary file - switch to DuckDB path
          setStore('largeFileMode', true);
          setStore('progress', 10);
          worker?.terminate();
          worker = null;

          // Route to DuckDB profiling
          if (fileInfo.file) {
            profileLargeFileWithDuckDB(fileInfo.file, e.data.format);
          }
          break;
        }

        case 'memory_warning': {
          const { usedMB, limitMB, ratio } = e.data;
          setStore(
            'memoryWarning',
            `High memory usage: ${usedMB}MB / ${limitMB}MB (${Math.round(ratio * 100)}%)`
          );
          break;
        }

        case 'memory_critical': {
          // Memory is critically high - error will be thrown by worker
          const { usedMB, limitMB } = e.data;
          setStore(
            'memoryWarning',
            `Critical memory: ${usedMB}MB / ${limitMB}MB - Consider using SQL Mode`
          );
          break;
        }

        case 'started':
          if (fileInfo.file) {
            processFile(fileInfo.file);
          }
          break;

        case 'final_stats':
          setStore({
            results: result as ProfilerResult,
            isProfiling: false,
            progress: 100,
            largeFileMode: false,
          });
          worker?.terminate();
          break;

        case 'error': {
          const profilerError = createProfilerError(error || 'Unknown error');
          setStore({
            error,
            profilerError,
            isProfiling: false,
            largeFileMode: false,
          });
          worker?.terminate();
          break;
        }
      }
    };

    worker.postMessage({ type: 'init' });
  };

  const profileGCSUrl = async (url: string) => {
    try {
      fileStore.store.state = 'processing';
      fileStore.store.progress = 0;

      const { stream, size, name } = await gcsStreamingService.getFileStream(url, (_bytes, _total) => {
        // Update download progress if we want to show it separately? 
        // For now, we combine download + processing into one progress bar in the UI
        // But here we can't easily distinguish download speed vs processing speed unless we pipe.
        // The fetch stream yields chunks as they download.
      });

      // Update file store with metadata
      fileStore.setRemoteFile(name, size, url);

      setStore({
        isProfiling: true,
        isCancelling: false,
        error: null,
        profilerError: null,
        progress: 0,
        results: null,
      });

      worker = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e) => {
        const { type, result, error } = e.data;
        switch (type) {
          case 'ready': {
            const nameLower = name.toLowerCase();
            const isParquet = nameLower.endsWith('.parquet');
            const isJson = nameLower.endsWith('.json') || nameLower.endsWith('.jsonl');

            let format = 'csv';
            if (isParquet) format = 'parquet';
            else if (isJson) format = 'json';
            else if (nameLower.endsWith('.avro')) format = 'avro';

            worker?.postMessage({
              type: 'start_profiling',
              data: {
                delimiter: undefined,
                hasHeaders: true,
                format: format
              },
            });
            break;
          }
          case 'started':
            processStream(stream, size);
            break;
          case 'final_stats':
            setStore({
              results: result as ProfilerResult,
              isProfiling: false,
              progress: 100,
            });
            worker?.terminate();
            break;
          case 'error': {
            const errMsg = error || 'Unknown worker error';
            const profilerError = createProfilerError(errMsg);
            setStore({ error: errMsg, profilerError, isProfiling: false });
            fileStore.setError(errMsg);
            worker?.terminate();
            break;
          }
        }
      };

      worker.postMessage({ type: 'init' });
    } catch (err: unknown) {
      const error = err as Error;
      const profilerError = createTypedError('NETWORK_ERROR', error.message);
      fileStore.setError(error.message);
      setStore({ isProfiling: false, error: error.message, profilerError });
    }
  };

  const processStream = async (stream: ReadableStream<Uint8Array>, totalSize: number) => {
    if (!worker) return;

    const reader = stream.getReader();
    let processedBytes = 0;

    try {
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        const value = result.value;
        if (done) break;

        if (value) {
          // value is Uint8Array
          // We need to transfer it to worker
          // Note: value.buffer might be larger than value.byteLength if it's a view
          // slice it to ensure we send only the data
          const buffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);

          worker.postMessage({
            type: 'process_chunk',
            data: buffer
          }, [buffer]);

          processedBytes += value.byteLength;
          const progress = totalSize > 0 ? Math.round((processedBytes / totalSize) * 100) : 0;
          setStore('progress', Math.min(progress, 99));
          fileStore.setProgress(progress);
        }
      }

      worker.postMessage({ type: 'finalize' });

    } catch (err: unknown) {
      const error = err as Error;
      worker.postMessage({ type: 'error', error: error.message });
    } finally {
      reader.releaseLock();
    }
  };

  let excelWorker: Worker | null = null;

  const processExcel = async (file: File) => {
    if (!excelWorker) {
      excelWorker = new Worker(new URL('../workers/excel.worker.ts', import.meta.url), { type: 'module' });
    }

    setStore('progress', 10);
    const buffer = await file.arrayBuffer();

    excelWorker.onmessage = (e) => {
      const { type, sheetNames, headers, rows } = e.data;

      if (type === 'workbook_parsed') {
        fileStore.setSheets(sheetNames);
        if (sheetNames.length === 1) {
          fileStore.setSelectedSheet(sheetNames[0]);
          excelWorker?.postMessage({
            type: 'parse_sheet',
            data: { workbookBuffer: buffer, selectedSheet: sheetNames[0] }
          });
        } else if (fileStore.store.selectedSheet) {
          // Already selected (e.g. user switched sheet)
          excelWorker?.postMessage({
            type: 'parse_sheet',
            data: { workbookBuffer: buffer, selectedSheet: fileStore.store.selectedSheet }
          });
        } else {
          // Waiting for user selection
          setStore({ isProfiling: false });
          fileStore.store.state = 'success'; // Show selector
        }
      } else if (type === 'sheet_processed') {
        // Convert rows to CSV string
        // This is a simple CSV generation for internal consumption
        // headers: string[], rows: string[][]
        // We must escape quotes and wrap in quotes if contains comma/newline
        const escape = (val: string) => {
          if (val.includes('"') || val.includes(',') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };

        const csvContent = [
          headers.map(escape).join(','),
          ...rows.map((row: string[]) => row.map(escape).join(','))
        ].join('\n');

        setStore({ isProfiling: true, progress: 50 });

        if (!worker) {
          worker = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = (ev) => {
            const { type: wType, result, error } = ev.data;
            if (wType === 'ready') {
              worker?.postMessage({
                type: 'start_profiling',
                data: { delimiter: 44, hasHeaders: true, format: 'csv' },
              });
            } else if (wType === 'started') {
              const encoder = new TextEncoder();
              const bytes = encoder.encode(csvContent);
              worker?.postMessage({ type: 'process_chunk', data: bytes }, [bytes.buffer]);
              worker?.postMessage({ type: 'finalize' });
            } else if (wType === 'final_stats') {
              setStore({ results: result as ProfilerResult, isProfiling: false, progress: 100 });
              worker?.terminate();
              worker = null;
            } else if (wType === 'error') {
              const profilerError = createProfilerError(error || 'Unknown error');
              setStore({ error, profilerError, isProfiling: false });
              fileStore.setError(error);
            }
          };
          worker.postMessage({ type: 'init' });
        }
      } else if (type === 'error') {
        const profilerError = createProfilerError(e.data.error || 'Excel processing failed');
        setStore({ error: e.data.error, profilerError, isProfiling: false });
        fileStore.setError(e.data.error);
      }
    };

    excelWorker.postMessage({ type: 'parse_workbook', data: buffer }, [buffer]); // Transfer buffer
  };

  const processFile = async (file: File) => {
    if (!worker) return;

    const CHUNK_SIZE = 64 * 1024; // 64KB
    let offset = 0;
    const totalSize = file.size;

    while (offset < totalSize) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunk.arrayBuffer();

      worker.postMessage(
        {
          type: 'process_chunk',
          data: buffer,
        },
        [buffer],
      );

      offset += CHUNK_SIZE;
      const progress = Math.round((offset / totalSize) * 100);
      setStore('progress', Math.min(progress, 99));
      fileStore.setProgress(progress);
    }

    worker.postMessage({ type: 'finalize' });
  };

  const selectSheet = (sheetName: string) => {
    if (!excelWorker) return;

    fileStore.setSelectedSheet(sheetName);
    setStore({ isProfiling: true, progress: 20 });

    // We rely on worker cache, so no buffer needed
    excelWorker.postMessage({
      type: 'parse_sheet',
      data: { selectedSheet: sheetName }
    });
  };

  /**
   * Profile rows directly from SQL query results.
   * This bypasses the File I/O path (DuckDB -> CSV File -> chunks) and instead
   * sends rows directly to the worker for profiling.
   *
   * Data flow: DuckDB JS objects -> Worker -> CSV in WASM -> Profile
   * vs old flow: DuckDB -> JS objects -> CSV string -> File blob -> Uint8Array chunks -> CSV parser
   *
   * @param rows - Array of row objects from SQL query results
   * @param columnNames - Array of column names in order
   */
  const profileFromRows = (rows: Record<string, unknown>[], columnNames: string[]) => {
    if (!rows || rows.length === 0) return;

    setStore({
      isProfiling: true,
      isCancelling: false,
      error: null,
      profilerError: null,
      progress: 0,
      results: null,
    });

    worker = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e) => {
      const { type, result, error } = e.data;

      switch (type) {
        case 'ready':
          // Worker is initialized, send rows directly
          setStore('progress', 50);
          worker?.postMessage({
            type: 'process_rows',
            data: { rows, columnNames },
          });
          break;

        case 'final_stats':
          setStore({
            results: result as ProfilerResult,
            isProfiling: false,
            progress: 100,
          });
          worker?.terminate();
          worker = null;
          break;

        case 'error': {
          const profilerError = createProfilerError(error || 'Unknown error');
          setStore({
            error,
            profilerError,
            isProfiling: false,
          });
          worker?.terminate();
          worker = null;
          break;
        }
      }
    };

    worker.postMessage({ type: 'init' });
  };

  /**
   * Profile large Parquet/Avro files using DuckDB-WASM.
   * This path is used when files exceed 100MB to avoid OOM in the WASM profiler.
   * DuckDB handles large Parquet files efficiently with columnar reads.
   *
   * @param file - The File object to profile
   * @param format - The file format ('parquet' or 'avro')
   */
  const profileLargeFileWithDuckDB = async (file: File, format: string) => {
    try {
      setStore('progress', 20);

      // Initialize DuckDB (lazy-loaded, singleton)
      await initDuckDB();
      setStore('progress', 40);

      // Register the file with DuckDB
      const tableName = 'large_file_data';
      const fileName = `${tableName}.${format}`;

      // For Parquet, use registerParquet
      if (format === 'parquet') {
        await registerParquet(fileName, file);
      } else {
        // For Avro, we need to fall back to error since DuckDB doesn't support Avro natively
        throw new Error(
          'Large Avro files are not yet supported. Consider converting to Parquet format.'
        );
      }

      setStore('progress', 50);

      // Create table from the registered file
      await executeQuery(`DROP TABLE IF EXISTS ${tableName}`);
      await executeQuery(
        `CREATE TABLE ${tableName} AS SELECT * FROM read_parquet('${fileName}')`
      );

      setStore('progress', 60);

      // Get column information
      const schemaResult = await executeQuery<{ column_name: string; column_type: string }>(
        `DESCRIBE ${tableName}`
      );

      // Get total row count
      const countResult = await executeQuery<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM ${tableName}`);
      const totalRows = parseInt(countResult.rows[0]?.cnt || '0', 10);

      setStore('progress', 70);

      // Generate profile statistics for each column using SQL
      const columnProfiles = await Promise.all(
        schemaResult.rows.map(async (col) => {
          const colName = col.column_name;
          const colType = col.column_type.toUpperCase();
          const quotedCol = `"${colName}"`;

          // Base stats query
          const baseStatsQuery = `
            SELECT
              COUNT(*) as total_count,
              COUNT(${quotedCol}) as non_null_count,
              COUNT(*) - COUNT(${quotedCol}) as missing_count,
              COUNT(DISTINCT ${quotedCol}) as distinct_count
            FROM ${tableName}
          `;

          const baseStats = await executeQuery<{
            total_count: string;
            non_null_count: string;
            missing_count: string;
            distinct_count: string;
          }>(baseStatsQuery);

          const totalCount = parseInt(baseStats.rows[0]?.total_count || '0', 10);
          const missingCount = parseInt(baseStats.rows[0]?.missing_count || '0', 10);
          const distinctCount = parseInt(baseStats.rows[0]?.distinct_count || '0', 10);

          // Determine if numeric type
          const isNumeric =
            colType.includes('INT') ||
            colType.includes('FLOAT') ||
            colType.includes('DOUBLE') ||
            colType.includes('DECIMAL') ||
            colType.includes('NUMERIC') ||
            colType.includes('REAL') ||
            colType.includes('BIGINT') ||
            colType.includes('SMALLINT') ||
            colType.includes('TINYINT');

          let numericStats = null;
          let categoricalStats = null;
          let histogram = null;
          let inferredType: 'Integer' | 'Numeric' | 'String' | 'Boolean' | 'Date' = 'String';

          if (isNumeric) {
            inferredType = colType.includes('INT') ? 'Integer' : 'Numeric';

            // Numeric stats query
            const numericQuery = `
              SELECT
                MIN(${quotedCol}) as min_val,
                MAX(${quotedCol}) as max_val,
                AVG(${quotedCol}) as mean_val,
                SUM(${quotedCol}) as sum_val,
                STDDEV_POP(${quotedCol}) as std_dev,
                VAR_POP(${quotedCol}) as variance,
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${quotedCol}) as p25,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${quotedCol}) as median,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${quotedCol}) as p75,
                PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY ${quotedCol}) as p90,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${quotedCol}) as p95,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${quotedCol}) as p99
              FROM ${tableName}
              WHERE ${quotedCol} IS NOT NULL
            `;

            const numStats = await executeQuery<{
              min_val: string;
              max_val: string;
              mean_val: string;
              sum_val: string;
              std_dev: string;
              variance: string;
              p25: string;
              median: string;
              p75: string;
              p90: string;
              p95: string;
              p99: string;
            }>(numericQuery);

            const row = numStats.rows[0];
            if (row) {
              const minVal = parseFloat(row.min_val || '0');
              const maxVal = parseFloat(row.max_val || '0');

              numericStats = {
                min: minVal,
                max: maxVal,
                mean: parseFloat(row.mean_val || '0'),
                sum: parseFloat(row.sum_val || '0'),
                count: totalCount - missingCount,
                std_dev: parseFloat(row.std_dev || '0'),
                variance: parseFloat(row.variance || '0'),
                skewness: 0, // DuckDB doesn't have built-in skewness
                kurtosis: 0, // DuckDB doesn't have built-in kurtosis
                median: parseFloat(row.median || '0'),
                p25: parseFloat(row.p25 || '0'),
                p75: parseFloat(row.p75 || '0'),
                p90: parseFloat(row.p90 || '0'),
                p95: parseFloat(row.p95 || '0'),
                p99: parseFloat(row.p99 || '0'),
              };

              // Generate histogram bins
              const range = maxVal - minVal;
              const binCount = 10;
              const binWidth = range / binCount || 1;

              const histogramQuery = `
                SELECT
                  FLOOR((${quotedCol} - ${minVal}) / ${binWidth}) as bin_idx,
                  COUNT(*) as bin_count
                FROM ${tableName}
                WHERE ${quotedCol} IS NOT NULL
                GROUP BY bin_idx
                ORDER BY bin_idx
              `;

              const histResult = await executeQuery<{ bin_idx: string; bin_count: string }>(
                histogramQuery
              );

              const bins = [];
              for (let i = 0; i < binCount; i++) {
                const binStart = minVal + i * binWidth;
                const binEnd = minVal + (i + 1) * binWidth;
                const found = histResult.rows.find(
                  (r) => parseInt(r.bin_idx || '0', 10) === i
                );
                bins.push({
                  start: binStart,
                  end: binEnd,
                  count: found ? parseInt(found.bin_count || '0', 10) : 0,
                });
              }

              histogram = {
                bins,
                min: minVal,
                max: maxVal,
                bin_width: binWidth,
              };
            }
          } else {
            // Categorical stats - get top values
            if (colType.includes('BOOL')) {
              inferredType = 'Boolean';
            } else if (colType.includes('DATE') || colType.includes('TIME')) {
              inferredType = 'Date';
            }

            const topValuesQuery = `
              SELECT
                CAST(${quotedCol} AS VARCHAR) as value,
                COUNT(*) as count
              FROM ${tableName}
              WHERE ${quotedCol} IS NOT NULL
              GROUP BY ${quotedCol}
              ORDER BY count DESC
              LIMIT 10
            `;

            const topValues = await executeQuery<{ value: string; count: string }>(topValuesQuery);
            const totalNonNull = totalCount - missingCount;

            categoricalStats = {
              top_values: topValues.rows.map((row) => ({
                value: row.value || '',
                count: parseInt(row.count || '0', 10),
                percentage:
                  totalNonNull > 0
                    ? (parseInt(row.count || '0', 10) / totalNonNull) * 100
                    : 0,
              })),
              unique_count: distinctCount,
            };
          }

          // Build column profile
          return {
            name: colName,
            base_stats: {
              count: totalCount,
              missing: missingCount,
              distinct_estimate: distinctCount,
              inferred_type: inferredType,
            },
            numeric_stats: numericStats,
            categorical_stats: categoricalStats,
            histogram: histogram,
            min_length: null,
            max_length: null,
            notes: ['Profiled via DuckDB (large file mode)'],
            quality_metrics: null,
            integer_count: inferredType === 'Integer' ? totalCount - missingCount : 0,
            numeric_count: inferredType === 'Numeric' ? totalCount - missingCount : 0,
            boolean_count: inferredType === 'Boolean' ? totalCount - missingCount : 0,
            date_count: inferredType === 'Date' ? totalCount - missingCount : 0,
            total_valid: totalCount - missingCount,
            sample_values: [],
            missing_rows: [],
            pii_rows: [],
            outlier_rows: [],
          };
        })
      );

      setStore('progress', 95);

      // Clean up the temporary table
      await executeQuery(`DROP TABLE IF EXISTS ${tableName}`);

      // Build the final result
      const profilerResult: ProfilerResult = {
        column_profiles: columnProfiles,
        total_rows: totalRows,
        duplicate_issues: [],
        avro_schema: null,
      };

      setStore({
        results: profilerResult,
        isProfiling: false,
        progress: 100,
        largeFileMode: false,
      });

      fileStore.setProgress(100);
    } catch (err: unknown) {
      const error = err as Error;
      const isDuckDBError = err instanceof DuckDBError;
      const profilerError = createProfilerError(
        isDuckDBError
          ? `DuckDB Error: ${error.message}`
          : `Large file profiling failed: ${error.message}`
      );

      setStore({
        error: error.message,
        profilerError,
        isProfiling: false,
        largeFileMode: false,
      });

      fileStore.setError(error.message);
    }
  };

  const setViewMode = (mode: 'table' | 'cards' | 'validation') => {
    setStore('viewMode', mode);
  };

  const reset = () => {
    setStore({
      results: null,
      isProfiling: false,
      isCancelling: false,
      error: null,
      profilerError: null,
      progress: 0,
      viewMode: 'table',
      largeFileMode: false,
      memoryWarning: null,
    });
    if (worker) {
      worker.terminate();
      worker = null;
    }
    fileStore.reset();
  };

  /**
   * Cancels the current profiling operation.
   * Terminates the worker and resets state so user can upload a new file.
   */
  const cancelProfiling = () => {
    if (!store.isProfiling) return;

    // Show cancelling state briefly
    setStore('isCancelling', true);

    // Terminate worker immediately
    if (worker) {
      worker.terminate();
      worker = null;
    }

    // Brief delay to show "Cancelling..." state, then reset
    setTimeout(() => {
      setStore({
        results: null,
        isProfiling: false,
        isCancelling: false,
        error: null,
        profilerError: null,
        progress: 0,
        largeFileMode: false,
        memoryWarning: null,
      });
      fileStore.reset();
    }, 300);
  };

  const profileRemoteUrl = async (url: string) => {
    try {
      fileStore.store.state = 'processing';
      fileStore.store.progress = 0;

      const { stream, size, name } = await gcsStreamingService.getFileStream(url);

      // Update file store with metadata
      fileStore.setRemoteFile(name, size, url);

      setStore({
        isProfiling: true,
        isCancelling: false,
        error: null,
        profilerError: null,
        progress: 0,
        results: null,
      });

      worker = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e) => {
        const { type, result, error } = e.data;
        switch (type) {
          case 'ready': {
            const nameLower = name.toLowerCase();
            const isParquet = nameLower.endsWith('.parquet');
            const isJson = nameLower.endsWith('.json') || nameLower.endsWith('.jsonl');

            let format = 'csv';
            if (isParquet) format = 'parquet';
            else if (isJson) format = 'json';
            else if (nameLower.endsWith('.avro')) format = 'avro';

            worker?.postMessage({
              type: 'start_profiling',
              data: {
                delimiter: undefined,
                hasHeaders: true,
                format: format
              },
            });
            break;
          }
          case 'started':
            processStream(stream, size);
            break;
          case 'final_stats':
            setStore({
              results: result as ProfilerResult,
              isProfiling: false,
              progress: 100,
            });
            worker?.terminate();
            break;
          case 'error': {
            const errMsg = error || 'Unknown worker error';
            const profilerError = createProfilerError(errMsg);
            setStore({ error: errMsg, profilerError, isProfiling: false });
            fileStore.setError(errMsg);
            worker?.terminate();
            break;
          }
        }
      };

      worker.postMessage({ type: 'init' });
    } catch (err: unknown) {
      const error = err as Error;
      const profilerError = createTypedError('NETWORK_ERROR', error.message);
      fileStore.setError(error.message);
      setStore({ isProfiling: false, error: error.message, profilerError });
    }
  };

  return {
    store,
    startProfiling,
    profileFromRows,
    profileGCSUrl,
    profileRemoteUrl,
    processExcel,
    selectSheet,
    setViewMode,
    reset,
    cancelProfiling,
  };
}

export const profileStore = createRoot(createProfileStore);
