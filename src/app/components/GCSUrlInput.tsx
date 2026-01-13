import { Component, createSignal, Show } from 'solid-js';
import { profileStore } from '../stores/profileStore';
import { authStore } from '../stores/auth.store';
import { fileStore } from '../stores/fileStore';

const GCSUrlInput: Component = () => {
  const [url, setUrl] = createSignal('');
  const { profileGCSUrl } = profileStore;
  const { state: authState } = authStore;
  const { store: fileState } = fileStore;

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (url()) {
      profileGCSUrl(url());
    }
  };

  return (
    <div class="w-full mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
      <h3 class="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
        <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
        Profile from Google Cloud Storage
      </h3>
      
      <Show 
        when={authState.isAuthenticated}
        fallback={
            <div class="text-center py-4">
                <p class="text-sm text-slate-400 mb-3">Sign in to access your GCS buckets</p>
                {/* GCSAuthButton is rendered in Home, but we could put a placeholder or call to action here */}
            </div>
        }
      >
        <form onSubmit={handleSubmit} class="space-y-3">
            <div>
                <label for="gcs-url" class="sr-only">GCS URL</label>
                <input
                    id="gcs-url"
                    type="text"
                    value={url()}
                    onInput={(e) => setUrl(e.currentTarget.value)}
                    placeholder="gs://my-bucket/data.csv or https://storage.googleapis.com/..."
                    class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={fileState.state === 'processing'}
                />
            </div>
            
            <div class="flex justify-between items-center">
                <p class="text-xs text-slate-500">
                    Supports <code class="bg-slate-800 px-1 rounded">gs://</code> and <code class="bg-slate-800 px-1 rounded">https://</code>
                </p>
                <button
                    type="submit"
                    disabled={!url() || fileState.state === 'processing'}
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {fileState.state === 'processing' ? 'Processing...' : 'Profile File'}
                </button>
            </div>
            
            <Show when={fileState.error}>
                <div class="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p class="text-xs text-red-400">{fileState.error}</p>
                    <Show when={fileState.error?.includes('CORS')}>
                        <a 
                            href="#" 
                            class="text-xs text-red-300 underline mt-1 block hover:text-red-200"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View CORS Setup Guide
                        </a>
                    </Show>
                </div>
            </Show>
        </form>
      </Show>
    </div>
  );
};

export default GCSUrlInput;
