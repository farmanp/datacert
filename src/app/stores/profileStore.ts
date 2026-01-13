import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { fileStore } from './fileStore';
import { gcsStreamingService } from '../services/gcs-streaming.service';

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface Histogram {
  bins: HistogramBin[];
  min: number;
  max: number;
  bin_width: number;
}

export interface FreqEntry {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoricalStats {
  top_values: FreqEntry[];
  unique_count: number;
}

export interface ColumnProfile {
  name: string;
  base_stats: {
    count: number;
    missing: number;
    distinct_estimate: number;
    inferred_type: string;
  };
  numeric_stats: {
    min: number;
    max: number;
    mean: number;
    sum: number;
    count: number;
    std_dev: number;
    variance: number;
    skewness: number;
    kurtosis: number;
    median: number;
    p25: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  } | null;
  categorical_stats: CategoricalStats | null;
  histogram: Histogram | null;
  min_length: number | null;
  max_length: number | null;
  notes: string[];
  sample_values: string[];
}

export interface ProfileResult {
  column_profiles: ColumnProfile[];
  total_rows: number;
}

export interface ProfileStoreState {
  results: ProfileResult | null;
  isProfiling: boolean;
  error: string | null;
  progress: number;
  viewMode: 'table' | 'cards';
}

function createProfileStore() {
  const [store, setStore] = createStore<ProfileStoreState>({
    results: null,
    isProfiling: false,
    error: null,
    progress: 0,
    viewMode: 'table',
  });

  let worker: Worker | null = null;

  const startProfiling = () => {
    const fileInfo = fileStore.store.file;
    if (!fileInfo) return;

    setStore({
      isProfiling: true,
      error: null,
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
          worker?.postMessage({
            type: 'start_profiling',
            data: { delimiter: undefined, hasHeaders: true },
          });
          break;

        case 'started':
          processFile(fileInfo.file);
          break;

        case 'final_stats':
          setStore({
            results: result as ProfileResult,
            isProfiling: false,
            progress: 100,
          });
          worker?.terminate();
          break;

        case 'error':
          setStore({
            error,
            isProfiling: false,
          });
          worker?.terminate();
          break;
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
          error: null,
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
                  worker?.postMessage({
                      type: 'start_profiling',
                      data: { delimiter: undefined, hasHeaders: true },
                  });
                  break;
              case 'started':
                  processStream(stream, size);
                  break;
              case 'final_stats':
                  setStore({
                      results: result as ProfileResult,
                      isProfiling: false,
                      progress: 100,
                  });
                  worker?.terminate();
                  break;
              case 'error': {
                  const errMsg = error || 'Unknown worker error';
                  setStore({ error: errMsg, isProfiling: false });
                  fileStore.setError(errMsg);
                  worker?.terminate();
                  break;
              }
          }
      };
      
      worker.postMessage({ type: 'init' });

    } catch (err: any) {
       console.error('GCS Profile Error', err);
       fileStore.setError(err.message);
       setStore({ isProfiling: false, error: err.message });
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
          
      } catch (err: any) {
          console.error('Stream processing error', err);
          worker.postMessage({ type: 'error', error: err.message });
      } finally {
          reader.releaseLock();
      }
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

  const setViewMode = (mode: 'table' | 'cards') => {
    setStore('viewMode', mode);
  };

  const reset = () => {
    setStore({
      results: null,
      isProfiling: false,
      error: null,
      progress: 0,
      viewMode: 'table',
    });
    if (worker) {
      worker.terminate();
      worker = null;
    }
    fileStore.reset();
  };

  return {
    store,
    startProfiling,
    profileGCSUrl,
    setViewMode,
    reset,
  };
}

export const profileStore = createRoot(createProfileStore);
