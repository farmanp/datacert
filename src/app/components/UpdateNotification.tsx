import { createSignal, onMount, Show } from 'solid-js';
import { registerSW } from 'virtual:pwa-register';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = createSignal(false);
  const [updateSW, setUpdateSW] = createSignal<((reloadPage?: boolean) => Promise<void>) | null>(
    null,
  );

  onMount(() => {
    const updateServiceWorker = registerSW({
      onNeedRefresh() {
        setShowUpdate(true);
      },
      onOfflineReady() {
        console.info('App ready to work offline');
      },
      onRegistered(registration) {
        console.info('Service worker registered:', registration);
      },
      onRegisterError(error) {
        console.error('Service worker registration error:', error);
      },
    });

    setUpdateSW(() => updateServiceWorker);
  });

  const handleUpdate = async () => {
    const update = updateSW();
    if (update) {
      await update(true);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  return (
    <Show when={showUpdate()}>
      <div class="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 z-50">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 bg-emerald-900/50 rounded-full flex items-center justify-center">
            <svg
              class="w-6 h-6 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-slate-100">Update Available</h3>
            <p class="mt-1 text-sm text-slate-400">A new version of DataCert is available.</p>
          </div>
          <button
            onClick={handleDismiss}
            class="flex-shrink-0 text-slate-400 hover:text-slate-300"
            aria-label="Dismiss"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div class="mt-4 flex gap-2">
          <button
            onClick={handleUpdate}
            class="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold rounded-lg hover:from-emerald-500 hover:to-green-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all"
          >
            Update Now
          </button>
          <button
            onClick={handleDismiss}
            class="px-4 py-2 bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all border border-slate-600"
          >
            Later
          </button>
        </div>
      </div>
    </Show>
  );
}
