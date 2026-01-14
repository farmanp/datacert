import { Component, createSignal, Show, For, createEffect, on } from 'solid-js';
import { fileStore } from '../stores/fileStore';
import { profileStore } from '../stores/profileStore';
import { authStore } from '../stores/auth.store';
import { gcsBrowserService, GCSObject, parseGCSUrl, isSupportedDataFormat } from '../services/gcs-browser';
import { validateGCSUrl } from '../services/gcs-streaming.service';

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
  { id: 'gcs', name: 'Google Cloud', description: 'GCS buckets (OAuth)', icon: '☁️' },
];

interface RemoteSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// CORS setup instructions component
const CORSSetupInstructions: Component<{ bucketName?: string }> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const corsJson = () => `[
  {
    "origin": ["${origin}"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]`;

  const gsutilCommand = () =>
    `gsutil cors set cors.json gs://${props.bucketName || 'your-bucket-name'}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div class="mt-4 border border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded())}
        class="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
      >
        <span class="text-sm font-medium text-amber-400">CORS Setup Required</span>
        <svg
          class={`w-5 h-5 text-slate-400 transition-transform ${isExpanded() ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Show when={isExpanded()}>
        <div class="p-4 bg-slate-900/50 space-y-4">
          <p class="text-xs text-slate-400">
            To access files from your browser, you need to configure CORS (Cross-Origin Resource
            Sharing) on your GCS bucket.
          </p>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                1. Create cors.json
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(corsJson())}
                class="text-xs text-blue-400 hover:text-blue-300"
              >
                Copy
              </button>
            </div>
            <pre class="bg-slate-950 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
              {corsJson()}
            </pre>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Apply to bucket
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(gsutilCommand())}
                class="text-xs text-blue-400 hover:text-blue-300"
              >
                Copy
              </button>
            </div>
            <pre class="bg-slate-950 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
              {gsutilCommand()}
            </pre>
          </div>

          <p class="text-xs text-slate-500">
            Note: You need the{' '}
            <code class="bg-slate-800 px-1 rounded">storage.buckets.update</code> permission to
            configure CORS on a bucket.
          </p>
        </div>
      </Show>
    </div>
  );
};

