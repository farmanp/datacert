import { Component, For, Show } from 'solid-js';
import type { ProfilerError, RecoveryAction } from '../types/errors';

interface ErrorDisplayProps {
  error: ProfilerError;
  onRetry?: () => void;
  onUploadDifferent?: () => void;
  onReauthenticate?: () => void;
  onCustomAction?: (handler: string) => void;
  /** Whether to show a compact version (no causes list) */
  compact?: boolean;
}

/**
 * ErrorDisplay Component
 *
 * Displays user-friendly error messages with:
 * - Error icon and title
 * - Clear description
 * - Likely causes (bullet points)
 * - Recovery action buttons
 *
 * Styled consistently with the dark theme (slate-800/900)
 */
const ErrorDisplay: Component<ErrorDisplayProps> = (props) => {
  const handleAction = (action: RecoveryAction) => {
    switch (action.action) {
      case 'retry':
        props.onRetry?.();
        break;
      case 'upload_different':
        props.onUploadDifferent?.();
        break;
      case 'reauthenticate':
        props.onReauthenticate?.();
        break;
      case 'custom':
        if (action.customHandler) {
          props.onCustomAction?.(action.customHandler);
        }
        break;
    }
  };

  return (
    <div
      class="w-full max-w-lg mx-auto bg-slate-800/80 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm"
      role="alert"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      {/* Error Icon and Title */}
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              class="w-6 h-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <h3 id="error-title" class="text-lg font-bold text-red-400 tracking-tight">
            {props.error.title}
          </h3>
          <p id="error-description" class="mt-1 text-sm text-slate-300">
            {props.error.description}
          </p>
        </div>
      </div>

      {/* Likely Causes */}
      <Show when={!props.compact && props.error.causes.length > 0}>
        <div class="mt-5 pt-5 border-t border-slate-700">
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Possible causes
          </h4>
          <ul class="space-y-2">
            <For each={props.error.causes}>
              {(cause) => (
                <li class="flex items-start gap-2 text-sm text-slate-300">
                  <span class="text-red-400 mt-1 flex-shrink-0">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 8 8" aria-hidden="true">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  </span>
                  {cause}
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      {/* Recovery Actions */}
      <Show when={props.error.actions.length > 0}>
        <div class="mt-6 flex flex-wrap gap-3">
          <For each={props.error.actions}>
            {(action, index) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(action);
                }}
                class={`
                  px-4 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                  ${
                    index() === 0
                      ? 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500 shadow-lg shadow-red-900/20'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 focus:ring-slate-500'
                  }
                `}
              >
                {action.label}
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* Debug Info (collapsed) */}
      <Show when={props.error.originalMessage}>
        <details class="mt-5 pt-4 border-t border-slate-700/50">
          <summary class="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
            Technical details
          </summary>
          <pre class="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap break-words">
            {props.error.originalMessage}
          </pre>
        </details>
      </Show>
    </div>
  );
};

export default ErrorDisplay;
