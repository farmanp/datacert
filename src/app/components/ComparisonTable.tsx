import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import {
  comparisonStore,
  ColumnComparison,
  ColumnDiffStatus,
  StatDelta,
} from '../stores/comparisonStore';

/**
 * Helper to format a number for display
 */
const formatNum = (n: number | null | undefined, decimals: number = 2): string => {
  if (n === null || n === undefined || !isFinite(n)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n);
};

/**
 * Helper to format percentage
 */
const formatPercent = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !isFinite(n)) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
};

/**
 * Get status badge styling
 */
const getStatusBadge = (status: ColumnDiffStatus) => {
  switch (status) {
    case 'added':
      return {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        label: 'Added in B',
      };
    case 'removed':
      return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
        label: 'Removed in B',
      };
    case 'modified':
      return {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        label: 'Modified',
      };
    default:
      return {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
        label: 'Unchanged',
      };
  }
};

/**
 * Get delta color styling based on direction
 */
const getDeltaColor = (direction: StatDelta['direction']) => {
  switch (direction) {
    case 'improved':
      return 'text-emerald-400';
    case 'degraded':
      return 'text-red-400';
    case 'unchanged':
      return 'text-slate-500';
    default:
      return 'text-slate-400';
  }
};

/**
 * Delta Cell Component - shows value A, value B, and delta with color coding
 */
