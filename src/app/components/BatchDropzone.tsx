import { Component, createSignal, Show } from 'solid-js';
import { batchStore } from '../stores/batchStore';
import { FILE_ACCEPT, SUPPORTED_EXTENSIONS } from '../stores/fileStore';

/**
 * BatchDropzone Component
 *
 * A multi-file drag-and-drop upload zone with the following features:
 * - Accepts multiple files via drag-and-drop and click
 * - Visual states: idle, hover
 * - File type validation (CSV, TSV, JSON, JSONL, Parquet)
 * - Shows file count badge when hovering with files
 * - Keyboard accessibility (Enter/Space to open picker)
 * - ARIA labels for accessibility
 */
const BatchDropzone: Component = () => {
  let fileInputRef: HTMLInputElement | undefined;
  const [isHovering, setIsHovering] = createSignal(false);
  const [dragFileCount, setDragFileCount] = createSignal(0);
  const [invalidFiles, setInvalidFiles] = createSignal<string[]>([]);

  const { addFiles } = batchStore;

  // Handle file input change
  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (files.length > 0) {
      const invalid = addFiles(files);
      setInvalidFiles(invalid);
      // Clear invalid files message after 5 seconds
      if (invalid.length > 0) {
        setTimeout(() => setInvalidFiles([]), 5000);
      }
    }
    // Reset input so same files can be selected again
    target.value = '';
  };

  // Handle click on dropzone
  const handleClick = () => {
    fileInputRef?.click();
  };

  // Handle keyboard interaction
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef?.click();
    }
  };

  // Handle drag events
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(true);
    // Get the count of files being dragged
    if (e.dataTransfer?.items) {
      setDragFileCount(e.dataTransfer.items.length);
    }
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
      setIsHovering(false);
      setDragFileCount(0);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
    setDragFileCount(0);

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      const invalid = addFiles(files);
      setInvalidFiles(invalid);
      // Clear invalid files message after 5 seconds
      if (invalid.length > 0) {
        setTimeout(() => setInvalidFiles([]), 5000);
      }
    }
  };

  // Compute the current visual state class
  const stateClasses = () => {
    if (isHovering()) {
      return 'border-blue-500 bg-blue-500/10 scale-[1.02]';
    }
    return 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50';
  };

  return (
    <div class="w-full">
      {/* Hidden file input with multiple attribute */}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_ACCEPT}
        multiple
        class="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        class={`
          group relative flex flex-col items-center justify-center
          w-full min-h-[180px] p-8
          border-2 border-dashed rounded-xl
          transition-all duration-200 ease-out
          cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
          ${stateClasses()}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Multi-file upload dropzone. Drag and drop files or click to browse."
        aria-describedby="batch-dropzone-description"
      >
        {/* File count badge when hovering with files */}
        <Show when={isHovering() && dragFileCount() > 0}>
          <div class="absolute top-3 right-3 px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded-full shadow-lg animate-in fade-in zoom-in duration-200">
            {dragFileCount()} file{dragFileCount() > 1 ? 's' : ''}
          </div>
        </Show>

        {/* Icon */}
        <div class="mb-4">
          <Show
            when={isHovering()}
            fallback={
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
            }
          >
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
          </Show>
        </div>

        {/* Text content */}
        <div class="text-center">
          <p class="text-lg font-bold font-heading text-slate-200 tracking-tight">
            {isHovering() ? 'Drop your files here' : 'Drag and drop files here'}
          </p>
          <p class="mt-1 text-sm text-slate-400">
            or <span class="text-blue-400 underline">click to browse</span>
          </p>
          <p
            id="batch-dropzone-description"
            class="mt-3 text-[10px] text-slate-400 uppercase tracking-widest font-black"
          >
            Supported: <span class="font-mono text-slate-400">{SUPPORTED_EXTENSIONS.join(', ')}</span>
          </p>
          <p class="mt-1 text-xs text-slate-500">
            Select multiple files for batch processing
          </p>
        </div>
      </div>

      {/* Invalid files warning */}
      <Show when={invalidFiles().length > 0}>
        <div class="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div class="flex items-start gap-2">
            <svg
              class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p class="text-sm font-semibold text-amber-400">
                {invalidFiles().length} file{invalidFiles().length > 1 ? 's' : ''} skipped
              </p>
              <p class="text-xs text-amber-300/80 mt-1">
                Unsupported format: {invalidFiles().join(', ')}
              </p>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default BatchDropzone;
