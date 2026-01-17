import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import { batchStore } from '../stores/batchStore';
import { TrendAnalysis, ColumnDelta, getComparisonSummary } from '../utils/nwayComparison';
import { TrendBadge } from './TrendIndicator';

type SortOption = 'most_changed' | 'column_name' | 'type';

/**
 * Helper to format numbers for display
 */
const formatNum = (n: number | null | undefined, decimals: number = 2): string => {
  if (n === null || n === undefined || !isFinite(n)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n);
};

/**
 * Helper to format percentage change
 */
const formatPctChange = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !isFinite(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

/**
 * Get color class based on delta direction
 */
const getDeltaColor = (delta: number, lowerIsBetter: boolean = false): string => {
  const threshold = 0.01;
  if (Math.abs(delta) < threshold) return 'text-slate-400';
  if (lowerIsBetter) {
    return delta < 0 ? 'text-emerald-400' : 'text-red-400';
  }
  return delta > 0 ? 'text-emerald-400' : 'text-red-400';
};

/**
 * Get background color class based on delta
 */
const getDeltaBgColor = (delta: number, lowerIsBetter: boolean = false): string => {
  const threshold = 0.01;
  if (Math.abs(delta) < threshold) return '';
  if (lowerIsBetter) {
    return delta < 0 ? 'bg-emerald-500/5' : 'bg-red-500/5';
  }
  return delta > 0 ? 'bg-emerald-500/5' : 'bg-red-500/5';
};

/**
 * ColumnComparisonRow Component
 *
 * Displays a single column's comparison data across all files
 */
const ColumnComparisonRow: Component<{
  columnName: string;
  baselineType: string;
  deltas: { fileId: string; fileName: string; delta: ColumnDelta | null }[];
  trends: TrendAnalysis[];
  isExpanded: boolean;
  onToggle: () => void;
}> = (props) => {
  // Get trends for this column
  const columnTrends = () => props.trends.filter((t) => t.column === props.columnName);

  const nullRateTrend = () => columnTrends().find((t) => t.metric === 'nullRate');
  const meanTrend = () => columnTrends().find((t) => t.metric === 'mean');
  const distinctTrend = () => columnTrends().find((t) => t.metric === 'distinctCount');

  // Check if any file has type changes
  const hasTypeChange = () => props.deltas.some((d) => d.delta?.typeChanged);

  // Get first delta for baseline values
  const baselineDelta = () => props.deltas.find((d) => d.delta !== null)?.delta;

  return (
    <>
      {/* Main row */}
      <tr class="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
        {/* Column name and expand button */}
        <td class="px-4 py-3 sticky left-0 bg-slate-900/95 z-10">
          <div class="flex items-center gap-2">
            <button
              onClick={() => props.onToggle()}
              class="text-slate-400 hover:text-slate-200 transition-colors p-1"
              aria-label={props.isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                class={`w-4 h-4 transition-transform ${props.isExpanded ? 'rotate-90' : ''}`}
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
            <div class="flex flex-col">
              <span class="font-semibold text-slate-100">{props.columnName}</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-xs">
                  {props.baselineType}
                </span>
                <Show when={hasTypeChange()}>
                  <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                    Type Changed
                  </span>
                </Show>
              </div>
            </div>
          </div>
        </td>

        {/* Trend indicators */}
        <td class="px-4 py-3">
          <div class="flex flex-wrap gap-1.5">
            <Show when={nullRateTrend()}>
              <TrendBadge
                direction={nullRateTrend()!.direction}
                label="Null"
                size="sm"
                showLabel={true}
              />
            </Show>
            <Show when={meanTrend()}>
              <TrendBadge
                direction={meanTrend()!.direction}
                label="Mean"
                size="sm"
                showLabel={true}
              />
            </Show>
            <Show when={distinctTrend()}>
              <TrendBadge
                direction={distinctTrend()!.direction}
                label="Distinct"
                size="sm"
                showLabel={true}
              />
            </Show>
          </div>
        </td>

        {/* Baseline values */}
        <td class="px-4 py-3">
          <Show when={baselineDelta()} fallback={<span class="text-slate-500">-</span>}>
            <div class="flex flex-col gap-0.5 text-xs">
              <span class="text-slate-400">
                Null:{' '}
                <span class="text-slate-200 font-mono">
                  {formatNum(baselineDelta()!.baseline.nullRate * 100, 1)}%
                </span>
              </span>
              <span class="text-slate-400">
                Distinct:{' '}
                <span class="text-slate-200 font-mono">
                  {formatNum(baselineDelta()!.baseline.distinctCount, 0)}
                </span>
              </span>
              <Show when={baselineDelta()!.baseline.mean !== undefined}>
                <span class="text-slate-400">
                  Mean:{' '}
                  <span class="text-slate-200 font-mono">
                    {formatNum(baselineDelta()!.baseline.mean)}
                  </span>
                </span>
              </Show>
            </div>
          </Show>
        </td>

        {/* Delta values for each file */}
        <For each={props.deltas}>
          {(item) => (
            <td
              class={`px-4 py-3 ${item.delta ? getDeltaBgColor(item.delta.changes.nullRate.delta, true) : ''}`}
            >
              <Show when={item.delta} fallback={<span class="text-slate-500">N/A</span>}>
                {(delta) => (
                  <div class="flex flex-col gap-0.5 text-xs">
                    <span class={getDeltaColor(delta().changes.nullRate.delta, true)}>
                      Null: {formatPctChange(delta().changes.nullRate.pctChange)}
                    </span>
                    <span class={getDeltaColor(delta().changes.distinctCount.delta)}>
                      Distinct: {formatPctChange(delta().changes.distinctCount.pctChange)}
                    </span>
                    <Show when={delta().changes.mean}>
                      <span class={getDeltaColor(delta().changes.mean!.delta)}>
                        Mean: {formatPctChange(delta().changes.mean!.pctChange)}
                      </span>
                    </Show>
                  </div>
                )}
              </Show>
            </td>
          )}
        </For>
      </tr>

      {/* Expanded details row */}
      <Show when={props.isExpanded}>
        <tr class="bg-slate-800/30 border-b border-slate-700/50">
          <td colspan={3 + props.deltas.length} class="px-6 py-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Baseline details */}
              <div>
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Baseline Values
                </h4>
                <Show when={baselineDelta()}>
                  <div class="space-y-1 text-sm">
                    <p>
                      <span class="text-slate-400">Row Count:</span>{' '}
                      <span class="text-slate-200 font-mono">
                        {formatNum(baselineDelta()!.baseline.rowCount, 0)}
                      </span>
                    </p>
                    <p>
                      <span class="text-slate-400">Null Rate:</span>{' '}
                      <span class="text-slate-200 font-mono">
                        {formatNum(baselineDelta()!.baseline.nullRate * 100, 2)}%
                      </span>
                    </p>
                    <p>
                      <span class="text-slate-400">Distinct:</span>{' '}
                      <span class="text-slate-200 font-mono">
                        {formatNum(baselineDelta()!.baseline.distinctCount, 0)}
                      </span>
                    </p>
                    <Show when={baselineDelta()!.baseline.mean !== undefined}>
                      <p>
                        <span class="text-slate-400">Mean:</span>{' '}
                        <span class="text-slate-200 font-mono">
                          {formatNum(baselineDelta()!.baseline.mean)}
                        </span>
                      </p>
                    </Show>
                    <Show when={baselineDelta()!.baseline.stdDev !== undefined}>
                      <p>
                        <span class="text-slate-400">Std Dev:</span>{' '}
                        <span class="text-slate-200 font-mono">
                          {formatNum(baselineDelta()!.baseline.stdDev)}
                        </span>
                      </p>
                    </Show>
                  </div>
                </Show>
              </div>

              {/* Per-file details */}
              <For each={props.deltas.filter((d) => d.delta !== null)}>
                {(item) => (
                  <div>
                    <h4
                      class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 truncate"
                      title={item.fileName}
                    >
                      {item.fileName}
                    </h4>
                    <Show when={item.delta}>
                      {(delta) => (
                        <div class="space-y-1 text-sm">
                          <p>
                            <span class="text-slate-400">Row Count:</span>{' '}
                            <span class="text-slate-200 font-mono">
                              {formatNum(delta().current.rowCount, 0)}
                            </span>
                            <span class={`ml-1 ${getDeltaColor(delta().changes.rowCount.delta)}`}>
                              ({formatPctChange(delta().changes.rowCount.pctChange)})
                            </span>
                          </p>
                          <p>
                            <span class="text-slate-400">Null Rate:</span>{' '}
                            <span class="text-slate-200 font-mono">
                              {formatNum(delta().current.nullRate * 100, 2)}%
                            </span>
                            <span
                              class={`ml-1 ${getDeltaColor(delta().changes.nullRate.delta, true)}`}
                            >
                              ({formatPctChange(delta().changes.nullRate.pctChange)})
                            </span>
                          </p>
                          <p>
                            <span class="text-slate-400">Distinct:</span>{' '}
                            <span class="text-slate-200 font-mono">
                              {formatNum(delta().current.distinctCount, 0)}
                            </span>
                            <span
                              class={`ml-1 ${getDeltaColor(delta().changes.distinctCount.delta)}`}
                            >
                              ({formatPctChange(delta().changes.distinctCount.pctChange)})
                            </span>
                          </p>
                          <Show when={delta().changes.mean}>
                            <p>
                              <span class="text-slate-400">Mean:</span>{' '}
                              <span class="text-slate-200 font-mono">
                                {formatNum(delta().current.mean)}
                              </span>
                              <span class={`ml-1 ${getDeltaColor(delta().changes.mean!.delta)}`}>
                                ({formatPctChange(delta().changes.mean!.pctChange)})
                              </span>
                            </p>
                          </Show>
                          <Show when={delta().typeChanged}>
                            <p class="text-amber-400">
                              Type: {delta().baselineType} → {delta().currentType}
                            </p>
                          </Show>
                        </div>
                      )}
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </td>
        </tr>
      </Show>
    </>
  );
};

/**
 * NWayComparisonView Component
 *
 * Main view for N-way comparison mode showing:
 * - Header with baseline file name and comparison count
 * - Summary cards with key metrics
 * - Trend indicators per column
 * - Expandable column rows with delta details
 */
const NWayComparisonView: Component = () => {
  const { store } = batchStore;
  const [sortBy, setSortBy] = createSignal<SortOption>('most_changed');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [expandedColumns, setExpandedColumns] = createSignal<Set<string>>(new Set());

  // Get baseline file
  const baselineFile = createMemo(() => store.files.find((f) => f.isBaseline));

  // Get comparison deltas from store
  const comparisonDeltas = createMemo(() => store.comparisonDeltas || []);

  // Get trend analysis from store
  const trendAnalysis = createMemo(() => store.trendAnalysis || []);

  // Get comparison summary
  const summary = createMemo(() => getComparisonSummary(comparisonDeltas()));

  // Get all unique columns from all deltas
  const allColumns = createMemo(() => {
    const columns = new Map<string, { type: string; deltas: ColumnDelta[] }>();

    for (const comp of comparisonDeltas()) {
      for (const delta of comp.deltas) {
        if (!columns.has(delta.column)) {
          columns.set(delta.column, { type: delta.baselineType, deltas: [] });
        }
        columns.get(delta.column)!.deltas.push(delta);
      }
    }

    return columns;
  });

  // Sort and filter columns
  const sortedColumns = createMemo(() => {
    const columnsArray = Array.from(allColumns().entries()).map(([name, data]) => ({
      name,
      type: data.type,
      deltas: data.deltas,
    }));

    // Apply search filter
    let filtered = columnsArray;
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      filtered = columnsArray.filter((c) => c.name.toLowerCase().includes(query));
    }

    // Apply sort
    switch (sortBy()) {
      case 'column_name':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'type':
        return filtered.sort(
          (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
        );
      case 'most_changed':
      default:
        return filtered.sort((a, b) => {
          const scoreA = a.deltas.reduce(
            (sum, d) =>
              sum +
              Math.abs(d.changes.nullRate.pctChange ?? 0) +
              Math.abs(d.changes.distinctCount.pctChange ?? 0),
            0,
          );
          const scoreB = b.deltas.reduce(
            (sum, d) =>
              sum +
              Math.abs(d.changes.nullRate.pctChange ?? 0) +
              Math.abs(d.changes.distinctCount.pctChange ?? 0),
            0,
          );
          return scoreB - scoreA;
        });
    }
  });

  // Toggle column expansion
  const toggleColumn = (columnName: string) => {
    const expanded = new Set(expandedColumns());
    if (expanded.has(columnName)) {
      expanded.delete(columnName);
    } else {
      expanded.add(columnName);
    }
    setExpandedColumns(expanded);
  };

  // Build delta lookup for each column and file
  const getDeltasForColumn = (columnName: string) => {
    return comparisonDeltas().map((comp) => ({
      fileId: comp.fileId,
      fileName: comp.fileName,
      delta: comp.deltas.find((d) => d.column === columnName) || null,
    }));
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-white tracking-tight">N-Way Comparison</h2>
          <Show when={baselineFile()}>
            <p class="text-slate-400 mt-1">
              Baseline: <span class="text-purple-400 font-semibold">{baselineFile()!.name}</span>
              {' vs '}
              <span class="text-amber-400 font-semibold">{comparisonDeltas().length}</span> files
            </p>
          </Show>
        </div>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">
            Files Compared
          </p>
          <p class="text-2xl font-bold text-white tabular-nums">{summary().totalFilesCompared}</p>
        </div>
        <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">
            Columns Tracked
          </p>
          <p class="text-2xl font-bold text-blue-400 tabular-nums">
            {summary().totalColumnsTracked}
          </p>
        </div>
        <div class="bg-slate-800/50 p-4 rounded-xl border border-amber-500/30">
          <p class="text-[10px] text-amber-400 uppercase tracking-widest font-black mb-1">
            Significant Changes
          </p>
          <p class="text-2xl font-bold text-amber-400 tabular-nums">
            {summary().significantChanges}
          </p>
        </div>
        <div class="bg-slate-800/50 p-4 rounded-xl border border-emerald-500/30">
          <p class="text-[10px] text-emerald-400 uppercase tracking-widest font-black mb-1">
            Added Columns
          </p>
          <p class="text-2xl font-bold text-emerald-400 tabular-nums">{summary().addedColumns}</p>
        </div>
        <div class="bg-slate-800/50 p-4 rounded-xl border border-red-500/30">
          <p class="text-[10px] text-red-400 uppercase tracking-widest font-black mb-1">
            Removed Columns
          </p>
          <p class="text-2xl font-bold text-red-400 tabular-nums">{summary().removedColumns}</p>
        </div>
        <div class="bg-slate-800/50 p-4 rounded-xl border border-purple-500/30">
          <p class="text-[10px] text-purple-400 uppercase tracking-widest font-black mb-1">
            Type Changes
          </p>
          <p class="text-2xl font-bold text-purple-400 tabular-nums">{summary().typeChanges}</p>
        </div>
      </div>

      {/* Controls */}
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
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

        {/* Sort dropdown */}
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-400">Sort by:</span>
          <select
            value={sortBy()}
            onChange={(e) => setSortBy(e.currentTarget.value as SortOption)}
            class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="most_changed">Most Changed</option>
            <option value="column_name">Column Name</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p class="text-sm text-slate-400">
        Showing <span class="text-slate-200 font-semibold">{sortedColumns().length}</span> of{' '}
        <span class="text-slate-200 font-semibold">{allColumns().size}</span> columns
      </p>

      {/* Comparison Table */}
      <div class="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/30">
        <table class="w-full min-w-[800px]">
          <thead>
            <tr class="border-b border-slate-700 bg-slate-800/50">
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-800/95 z-10">
                Column
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Trends
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Baseline
              </th>
              <For each={comparisonDeltas()}>
                {(comp) => (
                  <th
                    class="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider"
                    title={comp.fileName}
                  >
                    <div class="max-w-[120px] truncate">{comp.fileName}</div>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={sortedColumns()}>
              {(column) => (
                <ColumnComparisonRow
                  columnName={column.name}
                  baselineType={column.type}
                  deltas={getDeltasForColumn(column.name)}
                  trends={trendAnalysis()}
                  isExpanded={expandedColumns().has(column.name)}
                  onToggle={() => toggleColumn(column.name)}
                />
              )}
            </For>
          </tbody>
        </table>

        {/* Empty state */}
        <Show when={sortedColumns().length === 0}>
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
            <p class="text-slate-400">No columns match your search</p>
            <button
              onClick={() => setSearchQuery('')}
              class="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        </Show>
      </div>

      {/* Schema Changes Summary */}
      <Show when={summary().addedColumns > 0 || summary().removedColumns > 0}>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 class="text-lg font-bold text-white mb-4">Schema Changes</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Added Columns */}
            <Show when={summary().addedColumns > 0}>
              <div>
                <h4 class="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  Added Columns ({summary().addedColumns})
                </h4>
                <div class="flex flex-wrap gap-2">
                  <For each={comparisonDeltas()}>
                    {(comp) => (
                      <For each={comp.addedColumns}>
                        {(colName) => (
                          <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs border border-emerald-500/30">
                            {colName}
                            <span class="text-emerald-500/60 ml-1">({comp.fileName})</span>
                          </span>
                        )}
                      </For>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Removed Columns */}
            <Show when={summary().removedColumns > 0}>
              <div>
                <h4 class="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">
                  Removed Columns ({summary().removedColumns})
                </h4>
                <div class="flex flex-wrap gap-2">
                  <For each={comparisonDeltas()}>
                    {(comp) => (
                      <For each={comp.removedColumns}>
                        {(colName) => (
                          <span class="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs border border-red-500/30">
                            {colName}
                            <span class="text-red-500/60 ml-1">({comp.fileName})</span>
                          </span>
                        )}
                      </For>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default NWayComparisonView;
