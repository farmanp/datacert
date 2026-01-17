import { Component, For, Show } from 'solid-js';
import { profileStore, ValidationResult } from '../stores/profileStore';

export const ValidationResultsView: Component = () => {
  return (
    <div class="space-y-6">
      <For each={profileStore.store.validation.summaries}>
        {(summary, index) => (
          <div class="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div class="px-6 py-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
              <div>
                <h4 class="text-sm font-black text-white flex items-center gap-2">
                  <span
                    class={`p-1.5 rounded-lg ${
                      summary.format === 'gx'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : summary.format === 'soda'
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'bg-pink-500/10 text-pink-400'
                    }`}
                  >
                    {summary.format.toUpperCase()}
                  </span>
                  {summary.fileName}
                </h4>
              </div>
              <button
                onClick={() => profileStore.removeValidationSummary(index())}
                class="text-slate-500 hover:text-white transition-colors"
                aria-label="Remove validation"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Stats Bar */}
            <div class="grid grid-cols-3 divide-x divide-slate-700 border-b border-slate-700 bg-slate-900/40">
              <div class="px-4 py-3 text-center">
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Passed
                </p>
                <p class="text-lg font-bold text-emerald-400 tabular-nums">{summary.passed}</p>
              </div>
              <div class="px-4 py-3 text-center">
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Failed
                </p>
                <p class="text-lg font-bold text-rose-400 tabular-nums">{summary.failed}</p>
              </div>
              <div class="px-4 py-3 text-center">
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Skipped
                </p>
                <p class="text-lg font-bold text-slate-400 tabular-nums">{summary.skipped}</p>
              </div>
            </div>

            {/* Results List */}
            <div class="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-700/50">
              <For each={summary.results}>
                {(result) => <ValidationResultItem result={result} />}
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  );
};

const ValidationResultItem: Component<{ result: ValidationResult }> = (props) => {
  const statusColor = () => {
    switch (props.result.status) {
      case 'pass':
        return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20';
      case 'fail':
        return 'bg-rose-500/10 text-rose-400 ring-rose-500/20';
      case 'skipped':
        return 'bg-slate-500/10 text-slate-400 ring-slate-500/20';
    }
  };

  const statusIcon = () => {
    switch (props.result.status) {
      case 'pass':
        return (
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'fail':
        return (
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case 'skipped':
        return (
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  return (
    <div class="p-4 flex gap-4 transition-colors hover:bg-slate-700/20 group">
      <div
        class={`mt-1 h-6 w-6 rounded-full flex items-center justify-center ring-1 shrink-0 ${statusColor()}`}
      >
        {statusIcon()}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-mono font-black text-slate-300">
            {props.result.column || 'Table Level'}
          </span>
          <span class="text-xs font-bold text-white">{props.result.expectationType}</span>
        </div>

        <Show when={props.result.status === 'fail'}>
          <div class="mt-2 flex items-center gap-2 text-[11px] font-medium">
            <span class="text-rose-400/80">Observed:</span>
            <span class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 font-mono italic">
              {props.result.observed}
            </span>
            <span class="text-slate-500">expected</span>
            <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {props.result.expected}
            </span>
          </div>
        </Show>

        <Show when={props.result.status === 'skipped' && props.result.reason}>
          <p class="mt-2 text-[11px] text-slate-500 italic">{props.result.reason}</p>
        </Show>

        <Show when={props.result.raw}>
          <p class="mt-2 text-[10px] text-slate-600 font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity">
            {props.result.raw}
          </p>
        </Show>
      </div>
    </div>
  );
};
