import { Component, createSignal, Show, For } from 'solid-js';
import { fileStore } from '../stores/fileStore';
import { profileStore } from '../stores/profileStore';
import { authStore } from '../stores/auth.store';

interface Source {
    id: string;
    name: string;
    description: string;
    icon: string;
    requiresAuth?: boolean;
}

const SOURCES: Source[] = [
    { id: 'custom', name: 'Custom URL', description: 'Import from any public URL', icon: '🔗' },
    { id: 's3', name: 'Amazon S3', description: 'Public S3 buckets', icon: '📦' },
    { id: 'huggingface', name: 'HuggingFace', description: 'ML datasets', icon: '🤗' },
    { id: 'motherduck', name: 'MotherDuck', description: 'Cloud DuckDB', icon: '🦆' },
    { id: 'postgresql', name: 'PostgreSQL', description: 'PG databases', icon: '🐘', requiresAuth: true },
    { id: 'gsheets', name: 'Google Sheets', description: 'Published Google Sheets', icon: '📊' },
    { id: 'gcs', name: 'Google Cloud', description: 'Public GCS buckets', icon: '☁️' },
];

interface RemoteSourcesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RemoteSourcesModal: Component<RemoteSourcesModalProps> = (props) => {
    const [selectedSource, setSelectedSource] = createSignal(SOURCES[0]);
    const [url, setUrl] = createSignal('');

    const { store: fileState } = fileStore;

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!url()) return;

        if (selectedSource().id === 'gcs') {
            await profileStore.profileGCSUrl(url());
        } else {
            await profileStore.profileRemoteUrl(url());
        }
        props.onClose();
    };

    return (
        <Show when={props.isOpen}>
            <div
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => e.target === e.currentTarget && props.onClose()}
            >
                <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[80vh] flex overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                    {/* Sidebar */}
                    <div class="w-64 border-r border-slate-800 bg-slate-900/50 p-4 shrink-0">
                        <h2 class="text-lg font-bold text-slate-100 mb-6 px-2">Import from Cloud</h2>
                        <nav class="space-y-1">
                            <For each={SOURCES}>
                                {(source) => (
                                    <button
                                        onClick={() => setSelectedSource(source)}
                                        class={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${selectedSource().id === source.id
                                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                                            }`}
                                    >
                                        <span class="text-xl">{source.icon}</span>
                                        <div class="text-left">
                                            <p class="text-sm font-bold leading-none">{source.name}</p>
                                            <p class="text-[10px] opacity-60 mt-1">{source.description}</p>
                                        </div>
                                    </button>
                                )}
                            </For>
                        </nav>
                    </div>

                    {/* Content */}
                    <div class="flex-1 flex flex-col min-w-0">
                        <div class="flex justify-between items-center p-6 border-b border-slate-800">
                            <div class="flex items-center gap-4">
                                <span class="text-3xl">{selectedSource().icon}</span>
                                <div>
                                    <h3 class="text-xl font-bold text-slate-100">{selectedSource().name}</h3>
                                    <p class="text-sm text-slate-400">{selectedSource().description}</p>
                                </div>
                            </div>
                            <button
                                onClick={props.onClose}
                                class="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div class="flex-1 p-8 flex flex-col items-center justify-center">
                            <Show when={selectedSource().requiresAuth && !authStore.state.isAuthenticated}>
                                <div class="text-center max-w-sm">
                                    <div class="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                                        <svg class="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h4 class="text-xl font-bold text-slate-100 mb-2">Sign In Required</h4>
                                    <p class="text-slate-400 text-sm mb-8 leading-relaxed">
                                        {selectedSource().name} connections require authentication to keep your data secure.
                                    </p>
                                    <div class="flex flex-col gap-3">
                                        <button class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20">
                                            Get Started Free
                                        </button>
                                        <button class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-8 rounded-xl transition-all border border-slate-700">
                                            Sign In
                                        </button>
                                    </div>
                                </div>
                            </Show>

                            <Show when={!selectedSource().requiresAuth || authStore.state.isAuthenticated}>
                                <form onSubmit={handleSubmit} class="w-full max-w-lg">
                                    <div class="mb-6">
                                        <label class="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">URL / Connection String</label>
                                        <input
                                            type="text"
                                            autofocus
                                            value={url()}
                                            onInput={(e) => setUrl(e.currentTarget.value)}
                                            placeholder={
                                                selectedSource().id === 's3' ? 's3://bucket/data.csv or https://...' :
                                                    selectedSource().id === 'gcs' ? 'gs://bucket/data.csv or https://...' :
                                                        'https://example.com/data.parquet'
                                            }
                                            class="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                        />
                                        <Show when={selectedSource().id === 'custom'}>
                                            <p class="mt-4 text-xs text-slate-500 italic">
                                                Note: CORS must be enabled on the remote server for direct browser-based profiling.
                                            </p>
                                        </Show>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!url() || fileState.state === 'processing'}
                                        class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40"
                                    >
                                        {fileState.state === 'processing' ? (
                                            <span class="flex items-center justify-center gap-2">
                                                <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Processing Remote File...
                                            </span>
                                        ) : 'Profile URL'}
                                    </button>
                                </form>
                            </Show>
                        </div>

                        <div class="p-4 bg-slate-950/30 text-right">
                            <span class="text-[10px] text-slate-600 uppercase font-black tracking-widest">DataCert Cloud Import Engine v1.0</span>
                        </div>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default RemoteSourcesModal;