const DeltaCell: Component<{
  delta: StatDelta | null;
  label: string;
  showPercent?: boolean;
}> = (props) => {
  return (
    <Show when={props.delta} fallback={<span class="text-slate-500">-</span>}>
      {(delta) => (
        <div class="flex flex-col gap-0.5">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-slate-400">A:</span>
            <span class="text-slate-200 font-mono">{formatNum(delta().valueA)}</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-slate-400">B:</span>
            <span class="text-slate-200 font-mono">{formatNum(delta().valueB)}</span>
          </div>
          <Show when={delta().delta !== null}>
            <div class={`flex items-center gap-1 text-xs font-semibold ${getDeltaColor(delta().direction)}`}>
              <span>Delta:</span>
              <span class="font-mono">
                {props.showPercent
                  ? formatPercent(delta().percentChange)
                  : `${delta().delta! >= 0 ? '+' : ''}${formatNum(delta().delta)}`}
              </span>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
};

/**
 * Comparison Row Component - displays a single column comparison
 */
const ComparisonRow: Component<{ comparison: ColumnComparison }> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const statusBadge = () => getStatusBadge(props.comparison.status);

  // Calculate missing percentages
  const missingPercentA = () => {
    const p = props.comparison.profileA;
    if (!p || p.base_stats.count === 0) return null;
    return (p.base_stats.missing / p.base_stats.count) * 100;
  };

  const missingPercentB = () => {
    const p = props.comparison.profileB;
    if (!p || p.base_stats.count === 0) return null;
    return (p.base_stats.missing / p.base_stats.count) * 100;
  };

  return (
    <tr
      class={`border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors ${
        props.comparison.status === 'removed'
          ? 'bg-red-500/5'
          : props.comparison.status === 'added'
            ? 'bg-emerald-500/5'
            : props.comparison.status === 'modified'
              ? 'bg-amber-500/5'
              : ''
      }`}
    >
      {/* Column Name & Status */}
      <td class="px-4 py-3">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded())}
              class="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={isExpanded() ? 'Collapse details' : 'Expand details'}
            >
              <svg
                class={`w-4 h-4 transition-transform ${isExpanded() ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <span class="font-semibold text-slate-100">{props.comparison.name}</span>
          </div>
          <span
            class={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusBadge().bg} ${statusBadge().text} border ${statusBadge().border} w-fit`}
          >
            {statusBadge().label}
          </span>
        </div>
      </td>

      {/* Type */}
      <td class="px-4 py-3">
        <div class="flex flex-col gap-1">
          <Show
            when={!props.comparison.typeChanged}
            fallback={
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-slate-400">A:</span>
                  <span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-xs">
                    {props.comparison.typeA || '-'}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-slate-400">B:</span>
                  <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-xs border border-amber-500/30">
                    {props.comparison.typeB || '-'}
                  </span>
                </div>
              </div>
            }
          >
            <span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-xs inline-block w-fit">
              {props.comparison.typeA || props.comparison.typeB || '-'}
            </span>
          </Show>
        </div>
      </td>

      {/* Missing % */}
      <td class="px-4 py-3">
        <Show
          when={props.comparison.status !== 'added' && props.comparison.status !== 'removed'}
          fallback={
            <span class="text-slate-500 text-sm">
              {props.comparison.status === 'added'
                ? `${formatNum(missingPercentB())}%`
                : `${formatNum(missingPercentA())}%`}
            </span>
          }
        >
          <DeltaCell delta={props.comparison.missingPercentDelta} label="Missing %" showPercent />
        </Show>
      </td>

      {/* Distinct Count */}
      <td class="px-4 py-3">
        <Show
          when={props.comparison.status !== 'added' && props.comparison.status !== 'removed'}
          fallback={
            <span class="text-slate-500 text-sm font-mono">
              {formatNum(
                props.comparison.status === 'added'
                  ? props.comparison.profileB?.base_stats.distinct_estimate
                  : props.comparison.profileA?.base_stats.distinct_estimate,
                0,
              )}
            </span>
          }
        >
          <DeltaCell delta={props.comparison.distinctDelta} label="Distinct" />
        </Show>
      </td>

      {/* Mean */}
      <td class="px-4 py-3">
        <Show
          when={props.comparison.status !== 'added' && props.comparison.status !== 'removed'}
          fallback={
            <span class="text-slate-500 text-sm font-mono">
              {formatNum(
                props.comparison.status === 'added'
                  ? props.comparison.profileB?.numeric_stats?.mean
                  : props.comparison.profileA?.numeric_stats?.mean,
              )}
            </span>
          }
        >
          <DeltaCell delta={props.comparison.meanDelta} label="Mean" />
        </Show>
      </td>

      {/* Std Dev */}
      <td class="px-4 py-3">
        <Show
          when={props.comparison.status !== 'added' && props.comparison.status !== 'removed'}
          fallback={
            <span class="text-slate-500 text-sm font-mono">
              {formatNum(
                props.comparison.status === 'added'
                  ? props.comparison.profileB?.numeric_stats?.std_dev
                  : props.comparison.profileA?.numeric_stats?.std_dev,
              )}
            </span>
          }
        >
          <DeltaCell delta={props.comparison.stdDevDelta} label="Std Dev" />
        </Show>
      </td>

      {/* Min/Max - shown on expand */}
      <Show when={isExpanded()}>
        <td colspan="6" class="px-4 py-3 bg-slate-800/30">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span class="text-xs text-slate-500 uppercase tracking-wider font-bold">Min</span>
              <DeltaCell delta={props.comparison.minDelta} label="Min" />
            </div>
            <div>
              <span class="text-xs text-slate-500 uppercase tracking-wider font-bold">Max</span>
              <DeltaCell delta={props.comparison.maxDelta} label="Max" />
            </div>
            <Show when={props.comparison.profileA}>
              <div>
                <span class="text-xs text-slate-500 uppercase tracking-wider font-bold">
                  Rows (A)
                </span>
                <p class="text-slate-200 font-mono text-sm">
                  {formatNum(props.comparison.profileA?.base_stats.count, 0)}
                </p>
              </div>
            </Show>
            <Show when={props.comparison.profileB}>
              <div>
                <span class="text-xs text-slate-500 uppercase tracking-wider font-bold">
                  Rows (B)
                </span>
                <p class="text-slate-200 font-mono text-sm">
                  {formatNum(props.comparison.profileB?.base_stats.count, 0)}
                </p>
              </div>
            </Show>
          </div>
        </td>
      </Show>
    </tr>
  );
};

/**
 * ComparisonTable Component
 *
 * Displays a side-by-side comparison of two profiled datasets.
 * Shows schema differences (added/removed columns) and statistical deltas.
 */
