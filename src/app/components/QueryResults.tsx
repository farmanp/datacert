import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import EmptyState from './EmptyState';
import Toast from './Toast';

/**
 * Props for the QueryResults component
 */
export interface QueryResultsProps {
  /** Array of result rows from SQL query execution */
  results: Array<Record<string, unknown>> | null;
  /** Column names in display order */
  columnNames: string[];
  /** Total number of rows returned by query (may exceed displayed rows) */
  totalRows: number;
  /** Callback to trigger profiling of query results */
  onProfileResults: () => void;
  /** Whether profiling is available for the current results */
  isProfilingAvailable: boolean;
}

/** Maximum number of rows to display in the preview table */
const DISPLAY_LIMIT = 1000;

/**
 * QueryResults component for FEAT-020 SQL Mode
 *
 * Displays query results in a scrollable table with:
 * - Column headers with sticky positioning
 * - Row limit display (first 1,000 of total)
 * - Profile Results button for profiling query output
 * - Copy results functionality
 * - Empty state handling
 */
const QueryResults: Component<QueryResultsProps> = (props) => {
  const [showToast, setShowToast] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal('');
  const [toastType, setToastType] = createSignal<'success' | 'error'>('success');

  // Get rows to display (limited to DISPLAY_LIMIT)
  const displayRows = createMemo(() => {
    if (!props.results) return [];
    return props.results.slice(0, DISPLAY_LIMIT);
  });

  // Check if results are truncated
  const isTruncated = createMemo(() => props.totalRows > DISPLAY_LIMIT);

  // Format cell value for display
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Get null display class
  const getNullClass = (value: unknown): string => {
    if (value === null || value === undefined) {
      return 'text-slate-500 italic';
    }
    return 'text-slate-200';
  };

  // Copy results to clipboard as CSV
  const handleCopyResults = async () => {
    if (!props.results || props.results.length === 0) return;

    try {
      // Build CSV content
      const headerRow = props.columnNames.join('\t');
      const dataRows = props.results.map((row) =>
        props.columnNames
          .map((col) => {
            const value = row[col];
            if (value === null || value === undefined) return '';
            const strValue = String(value);
            // Escape values containing tabs or newlines
            if (strValue.includes('\t') || strValue.includes('\n') || strValue.includes('"')) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          })
          .join('\t'),
      );
      const csvContent = [headerRow, ...dataRows].join('\n');

      await navigator.clipboard.writeText(csvContent);
      setToastMessage('Results copied to clipboard');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to copy results:', err);
      setToastMessage('Failed to copy results');
      setToastType('error');
      setShowToast(true);
    }
  };

  const dismissToast = () => {
    setShowToast(false);
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Results Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="text-slate-200 font-semibold">
            {new Intl.NumberFormat().format(props.totalRows)} rows returned
          </span>
          <Show when={isTruncated()}>
            <span class="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium">
              Showing first {new Intl.NumberFormat().format(DISPLAY_LIMIT)}
            </span>
          </Show>
        </div>

        <div class="flex items-center gap-3">
          {/* Copy Results Button */}
          <Show when={props.results && props.results.length > 0}>
            <button
              onClick={handleCopyResults}
              class="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors border border-slate-600 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              aria-label="Copy results to clipboard"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Copy
            </button>
          </Show>

          {/* Profile Results Button */}
          <button
            onClick={() => props.onProfileResults()}
            disabled={!props.isProfilingAvailable}
            class="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Profile Results
          </button>
        </div>
      </div>

      {/* Results Table */}
      <Show
        when={props.results && props.results.length > 0}
        fallback={
          <Show
            when={props.results !== null}
            fallback={
              <EmptyState
                icon={
                  <svg
                    class="w-16 h-16 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                }
                title="Run a query to see results"
                description="Enter a SQL query and click 'Run Query' to view data"
              />
            }
          >
            <EmptyState
              icon={
                <svg
                  class="w-16 h-16 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              }
              title="No results returned"
              description="The query executed successfully but returned no rows"
            />
          </Show>
        }
      >
        <div class="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm max-h-96 overflow-y-auto">
          <table class="w-full text-left border-collapse">
            <caption class="sr-only">Query results</caption>
            <thead class="sticky top-0 bg-slate-800 z-10 shadow-sm">
              <tr>
                <For each={props.columnNames}>
                  {(col) => (
                    <th
                      class="p-3 border-b border-slate-700 text-sm font-semibold text-slate-300 whitespace-nowrap"
                      title={col}
                    >
                      {col}
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={displayRows()}>
                {(row, index) => (
                  <tr
                    class={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      index() % 2 === 1 ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    <For each={props.columnNames}>
                      {(col) => (
                        <td
                          class={`p-3 text-sm tabular-nums ${getNullClass(row[col])} max-w-[300px] truncate`}
                          title={formatCellValue(row[col])}
                        >
                          <Show
                            when={row[col] !== null && row[col] !== undefined}
                            fallback={<span class="text-slate-500 italic">null</span>}
                          >
                            {formatCellValue(row[col])}
                          </Show>
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        {/* Truncation Message */}
        <Show when={isTruncated()}>
          <p class="text-sm text-slate-400 text-center">
            Showing {new Intl.NumberFormat().format(DISPLAY_LIMIT)} of{' '}
            {new Intl.NumberFormat().format(props.totalRows)} rows.{' '}
            <span class="text-slate-300">Use "Profile Results" to analyze the full dataset.</span>
          </p>
        </Show>
      </Show>

      {/* Toast Notification */}
      <Show when={showToast()}>
        <Toast message={toastMessage()} type={toastType()} onDismiss={dismissToast} />
      </Show>
    </div>
  );
};

export default QueryResults;