// GCS File Browser component
const GCSFileBrowser: Component<{
  bucket: string;
  onSelectFile: (url: string) => void;
}> = (props) => {
  const [files, setFiles] = createSignal<GCSObject[]>([]);
  const [currentPath, setCurrentPath] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [nextPageToken, setNextPageToken] = createSignal<string | undefined>();

  const loadFiles = async (path: string = '', pageToken?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gcsBrowserService.browseFolder(props.bucket, path, 50, pageToken);
      if (pageToken) {
        setFiles((prev) => [...prev, ...result.items]);
      } else {
        setFiles(result.items);
      }
      setCurrentPath(result.currentPath);
      setNextPageToken(result.nextPageToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Load files when bucket changes
  createEffect(
    on(
      () => props.bucket,
      (bucket) => {
        if (bucket) {
          loadFiles('');
        }
      }
    )
  );

  const navigateToFolder = (folderPath: string) => {
    const parsed = parseGCSUrl(folderPath);
    if (parsed) {
      loadFiles(parsed.path);
    }
  };

  const navigateUp = () => {
    const path = currentPath();
    if (path) {
      const parts = path.split('/').filter(Boolean);
      parts.pop();
      loadFiles(parts.join('/'));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div class="border border-slate-700 rounded-xl overflow-hidden">
      {/* Breadcrumb navigation */}
      <div class="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700">
        <button
          type="button"
          onClick={() => loadFiles('')}
          class="text-xs text-blue-400 hover:text-blue-300"
        >
          {props.bucket}
        </button>
        <Show when={currentPath()}>
          <For each={currentPath().split('/').filter(Boolean)}>
            {(part, index) => (
              <>
                <span class="text-slate-600">/</span>
                <button
                  type="button"
                  onClick={() => {
                    const path = currentPath()
                      .split('/')
                      .filter(Boolean)
                      .slice(0, index() + 1)
                      .join('/');
                    loadFiles(path);
                  }}
                  class="text-xs text-blue-400 hover:text-blue-300"
                >
                  {part}
                </button>
              </>
            )}
          </For>
        </Show>
        <Show when={currentPath()}>
          <button
            type="button"
            onClick={navigateUp}
            class="ml-auto text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Up
          </button>
        </Show>
      </div>

      {/* File list */}
      <div class="max-h-64 overflow-y-auto">
        <Show when={loading() && files().length === 0}>
          <div class="flex items-center justify-center py-8">
            <svg class="w-6 h-6 animate-spin text-blue-400" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </Show>

        <Show when={error()}>
          <div class="px-4 py-6 text-center">
            <p class="text-sm text-red-400">{error()}</p>
          </div>
        </Show>

        <Show when={!loading() && !error() && files().length === 0}>
          <div class="px-4 py-6 text-center text-sm text-slate-500">No files found</div>
        </Show>

        <Show when={files().length > 0}>
          <table class="w-full">
            <tbody>
              <For each={files()}>
                {(file) => (
                  <tr
                    class={`border-b border-slate-800 last:border-b-0 ${
                      file.isFolder || isSupportedDataFormat(file.name)
                        ? 'hover:bg-slate-800/50 cursor-pointer'
                        : 'opacity-50'
                    }`}
                    onClick={() => {
                      if (file.isFolder) {
                        navigateToFolder(file.fullPath);
                      } else if (isSupportedDataFormat(file.name)) {
                        props.onSelectFile(file.fullPath);
                      }
                    }}
                  >
                    <td class="px-4 py-2">
                      <div class="flex items-center gap-2">
                        <span class="text-lg">
                          {file.isFolder ? '📁' : isSupportedDataFormat(file.name) ? '📊' : '📄'}
                        </span>
                        <span class="text-sm text-slate-300 truncate max-w-xs">{file.name}</span>
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right">
                      <span class="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          <Show when={nextPageToken()}>
            <button
              type="button"
              onClick={() => loadFiles(currentPath(), nextPageToken())}
              disabled={loading()}
              class="w-full py-2 text-xs text-blue-400 hover:text-blue-300 bg-slate-800/30"
            >
              {loading() ? 'Loading...' : 'Load more'}
            </button>
          </Show>
        </Show>
      </div>
    </div>
  );
};

const RemoteSourcesModal: Component<RemoteSourcesModalProps> = (props) => {
  const [selectedSource, setSelectedSource] = createSignal(SOURCES[0]);
  const [url, setUrl] = createSignal('');
  const [bucketName, setBucketName] = createSignal('');
  const [urlValidation, setUrlValidation] = createSignal<{ valid: boolean; error?: string }>({
    valid: true,
  });
  const [showBrowser, setShowBrowser] = createSignal(false);

  const { store: fileState } = fileStore;

  // Validate GCS URL as user types
  createEffect(
    on(
      () => url(),
      (currentUrl) => {
        if (selectedSource().id === 'gcs' && currentUrl.startsWith('gs://')) {
          setUrlValidation(validateGCSUrl(currentUrl));
          // Extract bucket name for CORS instructions
          const parsed = parseGCSUrl(currentUrl);
          if (parsed) {
            setBucketName(parsed.bucket);
          }
        } else {
          setUrlValidation({ valid: true });
        }
      }
    )
  );

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!url()) return;

    // Validate GCS URL before submitting
    if (selectedSource().id === 'gcs' && url().startsWith('gs://')) {
      const validation = validateGCSUrl(url());
      if (!validation.valid) {
        setUrlValidation(validation);
        return;
      }
    }

    if (selectedSource().id === 'gcs') {
      await profileStore.profileGCSUrl(url());
    } else {
      await profileStore.profileRemoteUrl(url());
    }
    props.onClose();
  };

  const handleGoogleSignIn = async () => {
    await authStore.login();
  };

  const handleGoogleSignOut = () => {
    authStore.logout();
    setShowBrowser(false);
    setBucketName('');
  };

  const handleBrowseBucket = () => {
    if (bucketName()) {
      setShowBrowser(true);
    }
  };

  const handleFileSelect = (fileUrl: string) => {
    setUrl(fileUrl);
    setShowBrowser(false);
  };

  // Reset state when source changes
  createEffect(
    on(
      () => selectedSource().id,
      () => {
        setUrl('');
        setBucketName('');
        setShowBrowser(false);
        setUrlValidation({ valid: true });
      }
    )
  );

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
                    class={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      selectedSource().id === source.id
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
          <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
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
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div class="flex-1 p-8">
              {/* GCS-specific content */}
              <Show when={selectedSource().id === 'gcs'}>
                {/* Auth status banner */}
                <Show when={authStore.state.isAuthenticated}>
                  <div class="flex items-center justify-between mb-6 p-4 bg-green-900/20 border border-green-700/30 rounded-xl">
                    <div class="flex items-center gap-3">
                      <Show when={authStore.state.user?.picture}>
                        <img
                          src={authStore.state.user?.picture}
                          alt="Profile"
                          class="w-8 h-8 rounded-full"
                        />
                      </Show>
                      <div>
                        <p class="text-sm font-medium text-green-400">Signed in as</p>
                        <p class="text-xs text-slate-400">{authStore.state.user?.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      class="text-xs text-slate-400 hover:text-slate-300"
                    >
                      Sign out
                    </button>
                  </div>
                </Show>

                <Show when={!authStore.state.isAuthenticated}>
                  <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                      <svg
                        class="w-8 h-8 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h4 class="text-lg font-bold text-slate-100 mb-2">
                      Sign in to access private buckets
                    </h4>
                    <p class="text-slate-400 text-sm mb-4">
                      Authenticate with Google to access your GCS buckets. For public buckets, you
                      can skip this step.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      class="bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-3 mx-auto"
                    >
                      <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Sign in with Google
                    </button>
                    <Show when={authStore.state.error}>
                      <p class="mt-3 text-sm text-red-400">{authStore.state.error}</p>
                    </Show>
                  </div>
                  <div class="border-b border-slate-800 mb-6" />
                </Show>

                <form onSubmit={handleSubmit} class="w-full max-w-lg mx-auto">
                  {/* Bucket name input */}
                  <div class="mb-4">
                    <label class="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      Bucket Name
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="text"
                        value={bucketName()}
                        onInput={(e) => {
                          setBucketName(e.currentTarget.value);
                          // Update URL with new bucket if there's already a path
                          const currentUrl = url();
                          if (currentUrl.startsWith('gs://')) {
                            const parsed = parseGCSUrl(currentUrl);
                            if (parsed && parsed.path) {
                              setUrl(`gs://${e.currentTarget.value}/${parsed.path}`);
                            }
                          }
                        }}
                        placeholder="my-bucket-name"
                        class="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <Show when={authStore.state.isAuthenticated && bucketName()}>
                        <button
                          type="button"
                          onClick={handleBrowseBucket}
                          class="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          </svg>
                          Browse
                        </button>
                      </Show>
                    </div>
                  </div>

                  {/* File browser */}
                  <Show when={showBrowser() && bucketName()}>
                    <div class="mb-4">
                      <GCSFileBrowser bucket={bucketName()} onSelectFile={handleFileSelect} />
                    </div>
                  </Show>

                  {/* Full gs:// URL input */}
                  <div class="mb-4">
                    <label class="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      File URL
                    </label>
                    <input
                      type="text"
                      autofocus
                      value={url()}
                      onInput={(e) => setUrl(e.currentTarget.value)}
                      placeholder="gs://bucket/path/to/file.csv"
                      class={`w-full px-4 py-3 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        !urlValidation().valid ? 'border-red-500' : 'border-slate-800'
                      }`}
                    />
                    <Show when={!urlValidation().valid}>
                      <p class="mt-2 text-xs text-red-400">{urlValidation().error}</p>
                    </Show>
                    <Show when={urlValidation().valid && url().startsWith('gs://')}>
                      <p class="mt-2 text-xs text-green-400">Valid GCS URL</p>
                    </Show>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      !url() || fileState.state === 'processing' || !urlValidation().valid
                    }
                    class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40"
                  >
                    {fileState.state === 'processing' ? (
                      <span class="flex items-center justify-center gap-2">
                        <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                          <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                            fill="none"
                          />
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Processing Remote File...
                      </span>
                    ) : (
                      'Profile File'
                    )}
                  </button>

                  {/* CORS setup instructions */}
                  <CORSSetupInstructions bucketName={bucketName()} />
                </form>
              </Show>

              {/* Non-GCS sources (original behavior) */}
              <Show when={selectedSource().id !== 'gcs'}>
                <Show when={selectedSource().requiresAuth && !authStore.state.isAuthenticated}>
                  <div class="text-center max-w-sm mx-auto">
                    <div class="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                      <svg
                        class="w-8 h-8 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h4 class="text-xl font-bold text-slate-100 mb-2">Sign In Required</h4>
                    <p class="text-slate-400 text-sm mb-8 leading-relaxed">
                      {selectedSource().name} connections require authentication to keep your data
                      secure.
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
                  <form onSubmit={handleSubmit} class="w-full max-w-lg mx-auto">
                    <div class="mb-6">
                      <label class="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
                        URL / Connection String
                      </label>
                      <input
                        type="text"
                        autofocus
                        value={url()}
                        onInput={(e) => setUrl(e.currentTarget.value)}
                        placeholder={
                          selectedSource().id === 's3'
                            ? 's3://bucket/data.csv or https://...'
                            : 'https://example.com/data.parquet'
                        }
                        class="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                      />
                      <Show when={selectedSource().id === 'custom'}>
                        <p class="mt-4 text-xs text-slate-500 italic">
                          Note: CORS must be enabled on the remote server for direct browser-based
                          profiling.
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
                            <circle
                              class="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              stroke-width="4"
                              fill="none"
                            />
                            <path
                              class="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Processing Remote File...
                        </span>
                      ) : (
                        'Profile URL'
                      )}
                    </button>
                  </form>
                </Show>
              </Show>
            </div>

            <div class="p-4 bg-slate-950/30 text-right">
              <span class="text-[10px] text-slate-600 uppercase font-black tracking-widest">
                DataCert Cloud Import Engine v1.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default RemoteSourcesModal;
