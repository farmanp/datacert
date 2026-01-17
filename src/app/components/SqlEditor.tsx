import { Component, Show, onMount, onCleanup, createMemo } from 'solid-js';

interface SqlEditorProps {
  value: string;
  onChange: (sql: string) => void;
  onExecute: () => void;
  isExecuting: boolean;
  error: string | null;
  executionTime: number | null;
  disabled?: boolean;
}

/**
 * SqlEditor Component
 *
 * A SQL query editor with the following features:
 * - Monospace textarea with dark theme styling
 * - Run button to execute queries
 * - Keyboard shortcut: Ctrl/Cmd+Enter to execute
 * - Execution status with spinner
 * - Inline error display
 * - Execution time display after completion
 */
const SqlEditor: Component<SqlEditorProps> = (props) => {
  let textareaRef: HTMLTextAreaElement | undefined;

  // Format execution time for display
  const formattedExecutionTime = createMemo(() => {
    const time = props.executionTime;
    if (time === null) return null;
    if (time < 1000) {
      return `${time.toFixed(0)}ms`;
    }
    return `${(time / 1000).toFixed(2)}s`;
  });

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!props.isExecuting && !props.disabled && props.value.trim()) {
        props.onExecute();
      }
    }
  };

  // Handle textarea input
  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    props.onChange(target.value);
  };

  // Handle run button click
  const handleRunClick = () => {
    if (!props.isExecuting && !props.disabled && props.value.trim()) {
      props.onExecute();
    }
  };

  // Set up global keyboard listener for when textarea is focused
  onMount(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle if textarea is focused
      if (document.activeElement === textareaRef) {
        handleKeyDown(e);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    onCleanup(() => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    });
  });

  return (
    <div class="w-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Editor Header */}
      <div class="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
          <span class="text-sm font-medium text-slate-400">SQL Query</span>
        </div>
        <Show when={formattedExecutionTime()}>
          <div class="flex items-center gap-1.5">
            <svg
              class="w-3.5 h-3.5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-sm font-medium text-emerald-400">{formattedExecutionTime()}</span>
          </div>
        </Show>
      </div>

      {/* Textarea */}
      <div class="relative">
        <textarea
          ref={textareaRef}
          value={props.value}
          onInput={handleInput}
          placeholder="SELECT * FROM data LIMIT 100"
          disabled={props.disabled || props.isExecuting}
          class={`
            w-full min-h-[160px] px-4 py-3
            font-mono text-sm leading-relaxed
            bg-slate-900 text-slate-100
            placeholder-slate-500
            border-none outline-none resize-y
            focus:ring-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${props.error ? 'text-red-300' : ''}
          `}
          aria-label="SQL query input"
          aria-describedby={props.error ? 'sql-error' : undefined}
          spellcheck={false}
        />
        {/* Line numbers gutter effect (visual only) */}
        <div
          class="absolute top-0 left-0 w-10 h-full bg-slate-900/50 border-r border-slate-700/30 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Editor Footer */}
      <div class="flex items-center justify-between px-4 py-3 bg-slate-800/60 border-t border-slate-700/50">
        <div class="flex-1 min-w-0">
          <Show when={props.error}>
            <div id="sql-error" class="flex items-start gap-2 text-sm text-red-400" role="alert">
              <svg
                class="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span class="break-words">{props.error}</span>
            </div>
          </Show>
          <Show when={!props.error && !props.isExecuting}>
            <span class="text-xs text-slate-500">
              Press{' '}
              <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono text-[10px]">
                Ctrl
              </kbd>
              <span class="mx-0.5">+</span>
              <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono text-[10px]">
                Enter
              </kbd>
              <span class="ml-1">to run</span>
            </span>
          </Show>
        </div>

        <button
          type="button"
          onClick={handleRunClick}
          disabled={props.isExecuting || props.disabled || !props.value.trim()}
          class={`
            flex items-center gap-2
            px-4 py-2 rounded-lg
            text-sm font-semibold
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800
            ${
              props.isExecuting
                ? 'bg-amber-600 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600
          `}
          aria-busy={props.isExecuting}
        >
          <Show
            when={props.isExecuting}
            fallback={
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
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
            }
          >
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
          </Show>
          {props.isExecuting ? 'Executing...' : 'Run Query'}
        </button>
      </div>
    </div>
  );
};

export default SqlEditor;
