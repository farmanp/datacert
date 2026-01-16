import { Component, Show, createSignal, onMount, createMemo } from 'solid-js';
import Navigation from '../components/Navigation';
import BatchDropzone from '../components/BatchDropzone';
import BatchModeSelector from '../components/BatchModeSelector';
import BatchFileList from '../components/BatchFileList';
import BatchResultsTabs from '../components/BatchResultsTabs';
import NWayComparisonView from '../components/NWayComparisonView';
import SchemaValidationDialog from '../components/SchemaValidationDialog';
import MergedResultsView from '../components/MergedResultsView';
import { batchStore } from '../stores/batchStore';
import { engineStore } from '../stores/engine.store';

/**
 * Batch Page Component
 *
 * Batch processing mode for DataCert.
 * Allows users to:
 * 1. Select a processing mode (Sequential, Merge, Compare)
 * 2. Upload multiple files via drag-and-drop
 * 3. View and manage the file queue
 * 4. Start batch processing
 *
 * Results display will be implemented in Phase 2.
 */
const Batch: Component = () => {
  const {
    store,
    startBatch,
    cancelBatch,
    clearFiles,
    canStartBatch,
    getSummary,
    confirmSchemaMismatch,
    cancelSchemaMismatch,
  } = batchStore;

  const summary = createMemo(() => getSummary());

  onMount(async () => {
    engineStore.init();
  });

  const getModeDescription = () => {
    switch (store.mode) {
      case 'sequential':
        return 'Each file will be profiled separately. Results will appear in tabs.';
      case 'merge':
        return 'Files will be validated for schema compatibility, then merged into unified statistics.';
      case 'comparison':
        return 'Files will be compared against the baseline to detect schema drift and statistical changes.';
      default:
        return 'Select a processing mode to begin.';
    }
  };

  return (
    <div class="min-h-screen bg-slate-900 text-white flex flex-col">
      <Navigation minimal title="Batch Processing" />
      <div class="w-full flex flex-col items-center p-4 sm:p-8 animate-in fade-in duration-500">
        {/* Header */}
        <header class="text-center mb-8 sm:mb-12 w-full max-w-5xl">
          <p class="text-slate-400 text-base sm:text-lg font-medium tracking-tight max-w-2xl mx-auto leading-relaxed">
            Process multiple files at once with sequential profiling, merging, or comparison modes.
          </p>
        </header>

        {/* Main Content */}
        <main class="w-full max-w-5xl space-y-6">
          {/* Status Card */}
          <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* WASM Status */}
            <div class="flex items-center space-x-3 mb-6">
              <div
                class={`h-3 w-3 rounded-full ${engineStore.state.isReady ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
              <span class="text-sm font-medium text-slate-300 uppercase tracking-wider">
                {engineStore.state.isReady ? 'WASM Ready' : engineStore.state.isLoading ? 'Initializing...' : 'Offline'}
              </span>
            </div>

            {/* Mode Selector */}
            <section class="mb-8">
              <BatchModeSelector />
            </section>

            {/* Mode description */}
            <Show when={store.mode}>
              <div class="mb-6 p-4 bg-slate-700/30 border border-slate-600/50 rounded-xl">
                <div class="flex items-start gap-3">
                  <svg
                    class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p class="text-sm text-slate-300">{getModeDescription()}</p>
                </div>
              </div>
            </Show>

            {/* Baseline selection reminder for comparison mode */}
            <Show when={store.mode === 'comparison' && store.files.length > 0 && !store.files.some((f) => f.isBaseline)}>
              <div class="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <div class="flex items-start gap-3">
                  <svg
                    class="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                  <p class="text-sm text-purple-300">
                    Click the star icon next to a file in the list below to set it as the baseline for comparison.
                    All other files will be compared against it.
                  </p>
                </div>
              </div>
            </Show>

            {/* Baseline file indicator for comparison mode */}
            <Show when={store.mode === 'comparison' && store.files.some((f) => f.isBaseline)}>
              {(() => {
                const baselineFile = store.files.find((f) => f.isBaseline);
                return (
                  <div class="mb-6 p-4 bg-purple-500/20 border border-purple-500/40 rounded-xl">
                    <div class="flex items-center gap-3">
                      <svg
                        class="w-5 h-5 text-purple-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <div>
                        <p class="text-sm font-semibold text-purple-300">
                          Baseline: <span class="text-white">{baselineFile?.name}</span>
                        </p>
                        <p class="text-xs text-purple-400/70 mt-0.5">
                          {store.files.length - 1} file{store.files.length - 1 !== 1 ? 's' : ''} will be compared against this baseline
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Show>

            {/* File Upload */}
            <section aria-labelledby="upload-heading" class="mb-6">
              <h2 id="upload-heading" class="text-xl font-bold text-slate-100 mb-4">
                Add Files
              </h2>
              <BatchDropzone />
            </section>

            {/* File List */}
            <section aria-labelledby="files-heading">
              <BatchFileList />
            </section>
          </div>

          {/* Action Bar */}
          <Show when={store.files.length > 0}>
            <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Summary */}
                <div class="flex items-center gap-4 text-sm">
                  <span class="text-slate-400">
                    <span class="font-bold text-white">{summary().total}</span> files ready
                  </span>
                  <Show when={summary().completed > 0}>
                    <span class="text-emerald-400">
                      <span class="font-bold">{summary().completed}</span> completed
                    </span>
                  </Show>
                  <Show when={summary().error > 0}>
                    <span class="text-red-400">
                      <span class="font-bold">{summary().error}</span> failed
                    </span>
                  </Show>
                </div>

                {/* Actions */}
                <div class="flex items-center gap-3">
                  <Show when={!store.isProcessing}>
                    <button
                      type="button"
                      class="px-4 py-2.5 rounded-xl bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 transition-all border border-slate-600"
                      onClick={clearFiles}
                    >
                      Clear All
                    </button>
                  </Show>

                  <Show
                    when={!store.isProcessing}
                    fallback={
                      <button
                        type="button"
                        class="px-6 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 transition-all shadow-lg flex items-center gap-2"
                        onClick={cancelBatch}
                      >
                        <svg
                          class="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Cancel Processing
                      </button>
                    }
                  >
                    <button
                      type="button"
                      class={`
                        px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2
                        ${
                          canStartBatch()
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-amber-900/20'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }
                      `}
                      onClick={startBatch}
                      disabled={!canStartBatch()}
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Start Processing
                    </button>
                  </Show>
                </div>
              </div>

              {/* Processing hint when mode not selected */}
              <Show when={!store.mode && store.files.length > 0}>
                <p class="text-amber-400 text-sm mt-3 text-center">
                  Please select a processing mode above to start.
                </p>
              </Show>
            </div>
          </Show>

          {/* Processing State */}
          <Show when={store.isProcessing}>
            <div class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="flex items-center gap-4">
                <svg
                  class="w-8 h-8 text-amber-500 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <div>
                  <p class="text-lg font-bold text-amber-400">Processing batch...</p>
                  <p class="text-sm text-amber-300/80">
                    {summary().completed} of {summary().total} files completed
                  </p>
                </div>
              </div>
              {/* Overall progress bar */}
              <div class="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-amber-500 transition-all duration-300"
                  style={{
                    width: `${summary().total > 0 ? (summary().completed / summary().total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </Show>

          {/* Empty state instructions */}
          <Show when={store.files.length === 0 && !store.mode}>
            <div class="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
              <svg
                class="w-16 h-16 text-slate-600 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 class="text-lg font-bold text-slate-300 mb-2">Ready for Batch Processing</h3>
              <p class="text-slate-400 max-w-md mx-auto">
                Select a processing mode above, then drop multiple CSV, TSV, JSON, or Parquet files
                to begin batch analysis.
              </p>
            </div>
          </Show>

          {/* Results Section */}
          <Show when={summary().completed > 0 || summary().error > 0 || store.mergedStats !== null}>
            <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Show merged results view for merge mode */}
              <Show
                when={store.mode === 'merge' && store.mergedStats !== null}
                fallback={
                  /* Show N-way comparison view for comparison mode */
                  <Show
                    when={store.mode === 'comparison' && store.comparisonDeltas.length > 0}
                    fallback={
                      <>
                        <h2 class="text-2xl font-extrabold text-white tracking-tight mb-6">
                          Results
                        </h2>
                        <BatchResultsTabs />
                      </>
                    }
                  >
                    <NWayComparisonView />
                  </Show>
                }
              >
                <h2 class="text-2xl font-extrabold text-white tracking-tight mb-6">
                  Merged Results
                </h2>
                <MergedResultsView mergedStats={store.mergedStats!} />
              </Show>
            </div>
          </Show>

          {/* Schema Validation Dialog */}
          <Show when={store.showSchemaDialog && store.schemaValidation !== null}>
            <SchemaValidationDialog
              validation={store.schemaValidation!}
              onProceed={confirmSchemaMismatch}
              onCancel={cancelSchemaMismatch}
            />
          </Show>
        </main>

        {/* Footer */}
        <footer class="mt-12 sm:mt-16 text-slate-600 text-[10px] uppercase font-black tracking-[0.3em] text-center">
          DataCert Batch Mode
        </footer>
      </div>
    </div>
  );
};

export default Batch;
