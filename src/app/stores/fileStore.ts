import { createSignal, createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { ProfilerError } from '../types/errors';
import { createTypedError } from '../types/errors';

// Supported file types
export const SUPPORTED_EXTENSIONS = ['.csv', '.tsv', '.json', '.jsonl', '.parquet'] as const;
export const SUPPORTED_MIME_TYPES = [
  'text/csv',
  'text/tab-separated-values',
  'application/json',
  'application/x-jsonlines',
  'application/jsonl',
  'application/octet-stream', // Parquet often shows as this
  'application/x-parquet',
] as const;

// Accept attribute for file input
export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.join(',');

export type FileState = 'idle' | 'hover' | 'processing' | 'error' | 'success';

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  file?: File;
  url?: string;
}

export interface FileStoreState {
  state: FileState;
  file: FileInfo | null;
  progress: number;
  error: string | null;
  profilerError: ProfilerError | null;
  isDemo: boolean;
}

function createFileStore() {
  const [store, setStore] = createStore<FileStoreState>({
    state: 'idle',
    file: null,
    progress: 0,
    error: null,
    profilerError: null,
    isDemo: false,
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
  
  const isValidUrl = (url: string): boolean => {
     const lower = url.toLowerCase();
     return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
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
      const profilerError = createTypedError(
        'INVALID_FORMAT',
        `Unsupported file type: ${file.name}`
      );
      setStore({
        state: 'error',
        file: null,
        progress: 0,
        error: 'Unsupported file type. Please use CSV, TSV, JSON, JSONL, or Parquet.',
        profilerError,
        isDemo: false,
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
      profilerError: null,
      isDemo: false,
    });

    return true;
  };
  
  /**
   * Prepare store for remote file processing
   */
  const setRemoteFile = (name: string, size: number, url: string) => {
    // Basic validation
    if (!isValidUrl(name) && !isValidUrl(url)) {
      const profilerError = createTypedError(
        'INVALID_FORMAT',
        `Unsupported file extension: ${name}`
      );
      setStore({
        state: 'error',
        file: null,
        progress: 0,
        error: 'Unsupported file extension. Please use CSV, TSV, JSON, JSONL, or Parquet.',
        profilerError,
        isDemo: false,
      });
      return false;
    }

    setStore({
      state: 'processing',
      file: {
        name,
        size,
        type: 'application/octet-stream', // inferred
        url,
      },
      progress: 0,
      error: null,
      profilerError: null,
      isDemo: false,
    });
    return true;
  };

  /**
   * Load the demo dataset
   */
  const loadDemoFile = async (): Promise<File | null> => {
    try {
      setStore({ state: 'processing', progress: 10, error: null, profilerError: null, isDemo: true });

      const response = await fetch('/samples/demo-data.csv');
      if (!response.ok) throw new Error('Failed to load demo data');

      const blob = await response.blob();
      const file = new File([blob], 'demo-employees.csv', { type: 'text/csv' });

      setStore({
        state: 'processing',
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
        },
        progress: 30, // Fetched, ready to parse
        error: null,
        profilerError: null,
        isDemo: true,
      });

      return file;
    } catch (err) {
      const profilerError = createTypedError('NETWORK_ERROR', 'Could not load demo data');
      setStore({
        state: 'error',
        error: 'Could not load demo data. Please try again.',
        profilerError,
        progress: 0,
        isDemo: false,
      });
      return null;
    }
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
   * Sets an error state with message and optional profilerError
   */
  const setError = (message: string, profilerError?: ProfilerError) => {
    setStore({
      state: 'error',
      error: message,
      profilerError: profilerError || null,
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
      profilerError: null,
      isDemo: false,
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
        profilerError: null,
      });
    }
  };

  return {
    // State
    store,
    isDragOver,

    // Actions
    selectFile,
    setRemoteFile,
    loadDemoFile,
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
