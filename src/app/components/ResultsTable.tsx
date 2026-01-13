import { Component, For, createSignal, createMemo, Show } from 'solid-js';
import { ColumnProfile } from '../stores/profileStore';
import QualityBadge from './QualityBadge';
import MiniHistogram from './MiniHistogram';

interface ResultsTableProps {
  profiles: ColumnProfile[];
}

type SortKey = keyof ColumnProfile | 'missing_percent' | 'inferred_type';

const ResultsTable: Component<ResultsTableProps> = (props) => {
  const [sortKey, setSortKey] = createSignal<SortKey>('name');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');

  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(val);
  };

  const sortedProfiles = createMemo(() => {
    const key = sortKey();
    const order = sortOrder();

    return [...props.profiles].sort((a, b) => {
      let v1: string | number;
      let v2: string | number;

      if (key === 'missing_percent') {
        v1 = (a.base_stats.missing / a.base_stats.count) * 100;
        v2 = (b.base_stats.missing / b.base_stats.count) * 100;
      } else if (key === 'inferred_type') {
        v1 = a.base_stats.inferred_type;
        v2 = b.base_stats.inferred_type;
      } else if (key === 'name') {
        v1 = a.name;
        v2 = b.name;
      } else {
        v1 = a.base_stats[key as keyof typeof a.base_stats] as string | number;
        v2 = b.base_stats[key as keyof typeof b.base_stats] as string | number;
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

  const SortIcon = (props: { active: boolean; order: 'asc' | 'desc' }) => (
    <span
      class={`ml-1 transition-opacity ${props.active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
    >
      {props.order === 'asc' ? '↑' : '↓'}
    </span>
  );

  return (
    <div class="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm">
      <table class="w-full text-left border-collapse">
        <thead class="sticky top-0 bg-slate-800 z-10 shadow-sm">
          <tr>
            <th
              class="p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 cursor-pointer group"
              onClick={() => toggleSort('name')}
            >
              Column <SortIcon active={sortKey() === 'name'} order={sortOrder()} />
            </th>
            <th
              class="p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 cursor-pointer group"
              onClick={() => toggleSort('inferred_type')}
            >
              Type <SortIcon active={sortKey() === 'inferred_type'} order={sortOrder()} />
            </th>
            <th class="p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 text-right">
              Count
            </th>
            <th
              class="p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 cursor-pointer group text-right"
              onClick={() => toggleSort('missing_percent')}
            >
              Missing % <SortIcon active={sortKey() === 'missing_percent'} order={sortOrder()} />
            </th>
            <th class="p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 text-right">
              Distinct
            </th>
            <th class="p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 text-right">
              Mean
            </th>
            <th class="p-4 text-sm font-semibold text-slate-300 border-b border-slate-700 text-right">
              Median
            </th>
            <th class="p-4 text-sm font-semibold text-slate-300 border-b border-slate-700">
              Distribution
            </th>
          </tr>
        </thead>
        <tbody>
          <For each={sortedProfiles()}>
            {(profile) => (
              <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors group">
                <td
                  class="p-4 font-medium text-slate-100 truncate max-w-[200px]"
                  title={profile.name}
                >
                  {profile.name}
                </td>
                <td class="p-4">
                  <span class="px-2 py-1 rounded bg-slate-700 text-slate-300 text-[10px] font-mono uppercase tracking-wider">
                    {profile.base_stats.inferred_type}
                  </span>
                </td>
                <td class="p-4 text-right text-slate-300 tabular-nums text-sm">
                  {formatNumber(profile.base_stats.count)}
                </td>
                <td class="p-4 text-right">
                  <QualityBadge
                    missingPercentage={
                      (profile.base_stats.missing / profile.base_stats.count) * 100
                    }
                  />
                </td>
                <td class="p-4 text-right text-slate-300 tabular-nums text-sm">
                  {formatNumber(profile.base_stats.distinct_estimate)}
                </td>
                <td class="p-4 text-right text-slate-300 tabular-nums text-sm">
                  {formatNumber(profile.numeric_stats?.mean)}
                </td>
                <td class="p-4 text-right text-slate-300 tabular-nums text-sm">
                  {formatNumber(profile.numeric_stats?.median)}
                </td>
                <td class="p-4 min-w-[140px]">
                  <Show when={profile.histogram}>
                    {(hist) => <MiniHistogram histogram={hist()} width={120} height={24} />}
                  </Show>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;
