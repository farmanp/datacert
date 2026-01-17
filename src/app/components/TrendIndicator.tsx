import { Component, Show } from 'solid-js';
import { TrendDirection } from '../utils/nwayComparison';

export interface TrendIndicatorProps {
  direction: TrendDirection;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * TrendIndicator Component
 *
 * Visual indicator showing trend direction with color coding:
 * - Improving (green): upward arrow for positive trends
 * - Degrading (red): downward arrow for negative trends
 * - Stable (gray): horizontal arrow for no significant change
 * - Volatile (amber): bidirectional arrow for mixed/unstable changes
 */
const TrendIndicator: Component<TrendIndicatorProps> = (props) => {
  const size = () => props.size || 'md';

  const sizeClasses = () => {
    switch (size()) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const textSizeClasses = () => {
    switch (size()) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  const getConfig = () => {
    switch (props.direction) {
      case 'improving':
        return {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
          label: props.label || 'Improving',
          icon: (
            <svg
              class={sizeClasses()}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ),
        };
      case 'degrading':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: props.label || 'Degrading',
          icon: (
            <svg
              class={sizeClasses()}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          ),
        };
      case 'stable':
        return {
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/30',
          label: props.label || 'Stable',
          icon: (
            <svg
              class={sizeClasses()}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          ),
        };
      case 'volatile':
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          label: props.label || 'Volatile',
          icon: (
            <svg
              class={sizeClasses()}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          ),
        };
    }
  };

  const config = () => getConfig();

  return (
    <div
      class={`inline-flex items-center gap-1.5 ${config().color}`}
      title={config().label}
      role="img"
      aria-label={`Trend: ${config().label}`}
    >
      {config().icon}
      <Show when={props.showLabel}>
        <span class={`font-medium ${textSizeClasses()}`}>{config().label}</span>
      </Show>
    </div>
  );
};

/**
 * TrendBadge Component
 *
 * A badge version of the trend indicator with background styling
 */
export const TrendBadge: Component<TrendIndicatorProps> = (props) => {
  const size = () => props.size || 'md';

  const sizeClasses = () => {
    switch (size()) {
      case 'sm':
        return 'w-3.5 h-3.5';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  const paddingClasses = () => {
    switch (size()) {
      case 'sm':
        return 'px-1.5 py-0.5';
      case 'lg':
        return 'px-3 py-1.5';
      default:
        return 'px-2 py-1';
    }
  };

  const textSizeClasses = () => {
    switch (size()) {
      case 'sm':
        return 'text-[10px]';
      case 'lg':
        return 'text-sm';
      default:
        return 'text-xs';
    }
  };

  const getConfig = () => {
    switch (props.direction) {
      case 'improving':
        return {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
          label: props.label || 'Improving',
          icon: (
            <svg
              class={sizeClasses()}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ),
        };
      case 'degrading':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: props.label || 'Degrading',
          icon: (
            <svg
              class={sizeClasses()}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          ),
        };
      case 'stable':
        return {
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/30',
          label: props.label || 'Stable',
          icon: (
            <svg
              class={sizeClasses()}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          ),
        };
      case 'volatile':
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          label: props.label || 'Volatile',
          icon: (
            <svg
              class={sizeClasses()}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          ),
        };
    }
  };

  const config = () => getConfig();

  return (
    <div
      class={`inline-flex items-center gap-1 ${paddingClasses()} rounded-full border ${config().bgColor} ${config().borderColor} ${config().color}`}
      title={config().label}
      role="img"
      aria-label={`Trend: ${config().label}`}
    >
      {config().icon}
      <Show when={props.showLabel !== false}>
        <span class={`font-bold uppercase tracking-wider ${textSizeClasses()}`}>
          {config().label}
        </span>
      </Show>
    </div>
  );
};

export default TrendIndicator;
