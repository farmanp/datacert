import { Component, Show, For, createSignal } from 'solid-js';
import { ColumnProfile, profileStore } from '../stores/profileStore';
import { drilldownStore } from '../stores/drilldownStore';
import QualityBadge from './QualityBadge';
import MiniHistogram from './MiniHistogram';
import Histogram from './Histogram';

interface ColumnCardProps {
  profile: ColumnProfile;
}

const ColumnCard: Component<ColumnCardProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);

  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(val);
  };

  const StatItem = (itemProps: { label: string; value: string | number | undefined | null }) => (
    <div class="flex justify-between items-center py-1">
      <span class="text-xs text-slate-400 font-medium">{itemProps.label}</span>
      <span class="text-xs text-slate-200 tabular-nums font-mono">
        {formatNumber(itemProps.value as number)}
      </span>
    </div>
  );

  return (
    <div
      class={`
        bg-slate-800/40 border border-slate-700 rounded-2xl p-5 
        hover:border-slate-500 transition-all duration-300
        flex flex-col gap-4 backdrop-blur-sm
        ${isExpanded() ? 'ring-2 ring-blue-500/50 bg-slate-800/60' : ''}
      `}
    >
      <header class="flex justify-between items-start">
        <div class="truncate mr-2">
          <h3 class="text-sm font-bold text-slate-100 truncate mb-1" title={props.profile.name}>
            {props.profile.name}
          </h3>
          <span class="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-[10px] font-mono uppercase tracking-wider">
            {props.profile.base_stats.inferred_type}
          </span>
        </div>
        <QualityBadge
          missingPercentage={
            (props.profile.base_stats.missing / props.profile.base_stats.count) * 100
          }
          onClick={() => {
            if (props.profile.missing_rows && props.profile.missing_rows.length > 0) {
              const headers = profileStore.store.results?.column_profiles.map(c => c.name) || [];
              drilldownStore.openDrilldown(props.profile, 'missing', props.profile.missing_rows, headers);
            }
          }}
        />
      </header>

      <div class="space-y-1">
        <StatItem label="Count" value={props.profile.base_stats.count} />
        <StatItem label="Distinct" value={props.profile.base_stats.distinct_estimate} />
        <Show when={props.profile.numeric_stats}>
          {(stats) => (
            <>
              <StatItem label="Mean" value={stats().mean} />
              <StatItem label="Median" value={stats().median} />
            </>
          )}
        </Show>
      </div>

      <Show when={props.profile.histogram}>
        {(hist) => (
          <div class="mt-2 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <p class="text-[10px] text-slate-300 uppercase font-black tracking-widest mb-2">
              Distribution
            </p>
            <MiniHistogram histogram={hist()} width={240} height={48} />
          </div>
        )}
      </Show>

      <Show when={props.profile.categorical_stats}>
        {(stats) => (
          <Show when={props.profile.base_stats.inferred_type === 'string'}>
            <div class="mt-2 space-y-2">
              <p class="text-[10px] text-slate-300 uppercase font-black tracking-widest">
                Top Values
              </p>
              <div class="space-y-1">
                <For each={stats().top_values.slice(0, 3)}>
                  {(entry) => (
                    <div class="flex items-center justify-between group/val">
                      <span
                        class="text-[10px] text-slate-300 truncate max-w-[120px]"
                        title={entry.value}
                      >
                        {entry.value || '<empty>'}
                      </span>
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            class="h-full bg-blue-400/50"
                            style={{ width: `${entry.percentage}%` }}
                          />
                        </div>
                        <span class="text-[10px] text-slate-300 tabular-nums">
                          {entry.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        )}
      </Show>

      <button
        onClick={() => setIsExpanded(!isExpanded())}
        aria-expanded={isExpanded()}
        class="mt-auto pt-3 text-[11px] font-black text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1 uppercase tracking-widest rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        {isExpanded() ? 'Show Less' : 'Deep Dive'}
        <svg
          class={`w-3 h-3 transition-transform ${isExpanded() ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            d="M19 9l-7 7-7-7"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <Show when={isExpanded()}>
        <div class="pt-4 border-t border-slate-700/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <Show when={props.profile.histogram}>
            {(hist) => (
              <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                <p class="text-[10px] text-slate-300 uppercase font-black tracking-widest mb-4 text-center">
                  Data Density
                </p>
                <Histogram data={hist()} height={120} />
              </div>
            )}
          </Show>

          <Show when={props.profile.numeric_stats}>
            {(stats) => (
              <div class="grid grid-cols-2 gap-x-6 gap-y-2 bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">
                <StatItem label="Min" value={stats().min} />
                <StatItem label="Max" value={stats().max} />
                <StatItem label="Std Dev" value={stats().std_dev} />
                <StatItem label="Variance" value={stats().variance} />
                <StatItem label="Skewness" value={stats().skewness} />
                <StatItem label="Kurtosis" value={stats().kurtosis} />
                <StatItem label="P25" value={stats().p25} />
                <StatItem label="P75" value={stats().p75} />
                <StatItem label="P90" value={stats().p90} />
                <StatItem label="P99" value={stats().p99} />
              </div>
            )}
          </Show>

          {/* Sample Values Section */}
          <div class="p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
            <p class="text-[10px] text-slate-300 uppercase font-black tracking-widest mb-3">
              Sample Values
            </p>
            <Show
              when={props.profile.sample_values && props.profile.sample_values.length > 0}
              fallback={
                <p class="text-xs text-slate-400 italic">No sample data available</p>
              }
            >
              <div class="flex flex-wrap gap-2">
                <For each={props.profile.sample_values}>
                  {(value) => {
                    const truncated = value.length > 30 ? value.substring(0, 30) + '...' : value;
                    return (
                      <span
                        class="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 font-mono hover:bg-slate-700 transition-colors"
                        title={value}
                      >
                        {truncated}
                      </span>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>

          <Show when={props.profile.notes.length > 0}>
            <div class="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
              <p class="text-[10px] text-amber-400 font-black uppercase mb-2">Automated Insights</p>
              <For each={props.profile.notes}>
                {(note) => <p class="text-[10px] text-amber-500/70 leading-relaxed">• {note}</p>}
              </For>
              <Show when={props.profile.pii_rows && props.profile.pii_rows.length > 0}>
                <button
                  onClick={() => {
                    const headers = profileStore.store.results?.column_profiles.map(c => c.name) || [];
                    drilldownStore.openDrilldown(props.profile, 'pii', props.profile.pii_rows, headers);
                  }}
                  class="mt-2 text-[10px] font-bold text-amber-600 hover:underline cursor-pointer block"
                >
                  View {props.profile.pii_rows.length} PII Rows
                </button>
              </Show>
              <Show when={props.profile.outlier_rows && props.profile.outlier_rows.length > 0}>
                <button
                  onClick={() => {
                    const headers = profileStore.store.results?.column_profiles.map(c => c.name) || [];
                    drilldownStore.openDrilldown(props.profile, 'outlier', props.profile.outlier_rows, headers);
                  }}
                  class="mt-2 text-[10px] font-bold text-rose-500 hover:underline cursor-pointer block"
                >
                  View {props.profile.outlier_rows.length} Outlier Rows
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ColumnCard;
