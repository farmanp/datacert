import { createSignal, onMount, onCleanup, Show } from 'solid-js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = createSignal(false);
  const [isInstalled, setIsInstalled] = createSignal(false);

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    setInstallPrompt(e as BeforeInstallPromptEvent);
    setIsVisible(true);
  };

  const handleAppInstalled = () => {
    setIsInstalled(true);
    setIsVisible(false);
    setInstallPrompt(null);
  };

  onMount(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
  });

  onCleanup(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });

  const handleInstallClick = async () => {
    const prompt = installPrompt();
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      setIsVisible(false);
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <Show when={isVisible() && !isInstalled()}>
      <div class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 z-50">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-lg">dp</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-slate-100">Install DataCert</h3>
            <p class="mt-1 text-sm text-slate-400">
              Install this app for quick access and offline use.
            </p>
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
            onClick={handleInstallClick}
            class="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            class="px-4 py-2 bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all border border-slate-600"
          >
            Not now
          </button>
        </div>
      </div>
    </Show>
  );
}
