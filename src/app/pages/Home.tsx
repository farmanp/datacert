import { Component, createSignal, onMount, Show } from 'solid-js';
import { A } from '@solidjs/router';
import FileDropzone from '../components/FileDropzone';
import ProfileReport from '../components/ProfileReport';
import GCSAuthButton from '../components/GCSAuthButton';
import { profileStore } from '../stores/profileStore';
import { fileStore } from '../stores/fileStore';
import { authStore } from '../stores/auth.store';
import { AnomalyDrilldown } from '../components/AnomalyDrilldown';
import RemoteSourcesModal from '../components/RemoteSourcesModal';
import TourModal from '../components/TourModal';
import { isFeatureEnabled, FEATURE_FLAGS } from '../utils/featureFlags';

/**
 * Home Page Component
 *
 * The main landing page for DataCert.
 */
const Home: Component = () => {
  const [wasmStatus, setWasmStatus] = createSignal('Loading WASM...');
  const [wasmReady, setWasmReady] = createSignal(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = createSignal(false);
  const [isTourOpen, setIsTourOpen] = createSignal(false);

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
    <div class="min-h-screen bg-slate-950 text-white flex flex-col items-center selection:bg-blue-500/30">
      <AnomalyDrilldown />
      <RemoteSourcesModal
        isOpen={isRemoteModalOpen()}
        onClose={() => setIsRemoteModalOpen(false)}
      />
      <TourModal
        isOpen={isTourOpen()}
        onClose={() => setIsTourOpen(false)}
      />

      <Show
        when={store.results}
        fallback={
          <div class="w-full flex flex-col items-center p-4 sm:p-8 animate-in fade-in duration-700 relative">
            {/* Top Right Auth Button */}
            <div class="absolute top-4 right-4 sm:top-8 sm:right-8 z-20 flex items-center gap-3">
              <button
                onClick={() => setIsTourOpen(true)}
                class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Take a Tour
              </button>
              <GCSAuthButton />
            </div>

            {/* Header */}
            <header class="text-center mb-12 sm:mb-16 w-full max-w-4xl mt-12 sm:mt-16">
              <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black font-heading tracking-tighter text-white mb-6">
                Get started with{' '}
                <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">DataCert</span>
              </h1>

              <p class="text-lg sm:text-xl text-slate-400 font-medium tracking-tight mb-2">
                Import your files to start analyzing.
              </p>
              <p class="text-base sm:text-lg">
                <span class="text-blue-400 font-semibold">Everything runs locally</span>
                <span class="text-slate-600 mx-2">—</span>
                <span class="text-slate-500">Your data stays private.</span>
              </p>
            </header>

            {/* Main Content */}
            <main class="w-full max-w-6xl relative">
              {/* Premium Loading Overlay */}
              <Show when={fileStore.store.state === 'processing' || profileStore.store.isProfiling}>
                <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
                  <div class="relative">
                    {/* Pulsing ring animation */}
                    <div class="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-[3000ms]"></div>
                    <div class="relative w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-blue-500/30 shadow-2xl shadow-blue-500/20">
                      <svg class="w-12 h-12 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>

                  <div class="mt-12 text-center">
                    <h2 class="text-3xl font-black text-white mb-4 tracking-tighter">
                      {profileStore.store.isProfiling ? 'Computing Statistics...' : 'Analyzing Structure...'}
                    </h2>
                    <p class="text-slate-400 font-medium mb-8 max-w-md mx-auto">
                      {fileStore.store.file?.name} • {fileStore.formatFileSize(fileStore.store.file?.size || 0)}
                    </p>

                    {/* Progress Bar Container */}
                    <div class="w-64 sm:w-80 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
                      <div
                        class="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        style={{ width: `${fileStore.store.progress || profileStore.store.progress}%` }}
                      ></div>
                    </div>
                    <div class="mt-4 flex flex-col items-center gap-2">
                      <span class="text-xs font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse">
                        {Math.round(fileStore.store.progress || profileStore.store.progress)}% Complete
                      </span>
                      <Show when={profileStore.store.isProfiling && fileStore.store.file?.size && fileStore.store.file.size > 200 * 1024 * 1024}>
                        <span class="text-[10px] text-amber-500/60 font-black uppercase tracking-widest mt-2">
                          Large file detected • Optimizing compute
                        </span>
                      </Show>
                    </div>
                  </div>

                  {/* Cancel Action */}
                  <button
                    onClick={() => {
                      profileStore.cancelProfiling();
                      fileStore.reset();
                    }}
                    class="mt-16 px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-[0.2em]"
                  >
                    Cancel Analysis
                  </button>
                </div>
              </Show>

              {/* Getting Started Grid (Hidden during loading) */}
              <div class={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 transition-all duration-500 ${fileStore.store.state === 'processing' || profileStore.store.isProfiling ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                {/* Card 1: Import Files */}
                <div
                  onClick={() => {
                    document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
                  }}
                  class="group relative bg-slate-900/40 backdrop-blur-sm border-2 border-dashed border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <div class="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <svg class="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 class="text-2xl font-bold text-slate-100 mb-2">Import Files</h3>
                  <p class="text-slate-500 text-sm mb-8 italic">Drag & drop or browse</p>
                  <div class="flex flex-wrap justify-center gap-2">
                    {['CSV', 'JSON', 'XLS', 'Parquet', 'Avro'].map(tag => (
                      <span class="px-3 py-1 rounded-full bg-slate-800/50 text-[10px] font-black text-slate-400 border border-slate-700/50 uppercase tracking-widest">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Card 2: Open Folder */}
                <div
                  class="group relative bg-slate-900/40 backdrop-blur-sm border-2 border-dashed border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <div class="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <svg class="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <h3 class="text-2xl font-bold text-slate-100 mb-2">Open Folder</h3>
                  <p class="text-slate-500 text-sm mb-4">Import entire directories</p>
                  <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-[10px] font-black text-emerald-500/60 border border-emerald-500/20 uppercase tracking-widest">Coming Soon</span>
                </div>

                {/* Card 3: Remote Sources */}
                <div
                  onClick={() => setIsRemoteModalOpen(true)}
                  class="group relative bg-slate-900/40 backdrop-blur-sm border-2 border-dashed border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <div class="w-20 h-20 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <div class="flex gap-1">
                      <span class="text-2xl">☁️</span>
                      <span class="text-2xl">📦</span>
                      <span class="text-2xl">🐘</span>
                    </div>
                  </div>
                  <h3 class="text-2xl font-bold text-slate-100 mb-2">Remote Sources</h3>
                  <p class="text-slate-500 text-sm mb-4">Databases & cloud storage</p>
                  <div class="flex gap-4 opacity-50 grayscale group-hover:grayscale-0 transition-all">
                    <span>🐘</span>
                    <span>📦</span>
                    <span>🤗</span>
                    <span>📊</span>
                  </div>
                </div>
              </div>

              {/* Hidden FileDropzone */}
              <div class="hidden">
                <FileDropzone />
              </div>

              {/* Sample Data Integration */}
              <div class={`flex flex-col items-center gap-6 mt-12 py-8 border-t border-slate-800/50 transition-all duration-500 ${fileStore.store.state === 'processing' || profileStore.store.isProfiling ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                <div class="flex items-center gap-4">
                  <div
                    class={`h-2.5 w-2.5 rounded-full animate-pulse ${wasmReady() ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {wasmStatus()}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    const file = await fileStore.loadDemoFile();
                    if (file) {
                      profileStore.startProfiling();
                    }
                  }}
                  disabled={fileStore.store.state === 'processing'}
                  class="group flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl transition-all border border-slate-800 hover:border-blue-500/30"
                >
                  <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Try with Sample Data
                </button>
              </div>

              {/* Feature Cards */}
              <div class={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 transition-all duration-700 delay-100 ${fileStore.store.state === 'processing' || profileStore.store.isProfiling ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-blue-500/30 transition-all group">
                  <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                    <svg class="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 class="text-xl font-bold text-slate-100 mb-3">Deep Profiling</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">
                    Streaming computation of counts, distinct values (HLL), and numeric aggregates in a single pass.
                  </p>
                </div>

                <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-emerald-500/30 transition-all group">
                  <div class="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6">
                    <svg class="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <h3 class="text-xl font-bold text-slate-100 mb-3">Privacy First</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">
                    No data leaves your device. All processing happens in cross-compiled Rust via WASM in your browser.
                  </p>
                </div>

                <Show when={isFeatureEnabled(FEATURE_FLAGS.COMPARE_MODE)}>
                  <A href="/compare" class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-purple-500/30 transition-all group block">
                    <div class="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                      <svg class="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-100 mb-3">Compare Mode</h3>
                    <p class="text-slate-400 text-sm leading-relaxed">
                      Compare two datasets side-by-side to detect schema drift and statistical changes.
                    </p>
                  </A>
                </Show>

                <A href="/sql-mode" class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-cyan-500/30 transition-all group block">
                  <div class="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6">
                    <svg class="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4" />
                    </svg>
                  </div>
                  <h3 class="text-xl font-bold text-slate-100 mb-3">SQL Engine</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">
                    Query your data using SQL powered by DuckDB-WASM. Filter and transform with ease.
                  </p>
                </A>
              </div>
            </main>

            <footer class="mt-32 pb-12 text-slate-600 text-[10px] uppercase font-black tracking-[0.3em]">
              DataCert &copy; 2026 • Local-First Intelligence
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
