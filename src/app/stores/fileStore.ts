import { createSignal, createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';

// Supported file types
export const SUPPORTED_EXTENSIONS = ['.csv', '.tsv', '.json', '.jsonl'] as const;
export const SUPPORTED_MIME_TYPES = [
  'text/csv',
  'text/tab-separated-values',
  'application/json',
  'application/x-jsonlines',
  'application/jsonl',
] as const;

// Accept attribute for file input
export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.join(',');

export type FileState = 'idle' | 'hover' | 'processing' | 'error' | 'success';

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  file: File;
}

export interface FileStoreState {
  state: FileState;
  file: FileInfo | null;
  progress: number;
  error: string | null;
}

function createFileStore() {
  const [store, setStore] = createStore<FileStoreState>({
    state: 'idle',
    file: null,
    progress: 0,
    error: null,
  });

  // Signal for tracking if we're dragging over the dropzone
  const [isDragOver, setIsDragOver] = createSignal(false);

  /**
   * Validates if a file has a supported extension
   */
  const isValidFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return SUPPORTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  };

  /**
   * Formats file size to human-readable string
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Sets the file and begins processing
   */
  const selectFile = (file: File): boolean => {
    // Validate file type
    if (!isValidFileType(file)) {
      setStore({
        state: 'error',
        file: null,
        progress: 0,
        error: 'Unsupported file type. Please use CSV, TSV, JSON, or JSONL.',
      });
      return false;
    }

    // Set file info and start processing state
    setStore({
      state: 'processing',
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      },
      progress: 0,
      error: null,
    });

    // Set file info and start processing state
    setStore({
      state: 'processing',
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      },
      progress: 0,
      error: null,
    });

    return true;
  };

  /**
   * Updates progress during file processing
   */
  const setProgress = (progress: number) => {
    setStore('progress', Math.min(100, Math.max(0, progress)));
    if (progress >= 100) {
      setStore('state', 'success');
    }
  };

  /**
   * Sets the dropzone to hover state
   */
  const setHover = (isHovering: boolean) => {
    setIsDragOver(isHovering);
    if (store.state !== 'processing') {
      setStore('state', isHovering ? 'hover' : 'idle');
    }
  };

  /**
   * Sets an error state with message
   */
  const setError = (message: string) => {
    setStore({
      state: 'error',
      error: message,
      progress: 0,
    });
  };

  /**
   * Resets the store to initial state
   */
  const reset = () => {
    setIsDragOver(false);
    setStore({
      state: 'idle',
      file: null,
      progress: 0,
      error: null,
    });
  };

  /**
   * Clears any error and returns to idle
   */
  const clearError = () => {
    if (store.state === 'error') {
      setStore({
        state: 'idle',
        error: null,
      });
    }
  };

  return {
    // State
    store,
    isDragOver,

    // Actions
    selectFile,
    setProgress,
    setHover,
    setError,
    reset,
    clearError,

    // Utilities
    isValidFileType,
    formatFileSize,
  };
}

// Create a singleton store instance using createRoot
export const fileStore = createRoot(createFileStore);
