import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import FileDropzone from '../components/FileDropzone';
import ProfileReport from '../components/ProfileReport';
import GCSAuthButton from '../components/GCSAuthButton';
import Navigation from '../components/Navigation';
import { profileStore } from '../stores/profileStore';
import { fileStore } from '../stores/fileStore';
import { authStore } from '../stores/auth.store';
import { engineStore } from '../stores/engine.store';
import { isFeatureEnabled, FEATURE_FLAGS } from '../utils/featureFlags';
import { AnomalyDrilldown } from '../components/AnomalyDrilldown';
import RemoteSourcesModal from '../components/RemoteSourcesModal';
import TourModal from '../components/TourModal';
import GlobalDragOverlay from '../components/GlobalDragOverlay';
import ErrorDisplay from '../components/ErrorDisplay';

/**
 * Home Page Component
 *
 * The main landing page for DataCert.
 */
const Home: Component = () => {
  const navigate = useNavigate();
  const [isRemoteModalOpen, setIsRemoteModalOpen] = createSignal(false);
  const [isTourOpen, setIsTourOpen] = createSignal(false);

  const { store } = profileStore;
  const { store: fStore } = fileStore;

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only trigger if dragging files
    if (e.dataTransfer?.types.includes('Files')) {
      fileStore.setHover(true);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // We only want to hide the overlay if the drag actually leaves the window
    // relatedTarget is null when leaving the window
    if (!e.relatedTarget || (e.relatedTarget as HTMLElement).nodeName === 'HTML') {
      fileStore.setHover(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileStore.setHover(false);

    const file = e.dataTransfer?.files[0];
    if (file) {
      fileStore.selectFile(file);
    }
  };

  // Handle confirmation: user chose to profile
  const handleProfileAnyway = async () => {
    if (fileStore.confirmFile()) {
      profileStore.startProfiling();
    }
  };

  // Handle confirmation: user chose tree mode
  const handleUseTreeMode = () => {
    const file = fStore.pendingFile;
    if (!file) return;
    fileStore.confirmFile(file); // Confirm it so it's in the store
    navigate('/tree-mode');
  };

  // Handle confirmation: user cancelled
  const handleCancelConfirmation = () => {
    fileStore.cancelPending();
  };

  onMount(async () => {
    authStore.init();
    engineStore.init();
  });

  return (
    <div
      class="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-500/30"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <GlobalDragOverlay />

      {/* File-related Errors Overlay */}
      <Show when={fileStore.store.state === 'error' && fileStore.store.profilerError}>
        <div class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <ErrorDisplay
            error={fileStore.store.profilerError!}
            onRetry={() => fileStore.reset()}
            onUploadDifferent={() => fileStore.reset()}
          />
        </div>
      </Show>

      {/* File Confirmation Overlay */}
      <Show when={fStore.pendingFile}>
        <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div class="text-center w-full max-w-md p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl animate-in zoom-in-95 duration-300">
            {/* Icon */}
            <Show
              when={fStore.showLargeFileWarning}
              fallback={
                <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <svg
                    class="w-8 h-8 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              }
            >
              <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <svg
                  class="w-8 h-8 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </Show>

            {/* Title */}
            <h3
              class={`text-2xl font-bold mb-2 ${fStore.showLargeFileWarning ? 'text-amber-400' : 'text-emerald-400'}`}
            >
              {fStore.showLargeFileWarning ? 'Large File Detected' : 'Ready to Profile'}
            </h3>
            <p class="text-slate-300 font-medium mb-1">{fStore.pendingFile?.name}</p>
            <p class="text-slate-500 text-sm font-mono mb-6">
              {fileStore.formatFileSize(fStore.pendingFile?.size || 0)}
            </p>

            {/* Warning for large files */}
            <Show when={fStore.showLargeFileWarning}>
              <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                <p class="text-amber-300/90 text-sm leading-relaxed">
                  This file may take longer to process.
                  <br />
                  <span class="text-amber-400/70 font-semibold">
                    SQL Mode will be unavailable
                  </span>{' '}
                  for in-browser querying.
                </p>
              </div>
            </Show>

            {/* Info for small files */}
            <Show when={!fStore.showLargeFileWarning}>
              <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
                <p class="text-slate-300 text-sm leading-relaxed">
                  Click <span class="font-semibold text-emerald-400">Profile Now</span> to analyze
                  all columns,
                  <br />
                  or use <span class="text-slate-200 font-medium">Tree Mode</span> to select
                  specific ones.
                </p>
              </div>
            </Show>

            {/* Action buttons */}
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleProfileAnyway}
                class={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                  fStore.showLargeFileWarning
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400'
                }`}
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {fStore.showLargeFileWarning ? 'Profile Anyway' : 'Profile Now'}
              </button>
              <button
                type="button"
                onClick={handleUseTreeMode}
                class="px-6 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 transition-all border border-slate-700 flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Use Tree Mode
              </button>
            </div>
            <button
              type="button"
              onClick={handleCancelConfirmation}
              class="mt-4 px-4 py-2 text-slate-500 hover:text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>

            {/* Tip */}
            <p class="text-slate-600 text-xs mt-6 uppercase tracking-wider">
              {fStore.showLargeFileWarning
                ? 'Tree Mode profiles specific columns to reduce memory usage'
                : 'Pro tip: Tree Mode lets you pick specific columns'}
            </p>
          </div>
        </div>
      </Show>

      <Navigation />
      <AnomalyDrilldown />
      <RemoteSourcesModal
        isOpen={isRemoteModalOpen()}
        onClose={() => setIsRemoteModalOpen(false)}
      />
      <TourModal isOpen={isTourOpen()} onClose={() => setIsTourOpen(false)} />

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
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Take a Tour
              </button>
              <Show when={isFeatureEnabled(FEATURE_FLAGS.GCS_AUTH)}>
                <GCSAuthButton />
              </Show>
            </div>

            {/* Header */}
            <header class="text-center mb-12 sm:mb-16 w-full max-w-4xl mt-8 sm:mt-12">
              <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black font-heading tracking-tighter text-white mb-6">
                Get started with{' '}
                <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                  DataCert
                </span>
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
              {/* Initialization Loading Overlay */}
              <Show when={engineStore.state.isLoading}>
                <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
                  <div class="relative w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-blue-500/30 shadow-2xl shadow-blue-500/20 mb-8">
                    <svg
                      class="w-10 h-10 text-blue-400 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="3"
                      />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                  <h2 class="text-xl font-bold text-white mb-2 tracking-tight">
                    Initializing Data Engine...
                  </h2>
                  <p class="text-slate-400 text-sm">Preparing local WASM environment</p>
                </div>
              </Show>

              {/* Initialization Error Overlay */}
              <Show when={engineStore.state.error}>
                <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl">
                  <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 mb-6">
                    <svg
                      class="w-8 h-8 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h2 class="text-2xl font-bold text-white mb-2">Failed to initialize engine</h2>
                  <p class="text-slate-400 mb-6 text-center max-w-md">{engineStore.state.error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                  >
                    Reload Application
                  </button>
                </div>
              </Show>

              {/* Premium Loading Overlay (Processing File) */}
              <Show when={fileStore.store.state === 'processing' || profileStore.store.isProfiling}>
                <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
                  <div class="relative">
                    {/* Pulsing ring animation */}
                    <div class="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-[3000ms]" />
                    <div class="relative w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-blue-500/30 shadow-2xl shadow-blue-500/20">
                      <svg
                        class="w-12 h-12 text-blue-400 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          class="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="3"
                        />
                        <path
                          class="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>
                  </div>

                  <div class="mt-12 text-center">
                    <h2 class="text-3xl font-black text-white mb-4 tracking-tighter">
                      {profileStore.store.isProfiling
                        ? 'Computing Statistics...'
                        : 'Analyzing Structure...'}
                    </h2>
                    <p class="text-slate-400 font-medium mb-8 max-w-md mx-auto">
                      {fileStore.store.file?.name} •{' '}
                      {fileStore.formatFileSize(fileStore.store.file?.size || 0)}
                    </p>

                    {/* Progress Bar Container */}
                    <div class="w-64 sm:w-80 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
                      <div
                        class="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        style={{
                          width: `${fileStore.store.progress || profileStore.store.progress}%`,
                        }}
                      />
                    </div>
                    <div class="mt-4 flex flex-col items-center gap-2">
                      <span class="text-xs font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse">
                        {Math.round(fileStore.store.progress || profileStore.store.progress)}%
                        Complete
                      </span>
                      <Show
                        when={
                          profileStore.store.isProfiling &&
                          fileStore.store.file?.size &&
                          fileStore.store.file.size > 200 * 1024 * 1024
                        }
                      >
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
              <div
                class={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 transition-all duration-500 ${fileStore.store.state === 'processing' || profileStore.store.isProfiling ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}
              >
                {/* Card 1: Import Files */}
                <div
                  onClick={() => {
                    if (engineStore.state.isReady) {
                      document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
                    }
                  }}
                  class={`group relative bg-slate-900/40 backdrop-blur-sm border-2 border-dashed border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1 ${!engineStore.state.isReady ? 'cursor-not-allowed opacity-50 grayscale' : 'cursor-pointer'} ${fileStore.store.state === 'hover' ? 'border-blue-500/50 bg-slate-800/40 ring-4 ring-blue-500/20' : ''}`}
                >
                  <div class="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      class="w-10 h-10 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 class="text-2xl font-bold text-slate-100 mb-2">Import Files</h3>
                  <p class="text-slate-500 text-sm mb-8 italic">Drag & drop or browse</p>
                  <div class="flex flex-wrap justify-center gap-2">
                    <For each={['CSV', 'JSON', 'XLS', 'Parquet', 'Avro']}>
                      {(tag) => (
                        <span class="px-3 py-1 rounded-full bg-slate-800/50 text-[10px] font-black text-slate-400 border border-slate-700/50 uppercase tracking-widest">
                          {tag}
                        </span>
                      )}
                    </For>
                  </div>
                </div>

                {/* Card 2: Open Folder */}
                <div class="group relative bg-slate-900/40 backdrop-blur-sm border-2 border-dashed border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1">
                  <div class="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      class="w-10 h-10 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 class="text-2xl font-bold text-slate-100 mb-2">Open Folder</h3>
                  <p class="text-slate-500 text-sm mb-4">Import entire directories</p>
                  <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-[10px] font-black text-emerald-500/60 border border-emerald-500/20 uppercase tracking-widest">
                    Coming Soon
                  </span>
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
                <Show when={engineStore.state.isReady}>
                  <FileDropzone />
                </Show>
              </div>

              {/* Sample Data Integration */}
              <div
                class={`flex flex-col items-center gap-6 mt-12 py-8 border-t border-slate-800/50 transition-all duration-500 ${fileStore.store.state === 'processing' || profileStore.store.isProfiling ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
              >
                <div class="flex items-center gap-4">
                  <div
                    class={`h-2.5 w-2.5 rounded-full animate-pulse ${engineStore.state.isReady ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {engineStore.state.isReady
                      ? 'WASM READY'
                      : engineStore.state.isLoading
                        ? 'INITIALIZING...'
                        : 'OFFLINE'}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    const file = await fileStore.loadDemoFile();
                    if (file) {
                      profileStore.startProfiling();
                    }
                  }}
                  disabled={fileStore.store.state === 'processing' || !engineStore.state.isReady}
                  class="group relative flex items-center gap-3 px-6 py-3 bg-slate-900/50 hover:bg-slate-800/50 text-slate-400 hover:text-blue-400 font-bold rounded-full transition-all border border-slate-800 hover:border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div class="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <svg
                      class="w-3 h-3 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                    </svg>
                  </div>
                  <span class="text-sm tracking-tight">Explore with Sample Data</span>

                  {/* Subtle underline glow */}
                  <div class="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/0 group-hover:via-blue-500/50 to-transparent transition-all duration-500" />
                </button>
              </div>

              {/* Feature Cards */}
              <div
                class={`grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 transition-all duration-700 delay-100 ${fileStore.store.state === 'processing' || profileStore.store.isProfiling ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}
              >
                <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-blue-500/30 transition-all group">
                  <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
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
                  <h3 class="text-xl font-bold text-slate-100 mb-3">Deep Profiling</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">
                    Streaming computation of counts, distinct values (HLL), and numeric aggregates
                    in a single pass.
                  </p>
                </div>

                <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-emerald-500/30 transition-all group">
                  <div class="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6">
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
                  <h3 class="text-xl font-bold text-slate-100 mb-3">Privacy First</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">
                    No data leaves your device. All processing happens in cross-compiled Rust via
                    WASM in your browser.
                  </p>
                </div>

                <A
                  href="/sql-mode"
                  class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-cyan-500/30 transition-all group block"
                >
                  <div class="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6">
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
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4"
                      />
                    </svg>
                  </div>
                  <h3 class="text-xl font-bold text-slate-100 mb-3">SQL Engine</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">
                    Query your data using SQL powered by DuckDB-WASM. Filter and transform with
                    ease.
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
