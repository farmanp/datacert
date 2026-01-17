import { Component, Show, Switch, Match } from 'solid-js';
import { comparisonStore, ComparisonFileKey, ComparisonFileState } from '../stores/comparisonStore';
import { FILE_ACCEPT, SUPPORTED_EXTENSIONS } from '../stores/fileStore';
import { formatFileSizeLimit } from '../config/fileSizeConfig';

/**
 * SingleDropzone Component
 *
 * A single dropzone for one file in the comparison view.
 * Renders upload state, progress, success, and error states.
 */
const SingleDropzone: Component<{ fileKey: ComparisonFileKey; label: string }> = (props) => {
  let fileInputRef: HTMLInputElement | undefined;

  const { store, selectFile, setHover, resetFile, formatFileSize } = comparisonStore;

  const getFileState = (): ComparisonFileState => {
    return props.fileKey === 'A' ? store.fileA : store.fileB;
  };

  // Compute the current visual state class
  const stateClasses = () => {
    const fileState = getFileState();
    switch (fileState.state) {
      case 'hover':
        return 'border-blue-500 bg-blue-500/10 scale-[1.02]';
      case 'processing':
        return 'border-amber-500 bg-amber-500/10 cursor-wait';
      case 'error':
        return 'border-red-500 bg-red-500/10';
      case 'success':
        return 'border-emerald-500 bg-emerald-500/10';
      default:
        return 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50';
    }
  };

  const onFileSelected = (file: File) => {
    selectFile(props.fileKey, file);
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
    if (getFileState().state !== 'processing') {
      fileInputRef?.click();
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && getFileState().state !== 'processing') {
      e.preventDefault();
      fileInputRef?.click();
    }
  };

  // Handle drag events
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(props.fileKey, true);
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
      setHover(props.fileKey, false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(props.fileKey, false);

    const file = e.dataTransfer?.files[0];
    if (file) {
      onFileSelected(file);
    }
  };

  // Get icon based on state using Switch/Match for proper reactivity
  const StateIcon: Component = () => (
    <Switch
      fallback={
        <svg
          class="w-10 h-10 text-slate-400 group-hover:text-slate-300 transition-colors"
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
      }
    >
      <Match when={getFileState().state === 'processing'}>
        <svg
          class="w-10 h-10 text-amber-500 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
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
      <Match when={getFileState().state === 'error'}>
        <svg
          class="w-10 h-10 text-red-500"
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
      </Match>
      <Match when={getFileState().state === 'success'}>
        <svg
          class="w-10 h-10 text-emerald-500"
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
      <Match when={getFileState().state === 'hover'}>
        <svg
          class="w-10 h-10 text-blue-500 hover:scale-110 transition-transform"
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
    <div class="flex-1">
      {/* Label */}
      <div class="mb-3 flex items-center gap-2">
        <span
          class={`px-3 py-1 rounded-lg text-sm font-bold ${
            props.fileKey === 'A'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
          }`}
        >
          {props.label}
        </span>
        <Show when={getFileState().file}>
          <span class="text-slate-400 text-sm truncate">{getFileState().file?.name}</span>
        </Show>
      </div>

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
        tabIndex={getFileState().state === 'processing' ? -1 : 0}
        class={`
          group relative flex flex-col items-center justify-center
          w-full min-h-[180px] p-6
          border-2 border-dashed rounded-xl
          transition-all duration-200 ease-out
          cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
          ${stateClasses()}
          ${getFileState().state === 'processing' ? 'pointer-events-none' : ''}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label={`${props.label} file upload dropzone. Drag and drop a file or click to browse.`}
        aria-busy={getFileState().state === 'processing'}
        aria-invalid={getFileState().state === 'error'}
      >
        {/* Icon */}
        <div class="mb-3">
          <StateIcon />
        </div>

        {/* Text content based on state */}
        <Show when={getFileState().state === 'idle' || getFileState().state === 'hover'}>
          <div class="text-center">
            <p class="text-sm font-bold font-heading text-slate-200 tracking-tight">
              {getFileState().state === 'hover' ? 'Drop file here' : 'Drop file or click'}
            </p>
            <p class="mt-1 text-xs text-slate-400">{SUPPORTED_EXTENSIONS.join(', ')}</p>
            <p class="mt-0.5 text-[10px] text-slate-500">Max: {formatFileSizeLimit()}</p>
          </div>
        </Show>

        <Show when={getFileState().state === 'processing'}>
          <div class="text-center w-full">
            <p class="text-sm font-bold font-heading text-amber-400 tracking-tight truncate px-2">
              Profiling...
            </p>
            <div class="mt-3 w-full max-w-[200px] mx-auto">
              {/* Progress bar */}
              <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-amber-500 rounded-full transition-all duration-200"
                  style={{ width: `${getFileState().progress}%` }}
                />
              </div>
              <p class="mt-1 text-xs text-slate-400">{getFileState().progress}%</p>
            </div>
          </div>
        </Show>

        <Show when={getFileState().state === 'error'}>
          <div class="text-center">
            <p class="text-sm font-medium text-red-400">{getFileState().error}</p>
            <button
              type="button"
              class="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              onClick={(e) => {
                e.stopPropagation();
                resetFile(props.fileKey);
              }}
            >
              Try Again
            </button>
          </div>
        </Show>

        <Show when={getFileState().state === 'success' && getFileState().file}>
          <div class="text-center w-full">
            <p class="text-sm font-medium text-emerald-400">Ready</p>
            <div class="mt-2 p-2 bg-slate-800/80 rounded-lg border border-slate-700">
              <p class="text-xs font-bold text-slate-200 truncate">{getFileState().file?.name}</p>
              <p class="text-xs text-slate-400 mt-0.5 font-mono tracking-tighter">
                {formatFileSize(getFileState().file?.size || 0)}
              </p>
            </div>
            <button
              type="button"
              class="mt-3 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
              onClick={(e) => {
                e.stopPropagation();
                resetFile(props.fileKey);
              }}
            >
              Change File
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};

/**
 * DualDropzone Component
 *
 * A two-panel dropzone for comparison mode.
 * Shows File A and File B side by side with independent upload states.
 */
const DualDropzone: Component = () => {
  return (
    <div class="w-full">
      <div class="flex flex-col md:flex-row gap-4 md:gap-6">
        <SingleDropzone fileKey="A" label="File A" />

        {/* Comparison arrow/indicator */}
        <div class="hidden md:flex items-center justify-center">
          <div class="flex flex-col items-center gap-2 text-slate-500">
            <svg
              class="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span class="text-xs font-bold uppercase tracking-wider">vs</span>
          </div>
        </div>

        {/* Mobile comparison indicator */}
        <div class="flex md:hidden items-center justify-center">
          <div class="flex items-center gap-2 text-slate-500">
            <span class="h-px w-8 bg-slate-600" />
            <span class="text-xs font-bold uppercase tracking-wider">vs</span>
            <span class="h-px w-8 bg-slate-600" />
          </div>
        </div>

        <SingleDropzone fileKey="B" label="File B" />
      </div>
    </div>
  );
};

export default DualDropzone;
