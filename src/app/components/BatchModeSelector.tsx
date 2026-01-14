import { Component, For } from 'solid-js';
import { batchStore, BatchMode } from '../stores/batchStore';

interface ModeOption {
  mode: BatchMode;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const MODES: ModeOption[] = [
  {
    mode: 'sequential',
    label: 'Sequential',
    description: 'Profile each file separately, view results in tabs',
    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    color: 'blue',
  },
  {
    mode: 'merge',
    label: 'Merge',
    description: 'Combine files with matching schemas into aggregated statistics',
    icon: 'M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z',
    color: 'emerald',
  },
  {
    mode: 'comparison',
    label: 'Compare',
    description: 'Compare multiple files against a baseline for drift detection',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    color: 'purple',
  },
];

/**
 * BatchModeSelector Component
 *
 * A three-button toggle for selecting batch processing mode.
 * Displays visual descriptions and icons for each mode.
 */
const BatchModeSelector: Component = () => {
  const { store, setMode } = batchStore;

  const getColorClasses = (mode: ModeOption, isSelected: boolean) => {
    const colorMap: Record<string, { selected: string; hover: string; icon: string }> = {
      blue: {
        selected: 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50',
        hover: 'hover:border-blue-500/50 hover:bg-blue-500/10',
        icon: 'text-blue-400',
      },
      emerald: {
        selected: 'border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/50',
        hover: 'hover:border-emerald-500/50 hover:bg-emerald-500/10',
        icon: 'text-emerald-400',
      },
      purple: {
        selected: 'border-purple-500 bg-purple-500/20 ring-2 ring-purple-500/50',
        hover: 'hover:border-purple-500/50 hover:bg-purple-500/10',
        icon: 'text-purple-400',
      },
    };

    const colors = colorMap[mode.color];
    if (isSelected) {
      return {
        container: colors.selected,
        icon: colors.icon,
      };
    }
    return {
      container: `border-slate-700 ${colors.hover}`,
      icon: 'text-slate-400 group-hover:' + colors.icon,
    };
  };

  return (
    <div class="w-full">
      <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
        Select Processing Mode
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <For each={MODES}>
          {(mode) => {
            const isSelected = () => store.mode === mode.mode;
            const colorClasses = () => getColorClasses(mode, isSelected());

            return (
              <button
                type="button"
                class={`
                  group relative p-4 rounded-xl border transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
                  ${colorClasses().container}
                  ${store.isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => !store.isProcessing && setMode(mode.mode)}
                disabled={store.isProcessing}
                aria-pressed={isSelected()}
                aria-label={`${mode.label} mode: ${mode.description}`}
              >
                {/* Selected indicator */}
                {isSelected() && (
                  <div class="absolute top-2 right-2">
                    <svg
                      class={`w-5 h-5 ${colorClasses().icon}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div class="flex items-center gap-3 mb-2">
                  <div
                    class={`p-2 rounded-lg transition-colors ${
                      isSelected()
                        ? `bg-${mode.color}-500/30`
                        : `bg-slate-700 group-hover:bg-${mode.color}-500/20`
                    }`}
                  >
                    <svg
                      class={`w-5 h-5 transition-colors ${colorClasses().icon}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d={mode.icon} />
                    </svg>
                  </div>
                  <span
                    class={`font-bold text-lg tracking-tight transition-colors ${
                      isSelected() ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </span>
                </div>

                {/* Description */}
                <p
                  class={`text-sm leading-relaxed transition-colors ${
                    isSelected() ? 'text-slate-200' : 'text-slate-400'
                  }`}
                >
                  {mode.description}
                </p>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default BatchModeSelector;
