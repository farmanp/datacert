import { Component, Show, createEffect, onCleanup } from 'solid-js';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

const Toast: Component<ToastProps> = (props) => {
  // Auto-dismiss after 3 seconds
  createEffect(() => {
    const timer = setTimeout(() => {
      props.onDismiss();
    }, 3000);

    onCleanup(() => clearTimeout(timer));
  });

  const handleDismiss = () => {
    props.onDismiss();
  };

  return (
    <div
      class={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-white animate-in slide-in-from-bottom-4 fade-in duration-300 ${props.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}
      role="alert"
      aria-live="polite"
    >
      <Show
        when={props.type === 'success'}
        fallback={
          <svg
            class="w-5 h-5 text-rose-100"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        }
      >
        <svg
          class="w-5 h-5 text-emerald-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            d="M5 13l4 4L19 7"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Show>
      <span class="font-medium">{props.message}</span>
      <button
        onClick={handleDismiss}
        class="ml-2 p-1 rounded-lg hover:bg-white/20 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            d="M6 18L18 6M6 6l12 12"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default Toast;
