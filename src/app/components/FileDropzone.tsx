import { Component, Show, Switch, Match, createMemo } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { fileStore, FILE_ACCEPT, SUPPORTED_EXTENSIONS } from '../stores/fileStore';
import { profileStore } from '../stores/profileStore';
import { formatFileSizeLimit } from '../config/fileSizeConfig';
import ErrorDisplay from './ErrorDisplay';

const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB for cancel confirmation

/**
 * FileDropzone Component
 *
 * A drag-and-drop file upload zone with the following features:
 * - Visual states: idle, hover, processing, error, success
 * - Click-to-browse file picker
 * - File type validation (CSV, TSV, JSON, JSONL)
 * - File size display
 * - Keyboard accessibility (Enter/Space to open picker)
 * - ARIA labels for accessibility
 * - Progress indicator during processing
 */
const FileDropzone: Component = () => {
  let fileInputRef: HTMLInputElement | undefined;
  const navigate = useNavigate();

  const { store, selectFile, confirmFile, cancelPending, setHover, reset, formatFileSize } = fileStore;

  // Compute the current visual state class
  const stateClasses = createMemo(() => {
    switch (store.state) {
      case 'hover':
        return 'border-blue-500 bg-blue-500/20 scale-[1.02] shadow-[0_0_40px_rgba(59,130,246,0.3)] ring-4 ring-blue-500/10';
      case 'processing':
        return 'border-amber-500 bg-amber-500/10 cursor-wait';
      case 'error':
        return 'border-red-500 bg-red-500/10';
      case 'success':
        return 'border-emerald-500 bg-emerald-500/10';
      default:
        return 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50';
    }
  });

  const onFileSelected = async (file: File) => {
    selectFile(file);
  };



  // Handle confirmation: user chose to profile anyway
  const handleProfileAnyway = async () => {
    if (confirmFile()) {
      profileStore.startProfiling();
    }
  };

  // Handle confirmation: user chose tree mode
  const handleUseTreeMode = () => {
    const file = store.pendingFile;
    if (!file) return;
    confirmFile(file); // Confirm it so it's in the store
    navigate('/tree-mode');
  };

  // Handle confirmation: user cancelled
  const handleCancelLargeFile = () => {
    cancelPending();
  };

  // Handle file input change
  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    // Reset input so same file can be selected again
    target.value = '';
  };

  // Handle click on dropzone
  const handleClick = () => {
    if (store.state !== 'processing') {
      fileInputRef?.click();
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && store.state !== 'processing') {
      e.preventDefault();
      fileInputRef?.click();
    }
  };

  // Handle drag events
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(true);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set hover to false if we're leaving the dropzone entirely
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget as Node;
    if (!currentTarget.contains(relatedTarget)) {
      setHover(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(false);

    const file = e.dataTransfer?.files[0];
    if (file) {
      onFileSelected(file);
    }
  };

  // Handle cancel button click
  const handleCancel = (e: MouseEvent) => {
    e.stopPropagation();
    const fileSize = store.file?.size || 0;

    // For large files (>50MB), show confirmation
    if (fileSize > LARGE_FILE_THRESHOLD) {
      const confirmed = window.confirm('Cancel processing?');
      if (!confirmed) return;
    }

    profileStore.cancelProfiling();
  };

  // Get icon based on state using Switch/Match for proper reactivity
  const StateIcon: Component = () => (
    <Switch fallback={
      <svg
        class="w-12 h-12 text-slate-400 group-hover:text-slate-300 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    }>
      <Match when={store.state === 'processing'}>
        <svg class="w-12 h-12 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </Match>
      <Match when={store.state === 'error'}>
        <svg class="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </Match>
      <Match when={store.state === 'success'}>
        <svg
          class="w-12 h-12 text-emerald-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </Match>
      <Match when={store.state === 'hover'}>
        <svg
          class="w-12 h-12 text-blue-500 hover:scale-110 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </Match>
    </Switch>
  );

  return (
    <div class="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_ACCEPT}
        class="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={store.state === 'processing' ? -1 : 0}
        class={`
          group relative flex flex-col items-center justify-center
          w-full min-h-[200px] p-8
          border-2 border-dashed rounded-xl
          transition-all duration-200 ease-out
          cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
          ${stateClasses()}
          ${store.state === 'processing' ? 'pointer-events-none' : ''}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="File upload dropzone. Drag and drop a file or click to browse."
        aria-describedby="dropzone-description"
        aria-busy={store.state === 'processing'}
        aria-invalid={store.state === 'error'}
      >
        {/* Icon */}
        <div class="mb-4">
          <StateIcon />
        </div>

        {/* Text content based on state */}
        <Show when={(store.state === 'idle' || store.state === 'hover') && !store.pendingFile}>
          <div class="text-center">
            <p class="text-lg font-bold font-heading text-slate-200 tracking-tight">
              {store.state === 'hover' ? 'Drop file to analyze' : 'Drag and drop your file here'}
            </p>
            <p class="mt-1 text-sm text-slate-400">
              or <span class="text-blue-400 underline">click to browse</span>
            </p>
            <p id="dropzone-description" class="mt-3 text-[10px] text-slate-400 uppercase tracking-widest font-black">
              Supported: <span class="font-mono text-slate-400">{SUPPORTED_EXTENSIONS.join(', ')}</span>
            </p>
            <p class="mt-1 text-[10px] text-slate-500">
              Max file size: {formatFileSizeLimit()}
            </p>
          </div>
        </Show>

        {/* File confirmation banner - shows for ALL files */}
        <Show when={store.pendingFile}>
          <div class="text-center w-full max-w-md animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Icon - different for small vs large files */}
            <Show
              when={store.showLargeFileWarning}
              fallback={
                <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <svg class="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              }
            >
              <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <svg class="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </Show>

            {/* Title - different for small vs large files */}
            <h3 class={`text-lg font-bold mb-1 ${store.showLargeFileWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
              {store.showLargeFileWarning ? 'Large File Detected' : 'Ready to Profile'}
            </h3>
            <p class="text-slate-400 text-sm mb-1">
              <span class="font-medium text-slate-300">{store.pendingFile?.name}</span>
            </p>
            <p class="text-slate-500 text-xs mb-4 font-mono">
              {formatFileSize(store.pendingFile?.size || 0)}
            </p>

            {/* Warning message - only for large files */}
            <Show when={store.showLargeFileWarning}>
              <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-5">
                <p class="text-amber-300/90 text-sm leading-relaxed">
                  This file may take longer to process.<br />
                  <span class="text-amber-400/70">SQL Mode will be unavailable</span> for in-browser querying.
                </p>
              </div>
            </Show>

            {/* Info message - only for small files */}
            <Show when={!store.showLargeFileWarning}>
              <div class="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 mb-5">
                <p class="text-slate-300/90 text-sm leading-relaxed">
                  Click <span class="font-semibold text-emerald-400">Profile Now</span> to analyze all columns,<br />
                  or use <span class="text-slate-200">Tree Mode</span> to select specific ones.
                </p>
              </div>
            </Show>

            {/* Action buttons */}
            <div class="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={handleProfileAnyway}
                class={`px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 ${store.showLargeFileWarning
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-amber-900/20'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-emerald-900/20'
                  }`}
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                {store.showLargeFileWarning ? 'Profile Anyway' : 'Profile Now'}
              </button>
              <button
                type="button"
                onClick={handleUseTreeMode}
                class="px-5 py-2.5 rounded-xl bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 transition-all border border-slate-600 flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Use Tree Mode
              </button>
              <button
                type="button"
                onClick={handleCancelLargeFile}
                class="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Tip - different for small vs large files */}
            <p class="text-slate-600 text-[10px] mt-4 uppercase tracking-wider">
              {store.showLargeFileWarning
                ? 'Tip: Use Tree Mode to profile specific columns and reduce memory usage'
                : 'Tip: Tree Mode lets you pick specific columns for faster profiling'}
            </p>
          </div>
        </Show>

        <Show when={store.state === 'processing'}>
          <div class="text-center">
            <p class="text-lg font-bold font-heading text-amber-400 tracking-tight">
              {profileStore.store.isCancelling ? 'Cancelling...' : `Processing ${store.file?.name}...`}
            </p>
            <div class="mt-4 w-full max-w-xs">
              {/* Progress bar */}
              <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  class={`h-full rounded-full transition-all duration-200 ${profileStore.store.isCancelling ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  style={{ width: `${store.progress}%` }}
                />
              </div>
              <p class="mt-2 text-sm text-slate-400">{store.progress}% complete</p>
            </div>
            {/* Cancel button */}
            <Show when={!profileStore.store.isCancelling}>
              <button
                type="button"
                class="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 inline-flex items-center gap-2 pointer-events-auto"
                onClick={handleCancel}
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
            </Show>
          </div>
        </Show>

        <Show when={store.state === 'error'}>
          <Show
            when={store.profilerError}
            fallback={
              <div class="text-center">
                <p class="text-lg font-medium text-red-400">{store.error}</p>
                <button
                  type="button"
                  class="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                >
                  Try Again
                </button>
              </div>
            }
          >
            {(profilerError) => (
              <div onClick={(e) => e.stopPropagation()}>
                <ErrorDisplay
                  error={profilerError()}
                  onRetry={() => reset()}
                  onUploadDifferent={() => reset()}
                  compact
                />
              </div>
            )}
          </Show>
        </Show>

        <Show when={store.state === 'success' && store.file}>
          <div class="text-center">
            <p class="text-lg font-medium text-emerald-400">File ready for analysis</p>
            <div class="mt-3 p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <p class="text-sm font-bold text-slate-200">{store.file?.name}</p>
              <p class="text-xs text-slate-400 mt-1 font-mono tracking-tighter">{formatFileSize(store.file?.size || 0)}</p>
            </div>
            <button
              type="button"
              class="mt-4 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
            >
              Upload Different File
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default FileDropzone;
