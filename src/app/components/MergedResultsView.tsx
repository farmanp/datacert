import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import type { MergedStats, MergedColumnStats } from '../utils/statsAggregation';
import QualityBadge from './QualityBadge';

interface MergedResultsViewProps {
  mergedStats: MergedStats;
}

type SortKey = 'name' | 'count' | 'missing' | 'distinctEstimate' | 'inferredType' | 'mean';

/**
 * MergedResultsView Component
 *
 * Displays aggregated statistics from merged files.
 * Shows:
 * - Summary card with total rows, files merged, column count
 * - Table view with merged column statistics
 * - Note showing which files were merged
 */
const MergedResultsView: Component<MergedResultsViewProps> = (props) => {
  const [sortKey, setSortKey] = createSignal<SortKey>('name');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');
  const [showFileList, setShowFileList] = createSignal(false);

  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(val);
  };

  const healthScore = createMemo(() => {
    const stats = props.mergedStats.columnStats;
    if (!stats || stats.length === 0) return { value: 0, color: 'text-rose-400' };

    let totalCount = 0;
    let totalMissing = 0;

    for (const col of stats) {
      totalCount += col.count;
      totalMissing += col.missing;
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

  const sortedStats = createMemo(() => {
    const key = sortKey();
    const order = sortOrder();
    const stats = [...props.mergedStats.columnStats];

    return stats.sort((a, b) => {
      let v1: string | number;
      let v2: string | number;

      switch (key) {
        case 'name':
          v1 = a.name;
          v2 = b.name;
          break;
        case 'count':
          v1 = a.count;
          v2 = b.count;
          break;
        case 'missing':
          v1 = a.count > 0 ? (a.missing / a.count) * 100 : 0;
          v2 = b.count > 0 ? (b.missing / b.count) * 100 : 0;
          break;
        case 'distinctEstimate':
          v1 = a.distinctEstimate;
          v2 = b.distinctEstimate;
          break;
        case 'inferredType':
          v1 = a.inferredType;
          v2 = b.inferredType;
          break;
        case 'mean':
          v1 = a.mean ?? -Infinity;
          v2 = b.mean ?? -Infinity;
          break;
        default:
          v1 = a.name;
          v2 = b.name;
      }

      if (v1 < v2) return order === 'asc' ? -1 : 1;
      if (v1 > v2) return order === 'asc' ? 1 : -1;
      return 0;
    });
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey() === key) {
      setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getAriaSort = (key: SortKey): 'ascending' | 'descending' | 'none' => {
    if (sortKey() !== key) return 'none';
    return sortOrder() === 'asc' ? 'ascending' : 'descending';
  };

  const SortIcon = (iconProps: { active: boolean; order: 'asc' | 'desc' }) => (
    <span
      class={`ml-1 transition-opacity ${iconProps.active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
    >
      {iconProps.order === 'asc' ? '\u2191' : '\u2193'}
    </span>
  );

  return (
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Merge Summary Banner */}
      <div class="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <svg
              class="w-6 h-6 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-amber-400">Merged Statistics</h3>
            <p class="text-sm text-amber-200/80 mt-1">
              Aggregated data from {props.mergedStats.totalFiles} files with{' '}
              {formatNumber(props.mergedStats.totalRows)} total rows
            </p>
            <button
              type="button"
              onClick={() => setShowFileList(!showFileList())}
              class="mt-2 text-xs text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1"
            >
              <span>{showFileList() ? 'Hide' : 'Show'} merged files</span>
              <svg
                class={`w-3 h-3 transition-transform ${showFileList() ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <Show when={showFileList()}>
              <ul class="mt-3 space-y-1">
                <For each={props.mergedStats.fileNames}>
                  {(fileName) => (
                    <li class="flex items-center gap-2 text-xs text-amber-200/70">
                      <svg
                        class="w-3 h-3 text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      {fileName}
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <For
          each={[
            {
              label: 'Total Rows',
              value: props.mergedStats.totalRows,
              color: 'text-white',
            },
            {
              label: 'Files Merged',
              value: props.mergedStats.totalFiles,
              color: 'text-amber-400',
            },
            {
              label: 'Total Columns',
              value: props.mergedStats.columnStats.length,
              color: 'text-white',
            },
            {
              label: 'Health Score',
              value: `${healthScore().value}%`,
              color: healthScore().color,
            },
          ]}
        >
          {(kpi) => (
            <div class="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm hover:border-slate-500 transition-colors group">
              <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1 group-hover:text-slate-300 transition-colors">
                {kpi.label}
              </p>
              <p class={`text-3xl font-bold font-heading ${kpi.color} tabular-nums`}>
                {typeof kpi.value === 'number' ? formatNumber(kpi.value) : kpi.value}
              </p>
            </div>
          )}
        </For>
      </div>

      {/* Merged Statistics Table */}
      <div class="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <table class="w-full text-left border-collapse">
          <caption class="sr-only">Merged column statistics</caption>
          <thead class="sticky top-0 bg-slate-800 z-10 shadow-sm">
            <tr>
              <th class="p-4 border-b border-slate-700">
                <button
                  onClick={() => toggleSort('name')}
                  aria-sort={getAriaSort('name')}
                  class="text-sm font-semibold text-slate-300 cursor-pointer group flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Column <SortIcon active={sortKey() === 'name'} order={sortOrder()} />
                </button>
              </th>
              <th class="p-4 border-b border-slate-700">
                <button
                  onClick={() => toggleSort('inferredType')}
                  aria-sort={getAriaSort('inferredType')}
                  class="text-sm font-semibold text-slate-300 cursor-pointer group flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Type <SortIcon active={sortKey() === 'inferredType'} order={sortOrder()} />
                </button>
              </th>
              <th class="p-4 border-b border-slate-700 text-right">
                <button
                  onClick={() => toggleSort('count')}
                  aria-sort={getAriaSort('count')}
                  class="text-sm font-semibold text-slate-300 cursor-pointer group flex items-center ml-auto rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Count <SortIcon active={sortKey() === 'count'} order={sortOrder()} />
                </button>
              </th>
              <th class="p-4 border-b border-slate-700 text-right">
                <button
                  onClick={() => toggleSort('missing')}
                  aria-sort={getAriaSort('missing')}
                  class="text-sm font-semibold text-slate-300 cursor-pointer group flex items-center ml-auto rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Missing % <SortIcon active={sortKey() === 'missing'} order={sortOrder()} />
                </button>
              </th>
              <th class="hidden md:table-cell p-4 border-b border-slate-700 text-right">
                <button
                  onClick={() => toggleSort('distinctEstimate')}
                  aria-sort={getAriaSort('distinctEstimate')}
                  class="text-sm font-semibold text-slate-300 cursor-pointer group flex items-center ml-auto rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Distinct{' '}
                  <SortIcon active={sortKey() === 'distinctEstimate'} order={sortOrder()} />
                </button>
              </th>
              <th class="hidden md:table-cell p-4 border-b border-slate-700 text-right">
                <button
                  onClick={() => toggleSort('mean')}
                  aria-sort={getAriaSort('mean')}
                  class="text-sm font-semibold text-slate-300 cursor-pointer group flex items-center ml-auto rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Mean <SortIcon active={sortKey() === 'mean'} order={sortOrder()} />
                </button>
              </th>
              <th class="hidden lg:table-cell p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 text-right">
                Std Dev
              </th>
              <th class="hidden lg:table-cell p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 text-right">
                Min
              </th>
              <th class="hidden lg:table-cell p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 text-right">
                Max
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={sortedStats()}>
              {(col) => <MergedColumnRow column={col} formatNumber={formatNumber} />}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Individual row component for merged column stats
 */
const MergedColumnRow: Component<{
  column: MergedColumnStats;
  formatNumber: (val: number | null | undefined) => string;
}> = (props) => {
  const [showTopValues, setShowTopValues] = createSignal(false);

  const missingPercent = () =>
    props.column.count > 0 ? (props.column.missing / props.column.count) * 100 : 0;

  return (
    <>
      <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors group">
        <td class="p-4 font-medium text-slate-100 truncate max-w-[200px]" title={props.column.name}>
          <div class="flex items-center gap-2">
            {props.column.name}
            <Show when={props.column.topValues && props.column.topValues.length > 0}>
              <button
                type="button"
                onClick={() => setShowTopValues(!showTopValues())}
                class="p-1 rounded hover:bg-slate-600 transition-colors"
                title="Show top values"
              >
                <svg
                  class={`w-4 h-4 text-slate-400 transition-transform ${showTopValues() ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </Show>
          </div>
        </td>
        <td class="p-4">
          <span class="px-2 py-1 rounded bg-slate-700 text-slate-300 text-[10px] font-mono uppercase tracking-wider">
            {props.column.inferredType}
          </span>
        </td>
        <td class="p-4 text-right text-slate-300 tabular-nums text-sm">
          {props.formatNumber(props.column.count)}
        </td>
        <td class="p-4 text-right">
          <QualityBadge missingPercentage={missingPercent()} />
        </td>
        <td class="hidden md:table-cell p-4 text-right text-slate-300 tabular-nums text-sm">
          {props.formatNumber(props.column.distinctEstimate)}
        </td>
        <td class="hidden md:table-cell p-4 text-right text-slate-300 tabular-nums text-sm">
          {props.formatNumber(props.column.mean)}
        </td>
        <td class="hidden lg:table-cell p-4 text-right text-slate-300 tabular-nums text-sm">
          {props.formatNumber(props.column.stdDev)}
        </td>
        <td class="hidden lg:table-cell p-4 text-right text-slate-300 tabular-nums text-sm">
          {props.formatNumber(props.column.min)}
        </td>
        <td class="hidden lg:table-cell p-4 text-right text-slate-300 tabular-nums text-sm">
          {props.formatNumber(props.column.max)}
        </td>
      </tr>
      {/* Top Values Expansion */}
      <Show when={showTopValues() && props.column.topValues && props.column.topValues.length > 0}>
        <tr class="bg-slate-800/30">
          <td colSpan={9} class="p-4">
            <div class="pl-4 border-l-2 border-slate-600">
              <p class="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">
                Top Values (Merged)
              </p>
              <div class="flex flex-wrap gap-2">
                <For each={props.column.topValues!.slice(0, 10)}>
                  {(entry) => (
                    <span class="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded text-xs">
                      <span class="text-slate-200 truncate max-w-[150px]" title={entry.value}>
                        {entry.value}
                      </span>
                      <span class="text-slate-400">({props.formatNumber(entry.count)})</span>
                    </span>
                  )}
                </For>
              </div>
            </div>
          </td>
        </tr>
      </Show>
    </>
  );
};

export default MergedResultsView;
