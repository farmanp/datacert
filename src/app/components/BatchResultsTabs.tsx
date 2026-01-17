import { Component, For, Show, createMemo } from 'solid-js';
import { batchStore, BatchFileEntry } from '../stores/batchStore';
import ResultsTable from './ResultsTable';

/**
 * BatchResultsTabs Component
 *
 * Tab interface for viewing completed batch file results.
 * - Displays tabs for each completed file
 * - Reuses ProfileReport components (ResultsTable, ColumnCard) for content
 * - Auto-selects first completed file's tab
 */
const BatchResultsTabs: Component = () => {
  const { store, setActiveTab, retryFile, formatFileSize } = batchStore;

  // Get completed files with results
  const completedFiles = createMemo(() =>
    store.files.filter((f) => f.status === 'completed' && f.results !== null),
  );

  // Get files with errors for retry option
  const errorFiles = createMemo(() => store.files.filter((f) => f.status === 'error'));

  // Get active file's results
  const activeFile = createMemo(() => store.files.find((f) => f.id === store.activeTabId));

  const activeResults = createMemo(() => activeFile()?.results || null);

  // Calculate health score from column profiles (completeness metric)
  const healthScore = createMemo(() => {
    const results = activeResults();
    if (!results || results.column_profiles.length === 0) {
      return { value: 0, color: 'text-rose-400' };
    }

    let totalCount = 0;
    let totalMissing = 0;

    for (const profile of results.column_profiles) {
      totalCount += profile.base_stats.count;
      totalMissing += profile.base_stats.missing;
    }

    if (totalCount === 0) return { value: 0, color: 'text-rose-400' };

    const score = ((totalCount - totalMissing) / totalCount) * 100;
    const roundedScore = Math.round(score * 10) / 10;

    let color = 'text-emerald-400';
    if (roundedScore < 70) {
      color = 'text-rose-400';
    } else if (roundedScore < 90) {
      color = 'text-amber-400';
    }

    return { value: roundedScore, color };
  });

  // Get status icon for tab
  const getStatusIcon = (file: BatchFileEntry) => {
    switch (file.status) {
      case 'completed':
        return (
          <svg
            class="w-4 h-4 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'error':
        return (
          <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'processing':
        return (
          <svg class="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
        );
      default:
        return (
          <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  // Get truncated file name for tab
  const getTruncatedName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop() || '';
    const baseName = name.slice(0, name.length - ext.length - 1);
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 4) + '...';
    return `${truncatedBase}.${ext}`;
  };

  return (
    <div class="space-y-6">
      {/* Tab Navigation */}
      <div class="flex flex-wrap gap-2 border-b border-slate-700 pb-4">
        <For each={store.files}>
          {(file) => (
            <button
              type="button"
              onClick={() => setActiveTab(file.id)}
              disabled={file.status !== 'completed' && file.status !== 'error'}
              class={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${
                  store.activeTabId === file.id
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-900/10'
                    : file.status === 'completed'
                      ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                      : file.status === 'error'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                        : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                }
              `}
              title={file.name}
            >
              {getStatusIcon(file)}
              <span class="truncate max-w-[150px]">{getTruncatedName(file.name)}</span>
            </button>
          )}
        </For>
      </div>

      {/* Error Files with Retry Option */}
      <Show when={errorFiles().length > 0 && !store.isProcessing}>
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
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
            <div class="flex-1">
              <p class="text-sm font-semibold text-red-400 mb-2">
                {errorFiles().length} file{errorFiles().length > 1 ? 's' : ''} failed to process
              </p>
              <div class="flex flex-wrap gap-2">
                <For each={errorFiles()}>
                  {(file) => (
                    <button
                      type="button"
                      onClick={() => retryFile(file.id)}
                      class="px-3 py-1.5 text-xs font-semibold bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Retry {getTruncatedName(file.name, 15)}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Active File Results */}
      <Show when={activeFile() && activeFile()!.status === 'completed' && activeResults()}>
        {/* File Info Header */}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 class="text-xl font-bold text-white tracking-tight">{activeFile()!.name}</h3>
            <p class="text-slate-400 text-sm mt-1">
              <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              {formatFileSize(activeFile()!.size)} processed
            </p>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">
              Total Rows
            </p>
            <p class="text-2xl font-bold text-white tabular-nums">
              {new Intl.NumberFormat().format(activeResults()!.total_rows)}
            </p>
          </div>
          <div class="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">
              Total Columns
            </p>
            <p class="text-2xl font-bold text-white tabular-nums">
              {new Intl.NumberFormat().format(activeResults()!.column_profiles.length)}
            </p>
          </div>
          <div class="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">
              Data Types
            </p>
            <p class="text-2xl font-bold text-blue-400 tabular-nums">
              {
                new Set(activeResults()!.column_profiles.map((p) => p.base_stats.inferred_type))
                  .size
              }
            </p>
          </div>
          <div class="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">
              Health Score
            </p>
            <p class={`text-2xl font-bold ${healthScore().color} tabular-nums`}>
              {healthScore().value}%
            </p>
          </div>
        </div>

        {/* Results Table */}
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ResultsTable profiles={activeResults()!.column_profiles} />
        </div>
      </Show>

      {/* Active File Error State */}
      <Show when={activeFile() && activeFile()!.status === 'error'}>
        <div class="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <svg
            class="w-12 h-12 text-red-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 class="text-lg font-bold text-red-400 mb-2">Processing Failed</h3>
          <p class="text-red-300/70 mb-4">{activeFile()!.error || 'An unknown error occurred'}</p>
          <button
            type="button"
            onClick={() => retryFile(activeFile()!.id)}
            disabled={store.isProcessing}
            class="px-4 py-2 bg-red-500/20 text-red-300 font-semibold rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Retry Processing
          </button>
        </div>
      </Show>

      {/* No Results State */}
      <Show when={completedFiles().length === 0 && errorFiles().length === 0}>
        <div class="text-center py-12">
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p class="text-slate-400">No results to display yet.</p>
          <p class="text-slate-500 text-sm mt-1">Start batch processing to see results here.</p>
        </div>
      </Show>
    </div>
  );
};

export default BatchResultsTabs;