const ComparisonTable: Component = () => {
  const { store, getSummary } = comparisonStore;
  const [filterStatus, setFilterStatus] = createSignal<ColumnDiffStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = createSignal('');

  const summary = createMemo(() => getSummary());

  const filteredComparisons = createMemo(() => {
    let comparisons = store.comparisons;

    // Filter by status
    if (filterStatus() !== 'all') {
      comparisons = comparisons.filter((c) => c.status === filterStatus());
    }

    // Filter by search query
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      comparisons = comparisons.filter((c) => c.name.toLowerCase().includes(query));
    }

    return comparisons;
  });

  return (
    <div class="w-full space-y-4">
      {/* Summary Cards */}
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">
            Total Columns
          </p>
          <p class="text-2xl font-bold text-white tabular-nums">{summary().total}</p>
        </div>
        <button
          onClick={() => setFilterStatus(filterStatus() === 'added' ? 'all' : 'added')}
          class={`bg-slate-800/50 p-4 rounded-xl border transition-colors text-left ${
            filterStatus() === 'added'
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-700/50 hover:border-emerald-500/50'
          }`}
        >
          <p class="text-[10px] text-emerald-400 uppercase tracking-widest font-black mb-1">
            Added
          </p>
          <p class="text-2xl font-bold text-emerald-400 tabular-nums">{summary().added}</p>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus() === 'removed' ? 'all' : 'removed')}
          class={`bg-slate-800/50 p-4 rounded-xl border transition-colors text-left ${
            filterStatus() === 'removed'
              ? 'border-red-500 bg-red-500/10'
              : 'border-slate-700/50 hover:border-red-500/50'
          }`}
        >
          <p class="text-[10px] text-red-400 uppercase tracking-widest font-black mb-1">Removed</p>
          <p class="text-2xl font-bold text-red-400 tabular-nums">{summary().removed}</p>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus() === 'modified' ? 'all' : 'modified')}
          class={`bg-slate-800/50 p-4 rounded-xl border transition-colors text-left ${
            filterStatus() === 'modified'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-700/50 hover:border-amber-500/50'
          }`}
        >
          <p class="text-[10px] text-amber-400 uppercase tracking-widest font-black mb-1">
            Modified
          </p>
          <p class="text-2xl font-bold text-amber-400 tabular-nums">{summary().modified}</p>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus() === 'unchanged' ? 'all' : 'unchanged')}
          class={`bg-slate-800/50 p-4 rounded-xl border transition-colors text-left ${
            filterStatus() === 'unchanged'
              ? 'border-slate-500 bg-slate-500/10'
              : 'border-slate-700/50 hover:border-slate-500/50'
          }`}
        >
          <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">
            Unchanged
          </p>
          <p class="text-2xl font-bold text-slate-400 tabular-nums">{summary().unchanged}</p>
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div class="relative flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              class="h-5 w-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search columns..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>

        <Show when={filterStatus() !== 'all'}>
          <button
            onClick={() => setFilterStatus('all')}
            class="text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear filter
          </button>
        </Show>
      </div>

      {/* Results info */}
      <p class="text-sm text-slate-400">
        Showing <span class="text-slate-200 font-semibold">{filteredComparisons().length}</span> of{' '}
        <span class="text-slate-200 font-semibold">{summary().total}</span> columns
      </p>

      {/* Table */}
      <div class="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/30">
        <table class="w-full min-w-[800px]">
          <thead>
            <tr class="border-b border-slate-700 bg-slate-800/50">
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Column
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Type
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Missing %
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Distinct
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Mean
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Std Dev
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={filteredComparisons()}>
              {(comparison) => <ComparisonRow comparison={comparison} />}
            </For>
          </tbody>
        </table>

        <Show when={filteredComparisons().length === 0}>
          <div class="p-8 text-center">
            <svg
              class="w-12 h-12 text-slate-600 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p class="text-slate-400">No columns match your criteria</p>
            <button
              onClick={() => {
                setFilterStatus('all');
                setSearchQuery('');
              }}
              class="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default ComparisonTable;
