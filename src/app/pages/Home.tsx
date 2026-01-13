import { Component, createSignal, onMount, Show } from 'solid-js';
import FileDropzone from '../components/FileDropzone';
import ProfileReport from '../components/ProfileReport';
import { profileStore } from '../stores/profileStore';

/**
 * Home Page Component
 *
 * The main landing page for DataLens Profiler.
 * Shows the Dropzone by default, and switch to ProfileReport when profiling is complete.
 */
const Home: Component = () => {
  const [wasmStatus, setWasmStatus] = createSignal('Loading WASM...');
  const [wasmReady, setWasmReady] = createSignal(false);

  const { store } = profileStore;

  onMount(async () => {
    try {
      // Import the WASM module
      const wasm = await import('../../wasm/pkg/datalens_wasm');
      wasm.init();
      setWasmStatus('WASM Ready');
      setWasmReady(true);
    } catch (e) {
      console.error('Failed to load WASM', e);
      setWasmStatus('WASM Failed to load');
      setWasmReady(false);
    }
  });

  return (
    <div class="min-h-screen bg-slate-900 text-white flex flex-col items-center">
      <Show
        when={store.results}
        fallback={
          <div class="w-full flex flex-col items-center p-4 sm:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <header class="text-center mb-8 sm:mb-12">
              <h1 class="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                DataLens Profiler
              </h1>
              <p class="text-slate-400 text-base sm:text-lg">
                High-Performance Data Profiling Engine
              </p>
            </header>

            {/* Main Content */}
            <main class="w-full max-w-4xl">
              {/* Status Card */}
              <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl mb-8">
                {/* WASM Status */}
                <div class="flex items-center space-x-3 mb-6">
                  <div
                    class={`h-3 w-3 rounded-full ${wasmReady() ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}
                  />
                  <span class="text-sm font-medium text-slate-300 uppercase tracking-wider">
                    {wasmStatus()}
                  </span>
                </div>

                {/* File Dropzone */}
                <section aria-labelledby="import-heading">
                  <h2 id="import-heading" class="text-xl font-bold text-slate-100 mb-4">
                    Import Your Data
                  </h2>
                  <FileDropzone />
                </section>
              </div>

              {/* Feature Cards */}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-colors group">
                  <div class="flex items-center space-x-3 mb-3">
                    <div class="p-2 bg-blue-500/20 rounded-lg">
                      <svg
                        class="w-6 h-6 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <h3 class="text-lg font-bold">Statistics</h3>
                  </div>
                  <p class="text-slate-400 text-sm">
                    Streaming computation of counts, distinct values (HLL), and numeric aggregates
                    in a single pass.
                  </p>
                </div>

                <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition-colors group">
                  <div class="flex items-center space-x-3 mb-3">
                    <div class="p-2 bg-emerald-500/20 rounded-lg">
                      <svg
                        class="w-6 h-6 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                        />
                      </svg>
                    </div>
                    <h3 class="text-lg font-bold">Local-First</h3>
                  </div>
                  <p class="text-slate-400 text-sm">
                    No data leaves your device. All processing happens in cross-compiled Rust via
                    WASM in your browser.
                  </p>
                </div>
              </div>
            </main>

            {/* Footer */}
            <footer class="mt-12 sm:mt-16 text-slate-500 text-sm text-center">
              <p>Built with SolidJS + Rust/WASM</p>
            </footer>
          </div>
        }
      >
        <ProfileReport />
      </Show>
    </div>
  );
};

export default Home;
