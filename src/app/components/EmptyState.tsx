import { Component, Show, JSX } from 'solid-js';

/**
 * Props for the EmptyState component
 * 
 * @example
 * // Basic usage with just title
 * <EmptyState title="No data available" />
 * 
 * @example
 * // With custom icon and description
 * <EmptyState
 *   icon={<CustomIcon />}
 *   title="No results found"
 *   description="Try adjusting your filters"
 * />
 * 
 * @example
 * // With action button
 * <EmptyState
 *   title="Processing failed"
 *   description="An error occurred while processing your file"
 *   action={{
 *     label: "Try Again",
 *     onClick: () => retry()
 *   }}
 * />
 */
export interface EmptyStateProps {
    /** Optional custom icon element. If not provided, a default icon will be shown */
    icon?: JSX.Element;
    /** Main title text to display */
    title: string;
    /** Optional description text or JSX element to provide additional context */
    description?: string | JSX.Element;
    /** Optional action button configuration */
    action?: {
        /** Button label text */
        label: string;
        /** Click handler for the button */
        onClick: () => void;
    };
}

const EmptyState: Component<EmptyStateProps> = (props) => {
    return (
        <div class="flex flex-col items-center justify-center py-16 text-center">
            <Show when={props.icon} fallback={
                <svg
                    class="w-16 h-16 text-slate-600 mb-4"
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
            }>
                <div class="mb-4">
                    {props.icon}
                </div>
            </Show>

            <h3 class="text-lg text-slate-300 font-semibold mb-1">
                {props.title}
            </h3>

            <Show when={props.description}>
                <p class="text-sm text-slate-400 max-w-md">
                    {props.description}
                </p>
            </Show>

            <Show when={props.action}>
                {(action) => (
                    <button
                        onClick={action().onClick}
                        class="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    >
                        {action().label}
                    </button>
                )}
            </Show>
        </div>
    );
};

export default EmptyState;
