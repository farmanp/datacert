import init, { DataLensProfiler } from '../../wasm/pkg/datalens_wasm';

let profiler: DataLensProfiler | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case 'init':
        await init();
        self.postMessage({ type: 'ready' });
        break;

      case 'start_profiling': {
        const { delimiter, hasHeaders } = data;
        profiler = new DataLensProfiler(delimiter, hasHeaders);
        self.postMessage({ type: 'started' });
        break;
      }

      case 'process_chunk': {
        if (!profiler) throw new Error('Profiler not initialized');
        const chunk = new Uint8Array(data);
        const parseResult = profiler.parse_and_profile_chunk(chunk);
        self.postMessage({ type: 'chunk_processed', result: parseResult });
        break;
      }

      case 'finalize': {
        if (!profiler) throw new Error('Profiler not initialized');
        const finalStats = profiler.finalize();
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

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
};
