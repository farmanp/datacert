import { Component, For, Show, createMemo } from 'solid-js';
import { batchStore, BatchFileStatus } from '../stores/batchStore';

/**
 * BatchFileList Component
 *
 * Displays the list of files in the batch queue with:
 * - Status indicators (pending, processing, completed, error, skipped)
 * - Per-file remove button
 * - File size display
 * - Highlights the currently processing file
 * - Baseline indicator for comparison mode
 */
const BatchFileList: Component = () => {
  const { store, removeFile, setBaseline, formatFileSize, getSummary } = batchStore;

  const summary = createMemo(() => getSummary());

  const getStatusIcon = (status: BatchFileStatus) => {
    switch (status) {
      case 'pending':
        return (
          <svg
            class="w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'processing':
        return (
          <svg
            class="w-5 h-5 text-amber-500 animate-spin"
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
        );
      case 'completed':
        return (
          <svg
            class="w-5 h-5 text-emerald-500"
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
        );
      case 'error':
        return (
          <svg
            class="w-5 h-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'skipped':
        return (
          <svg
            class="w-5 h-5 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        );
    }
  };

  const getStatusLabel = (status: BatchFileStatus) => {
    const labels: Record<BatchFileStatus, string> = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      error: 'Error',
      skipped: 'Skipped',
    };
    return labels[status];
  };

  const getStatusColor = (status: BatchFileStatus) => {
    const colors: Record<BatchFileStatus, string> = {
      pending: 'text-slate-400',
      processing: 'text-amber-400',
      completed: 'text-emerald-400',
      error: 'text-red-400',
      skipped: 'text-slate-500',
    };
    return colors[status];
  };

  return (
    <div class="w-full">
      {/* Header with summary */}
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Files ({store.files.length})
        </h3>
        <Show when={store.files.length > 0}>
          <div class="flex items-center gap-3 text-xs text-slate-400">
            <span>Total: {formatFileSize(summary().totalSize)}</span>
            <Show when={summary().completed > 0}>
              <span class="text-emerald-400">{summary().completed} done</span>
            </Show>
            <Show when={summary().error > 0}>
              <span class="text-red-400">{summary().error} failed</span>
            </Show>
          </div>
        </Show>
      </div>

      {/* Empty state */}
      <Show when={store.files.length === 0}>
        <div class="p-8 border border-dashed border-slate-700 rounded-xl text-center">
          <svg
            class="w-12 h-12 text-slate-600 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p class="text-slate-400 font-medium">No files added yet</p>
          <p class="text-slate-500 text-sm mt-1">Drop files above to start</p>
        </div>
      </Show>

      {/* File list */}
      <Show when={store.files.length > 0}>
        <div class="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          <For each={store.files}>
            {(file) => (
              <div
                class={`
                  group relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
                  ${
                    store.mode === 'comparison' && file.isBaseline
                      ? 'border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-500/30'
                      : file.status === 'processing'
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : file.status === 'error'
                          ? 'border-red-500/30 bg-red-500/5'
                          : file.status === 'completed'
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }
                `}
              >
                {/* Status icon */}
                <div class="flex-shrink-0">{getStatusIcon(file.status)}</div>

                {/* File info */}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold text-slate-200 truncate">{file.name}</p>
                    {/* Baseline badge for comparison mode */}
                    <Show when={store.mode === 'comparison' && file.isBaseline}>
                      <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 rounded-full">
                        Baseline
                      </span>
                    </Show>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xs text-slate-500 font-mono">
                      {formatFileSize(file.size)}
                    </span>
                    <span class="text-slate-600">|</span>
                    <span class={`text-xs font-medium ${getStatusColor(file.status)}`}>
                      {getStatusLabel(file.status)}
                    </span>
                    {/* Progress for processing files */}
                    <Show when={file.status === 'processing' && file.progress > 0}>
                      <span class="text-xs text-amber-400 font-mono">{file.progress}%</span>
                    </Show>
                  </div>
                  {/* Error message */}
                  <Show when={file.error}>
                    <p class="text-xs text-red-400 mt-1 truncate">{file.error}</p>
                  </Show>
                </div>

                {/* Progress bar for processing files */}
                <Show when={file.status === 'processing'}>
                  <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-700 rounded-b-lg overflow-hidden">
                    <div
                      class="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </Show>

                {/* Actions */}
                <div class="flex items-center gap-1">
                  {/* Baseline star indicator (always visible when baseline) */}
                  <Show when={store.mode === 'comparison' && file.isBaseline}>
                    <div
                      class="p-1.5 text-purple-400"
                      title="Baseline file"
                      aria-label="This is the baseline file"
                    >
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </Show>

                  {/* Set as baseline button (comparison mode only, visible on hover) */}
                  <Show when={store.mode === 'comparison' && !file.isBaseline && !store.isProcessing}>
                    <button
                      type="button"
                      class="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => setBaseline(file.id)}
                      title="Set as baseline"
                      aria-label={`Set ${file.name} as baseline`}
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  </Show>

                  {/* Remove button */}
                  <Show when={!store.isProcessing}>
                    <button
                      type="button"
                      class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => removeFile(file.id)}
                      title="Remove file"
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default BatchFileList;
