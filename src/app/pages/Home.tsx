import { Component, createSignal, onMount, Show } from 'solid-js';
import { A } from '@solidjs/router';
import FileDropzone from '../components/FileDropzone';
import ProfileReport from '../components/ProfileReport';
import GCSAuthButton from '../components/GCSAuthButton';
import GCSUrlInput from '../components/GCSUrlInput';
import ErrorDisplay from '../components/ErrorDisplay';
import SheetSelector from '../components/SheetSelector';
import { profileStore } from '../stores/profileStore';
import { fileStore } from '../stores/fileStore';
import { authStore } from '../stores/auth.store';
import { AnomalyDrilldown } from '../components/AnomalyDrilldown';

/**
 * Home Page Component
 *
 * The main landing page for DataCert.
 * Shows the Dropzone by default, and switch to ProfileReport when profiling is complete.
 */
const Home: Component = () => {
  const [wasmStatus, setWasmStatus] = createSignal('Loading WASM...');
  const [wasmReady, setWasmReady] = createSignal(false);

  const { store } = profileStore;

  onMount(async () => {
    authStore.init();
    try {
      // Import the WASM module
      const wasmModule = await import('../../wasm/pkg/datacert_wasm');
      // Initialize the WASM binary (default export loads the .wasm file)
      await wasmModule.default();
      // Call the init function
      wasmModule.init();
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
      <AnomalyDrilldown />
      <Show
        when={store.results}
        fallback={
          <div class="w-full flex flex-col items-center p-4 sm:p-8 animate-in fade-in duration-500 relative">
            {/* Top Right Auth Button */}
            <div class="absolute top-4 right-4 sm:top-8 sm:right-8 z-20">
              <GCSAuthButton />
            </div>

            {/* Header */}
            <header class="text-center mb-8 sm:mb-12 w-full max-w-4xl">
              <h1 class="text-4xl sm:text-7xl font-extrabold font-heading bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-3 tracking-tighter">
                DataCert
              </h1>
              <p class="text-slate-400 text-lg sm:text-xl font-medium tracking-tight max-w-2xl mx-auto leading-relaxed">
                Your local-first data quality certification toolkit. Profile. Query. Convert.
              </p>
            </header>

            {/* Main Content */}
            <main class="w-full max-w-4xl">
              {/* Status Card */}
              <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl mb-8">
                {/* WASM Status */}
                <div class="flex items-center space-x-3 mb-6">
                  <div
                    class={`h-3 w-3 rounded-full ${wasmReady() ? 'bg-emerald-500' : 'bg-amber-500'}`}
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

                  {/* Profiling Error Display */}
                  <Show when={!store.isProfiling && fileStore.store.state !== 'error' && store.profilerError}>
                    {(profilerError) => (
                      <div class="mb-6">
                        <ErrorDisplay
                          error={profilerError()}
                          onRetry={() => {
                            profileStore.reset();
                          }}
                          onUploadDifferent={() => {
                            profileStore.reset();
                          }}
                          onReauthenticate={() => {
                            authStore.logout();
                            profileStore.reset();
                          }}
                        />
                      </div>
                    )}
                  </Show>

                  <FileDropzone />

                  <div class="mt-4 flex items-center justify-center gap-2">
                    <span class="h-px w-12 bg-slate-700" />
                    <span class="text-xs text-slate-400 font-medium uppercase tracking-widest">or</span>
                    <span class="h-px w-12 bg-slate-700" />
                  </div>

                  <div class="mt-4 text-center">
                    <button
                      onClick={async () => {
                        const file = await fileStore.loadDemoFile();
                        if (file) {
                          profileStore.startProfiling();
                        }
                      }}
                      disabled={fileStore.store.state === 'processing'}
                      class="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                      <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Try with Sample Data
                    </button>
                  </div>

                  {/* GCS Input */}
                  <GCSUrlInput />

                  {/* Sheet Selector for Excel */}
                  <Show when={fileStore.store.sheets.length > 1}>
                    <div class="mt-6 flex justify-center w-full animate-in fade-in slide-in-from-top-2 duration-300">
                      <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 w-full max-w-sm shadow-xl">
                        <SheetSelector
                          sheets={fileStore.store.sheets}
                          selectedSheet={fileStore.store.selectedSheet}
                          onSelect={(sheet) => profileStore.selectSheet(sheet)}
                        />
                      </div>
                    </div>
                  </Show>
                </section>
              </div>

              {/* Feature Cards */}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                    <h3 class="text-lg font-bold font-heading tracking-tight">Statistics</h3>
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
                    <h3 class="text-lg font-bold font-heading tracking-tight">Local-First</h3>
                  </div>
                  <p class="text-slate-400 text-sm">
                    No data leaves your device. All processing happens in cross-compiled Rust via
                    WASM in your browser.
                  </p>
                </div>

                <A
                  href="/compare"
                  class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-colors group cursor-pointer block"
                >
                  <div class="flex items-center space-x-3 mb-3">
                    <div class="p-2 bg-purple-500/20 rounded-lg">
                      <svg
                        class="w-6 h-6 text-purple-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                    </div>
                    <h3 class="text-lg font-bold font-heading tracking-tight">Compare Mode</h3>
                  </div>
                  <p class="text-slate-400 text-sm">
                    Compare two datasets side-by-side to detect schema drift and statistical
                    changes between versions.
                  </p>
                </A>

                <A
                  href="/batch"
                  class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-colors group cursor-pointer block"
                >
                  <div class="flex items-center space-x-3 mb-3">
                    <div class="p-2 bg-amber-500/20 rounded-lg">
                      <svg
                        class="w-6 h-6 text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <h3 class="text-lg font-bold font-heading tracking-tight">Batch Mode</h3>
                  </div>
                  <p class="text-slate-400 text-sm">
                    Process multiple files at once with sequential profiling, merging, or N-way
                    comparison modes.
                  </p>
                </A>

                <A
                  href="/sql-mode"
                  class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-colors group cursor-pointer block"
                >
                  <div class="flex items-center space-x-3 mb-3">
                    <div class="p-2 bg-cyan-500/20 rounded-lg">
                      <svg
                        class="w-6 h-6 text-cyan-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                        />
                      </svg>
                    </div>
                    <h3 class="text-lg font-bold font-heading tracking-tight">SQL Mode</h3>
                  </div>
                  <p class="text-slate-400 text-sm">
                    Query your data using SQL syntax powered by DuckDB-WASM. Filter, transform, and
                    profile query results.
                  </p>
                </A>
              </div>
            </main>

            {/* Footer */}
            <footer class="mt-12 sm:mt-16 text-slate-400 text-sm text-center">
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
