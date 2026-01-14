import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { fileStore } from './fileStore';
import { gcsStreamingService } from '../services/gcs-streaming.service';
import type { ProfilerError } from '../types/errors';
import { createProfilerError, createTypedError } from '../types/errors';

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
              format: format
            },
          });
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
          });
          worker?.terminate();
          break;

        case 'error': {
          const profilerError = createProfilerError(error || 'Unknown error');
          setStore({
            error,
            profilerError,
            isProfiling: false,
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
