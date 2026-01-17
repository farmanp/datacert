import { createStore } from 'solid-js/store';

interface EngineState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

const [state, setState] = createStore<EngineState>({
  isReady: false,
  isLoading: true,
  error: null,
});

let initPromise: Promise<void> | null = null;

const init = async () => {
  // If already ready or loading, don't restart
  if (state.isReady) return;
  if (initPromise) return initPromise;

  setState({ isLoading: true, error: null });

  initPromise = (async () => {
    try {
      // Import the WASM module
      const wasmModule = await import('../../wasm/pkg/datacert_wasm');
      // Initialize the WASM binary (default export loads the .wasm file)
      await wasmModule.default();
      // Call the init function
      wasmModule.init();

      setState({ isReady: true, isLoading: false });
    } catch (e) {
      console.error('Failed to load WASM', e);
      setState({
        isReady: false,
        isLoading: false,
        error: 'Failed to initialize the analysis engine. Please reload.',
      });
      throw e;
    }
  })();

  return initPromise;
};

export const engineStore = {
  state,
  init,
};
