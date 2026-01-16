import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { ProfileResult } from './profileStore';
import { SUPPORTED_EXTENSIONS } from './fileStore';
import { isFileTooLarge, formatFileSizeLimit } from '../config/fileSizeConfig';
import {
  ComparisonDelta,
  TrendAnalysis,
  computeDeltas,
  computeTrends,
} from '../utils/nwayComparison';
import {
  BatchSchemaValidation,
  validateBatchSchemas,
} from '../utils/schemaValidation';
import { MergedStats, mergeProfilesFlexible } from '../utils/statsAggregation';

export type BatchMode = 'sequential' | 'merge' | 'comparison';
export type BatchFileStatus = 'pending' | 'processing' | 'completed' | 'error' | 'skipped';

export interface BatchFileEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  status: BatchFileStatus;
  progress: number;
  error: string | null;
  results: ProfileResult | null;
  isBaseline?: boolean; // For N-way comparison mode
}

export interface BatchStoreState {
  mode: BatchMode | null;
  files: BatchFileEntry[];
  currentIndex: number;
  isProcessing: boolean;
  isCancelled: boolean;
  activeTabId: string | null;
  // N-way comparison mode state
  comparisonDeltas: ComparisonDelta[];
  trendAnalysis: TrendAnalysis[];
  // Merge mode state
  schemaValidation: BatchSchemaValidation | null;
  showSchemaDialog: boolean;
  mergedStats: MergedStats | null;
}

const CHUNK_SIZE = 64 * 1024; // 64KB chunks for streaming

function createBatchStore() {
  const [store, setStore] = createStore<BatchStoreState>({
    mode: null,
    files: [],
    currentIndex: -1,
    isProcessing: false,
    isCancelled: false,
    activeTabId: null,
    comparisonDeltas: [],
    trendAnalysis: [],
    schemaValidation: null,
    showSchemaDialog: false,
    mergedStats: null,
  });

  let worker: Worker | null = null;
  // let currentFileId: string | null = null; // Decalred but never read

  /**
   * Generates a unique ID for batch file entries
   */
  const generateId = (): string => {
    return `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

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
   * Sets the batch processing mode
   */
  const setMode = (mode: BatchMode) => {
    setStore('mode', mode);
  };

  /**
   * Adds multiple files to the batch
   * Returns array of rejected file names (invalid type or too large)
   */
  const addFiles = (files: File[]): string[] => {
    const rejectedFiles: string[] = [];
    const validEntries: BatchFileEntry[] = [];

    for (const file of files) {
      // Check file size first
      if (isFileTooLarge(file.size)) {
        rejectedFiles.push(`${file.name} (exceeds ${formatFileSizeLimit()})`);
        continue;
      }

      if (!isValidFileType(file)) {
        rejectedFiles.push(file.name);
        continue;
      }

      // Check for duplicate file names
      const existingFile = store.files.find((f) => f.name === file.name);
      if (existingFile) {
        // Skip duplicates silently or could add to rejectedFiles
        continue;
      }

      validEntries.push({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
        error: null,
        results: null,
        isBaseline: false,
      });
    }

    if (validEntries.length > 0) {
      setStore('files', [...store.files, ...validEntries]);

      // Set first file as active tab if none selected
      if (!store.activeTabId && validEntries.length > 0) {
        setStore('activeTabId', validEntries[0].id);
      }
    }

    return rejectedFiles;
  };

  /**
   * Removes a file from the batch by ID
   */
  const removeFile = (id: string) => {
    const index = store.files.findIndex((f) => f.id === id);
    if (index === -1) return;

    const newFiles = store.files.filter((f) => f.id !== id);
    setStore('files', newFiles);

    // Update active tab if removed file was active
    if (store.activeTabId === id) {
      setStore('activeTabId', newFiles.length > 0 ? newFiles[0].id : null);
    }
  };

  /**
   * Clears all files from the batch
   */
  const clearFiles = () => {
    setStore({
      files: [],
      currentIndex: -1,
      activeTabId: null,
      isProcessing: false,
      isCancelled: false,
      comparisonDeltas: [],
      trendAnalysis: [],
      schemaValidation: null,
      showSchemaDialog: false,
      mergedStats: null,
    });
  };

  /**
   * Sets a file as the baseline for comparison mode
   */
  const setBaseline = (id: string) => {
    setStore(
      'files',
      store.files.map((f) => ({
        ...f,
        isBaseline: f.id === id,
      })),
    );
  };

  /**
   * Sets the active tab for viewing results
   */
  const setActiveTab = (id: string) => {
    setStore('activeTabId', id);
  };

  /**
   * Determines the file format from the file name
   */
  const getFileFormat = (fileName: string): 'csv' | 'parquet' | 'json' | 'avro' => {
    const nameLower = fileName.toLowerCase();
    if (nameLower.endsWith('.parquet')) return 'parquet';
    if (nameLower.endsWith('.json') || nameLower.endsWith('.jsonl')) return 'json';
    if (nameLower.endsWith('.avro')) return 'avro';
    return 'csv';
  };

  /**
   * Processes a single file using the worker
   */
  const processFile = async (fileEntry: BatchFileEntry): Promise<void> => {
    return new Promise((resolve, reject) => {
      const file = fileEntry.file;
      const format = getFileFormat(file.name);

      // Terminate existing worker for clean state
      if (worker) {
        worker.terminate();
        worker = null;
      }

      worker = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = async (e) => {
        const { type, result, error } = e.data;

        // Check if cancelled
        if (store.isCancelled) {
          worker?.terminate();
          worker = null;
          reject(new Error('Batch cancelled'));
          return;
        }

        switch (type) {
          case 'ready': {
            worker?.postMessage({
              type: 'start_profiling',
              data: {
                delimiter: undefined,
                hasHeaders: true,
                format: format,
              },
            });
            break;
          }

          case 'started': {
            // Process file in chunks
            const totalSize = file.size;
            let offset = 0;

            while (offset < totalSize) {
              // Check for cancellation between chunks
              if (store.isCancelled) {
                worker?.terminate();
                worker = null;
                reject(new Error('Batch cancelled'));
                return;
              }

              const chunk = file.slice(offset, offset + CHUNK_SIZE);
              const buffer = await chunk.arrayBuffer();

              worker?.postMessage(
                {
                  type: 'process_chunk',
                  data: buffer,
                },
                [buffer],
              );

              offset += CHUNK_SIZE;
              const progress = Math.round((offset / totalSize) * 100);
              updateFileProgress(fileEntry.id, Math.min(progress, 99));
            }

            worker?.postMessage({ type: 'finalize' });
            break;
          }

          case 'final_stats': {
            setFileResult(fileEntry.id, result as ProfileResult);
            worker?.terminate();
            worker = null;
            resolve();
            break;
          }

          case 'error': {
            setFileError(fileEntry.id, error || 'Unknown error');
            worker?.terminate();
            worker = null;
            reject(new Error(error || 'Unknown error'));
            break;
          }
        }
      };

      worker.onerror = (e) => {
        setFileError(fileEntry.id, e.message || 'Worker error');
        worker?.terminate();
        worker = null;
        reject(new Error(e.message || 'Worker error'));
      };

      worker.postMessage({ type: 'init' });
    });
  };

  /**
   * Processes all files sequentially
   */
  const processSequentially = async () => {
    const pendingFiles = store.files.filter((f) => f.status === 'pending');

    for (let i = 0; i < pendingFiles.length; i++) {
      // Check for cancellation
      if (store.isCancelled) {
        break;
      }

      const fileEntry = pendingFiles[i];
      const fileIndex = store.files.findIndex((f) => f.id === fileEntry.id);

      if (fileIndex === -1) continue;

      setStore('currentIndex', fileIndex);
      setStore('files', fileIndex, 'status', 'processing');
      setStore('files', fileIndex, 'progress', 0);

      try {
        await processFile(fileEntry);

        // Auto-select first completed file's tab
        if (!store.activeTabId || store.files.find((f) => f.id === store.activeTabId)?.status !== 'completed') {
          setStore('activeTabId', fileEntry.id);
        }
      } catch (error) {
        // Error already set in processFile, continue to next file
        console.error(`Error processing file ${fileEntry.name}:`, error);
      }
    }

    // Batch complete
    setStore({
      isProcessing: false,
      currentIndex: -1,
    });
  };

  /**
   * Processes files for N-way comparison mode
   * 1. Verify baseline is set
   * 2. Profile all files (reuse sequential logic)
   * 3. For each non-baseline file, compute deltas against baseline
   * 4. Compute trend analysis across all comparisons
   * 5. Store results in store.comparisonDeltas and store.trendAnalysis
   */
  const processComparison = async () => {
    // 1. Verify baseline is set
    const baselineFile = store.files.find((f) => f.isBaseline);
    if (!baselineFile) {
      console.error('No baseline file set for comparison mode');
      setStore({
        isProcessing: false,
        currentIndex: -1,
      });
      return;
    }

    // Clear previous comparison results
    setStore({
      comparisonDeltas: [],
      trendAnalysis: [],
    });

    // 2. Profile all files (reuse sequential logic)
    const pendingFiles = store.files.filter((f) => f.status === 'pending');

    for (let i = 0; i < pendingFiles.length; i++) {
      // Check for cancellation
      if (store.isCancelled) {
        break;
      }

      const fileEntry = pendingFiles[i];
      const fileIndex = store.files.findIndex((f) => f.id === fileEntry.id);

      if (fileIndex === -1) continue;

      setStore('currentIndex', fileIndex);
      setStore('files', fileIndex, 'status', 'processing');
      setStore('files', fileIndex, 'progress', 0);

      try {
        await processFile(fileEntry);

        // Auto-select baseline file's tab
        if (fileEntry.isBaseline) {
          setStore('activeTabId', fileEntry.id);
        }
      } catch (error) {
        // Error already set in processFile, continue to next file
        console.error(`Error processing file ${fileEntry.name}:`, error);
      }
    }

    // Check if cancelled
    if (store.isCancelled) {
      setStore({
        isProcessing: false,
        currentIndex: -1,
      });
      return;
    }

    // 3. Get updated baseline file with results
    const updatedBaselineFile = store.files.find((f) => f.isBaseline);
    if (!updatedBaselineFile || !updatedBaselineFile.results) {
      console.error('Baseline file processing failed');
      setStore({
        isProcessing: false,
        currentIndex: -1,
      });
      return;
    }

    const baselineResults = updatedBaselineFile.results;

    // 4. For each non-baseline completed file, compute deltas against baseline
    const comparisonDeltas: ComparisonDelta[] = [];
    const completedNonBaselineFiles = store.files.filter(
      (f) => !f.isBaseline && f.status === 'completed' && f.results !== null
    );

    for (const file of completedNonBaselineFiles) {
      if (file.results) {
        const delta = computeDeltas(baselineResults, file.results, file.id, file.name);
        comparisonDeltas.push(delta);
      }
    }

    // 5. Compute trend analysis across all comparisons
    const trends = computeTrends(baselineResults, comparisonDeltas);

    // 6. Store results
    setStore({
      comparisonDeltas,
      trendAnalysis: trends,
      isProcessing: false,
      currentIndex: -1,
    });
  };

  /**
   * Processes files for merge mode
   * 1. Profile all files first (reuse sequential logic)
   * 2. Extract schemas from completed profiles
   * 3. Validate schema compatibility
   * 4. If incompatible, set state to show SchemaValidationDialog
   * 5. If user proceeds or schemas match, aggregate statistics
   * 6. Store merged result in store.mergedStats
   */
  const processMerge = async () => {
    // Clear previous merge results
    setStore({
      schemaValidation: null,
      showSchemaDialog: false,
      mergedStats: null,
    });

    // 1. Profile all files first
    const pendingFiles = store.files.filter((f) => f.status === 'pending');

    for (let i = 0; i < pendingFiles.length; i++) {
      // Check for cancellation
      if (store.isCancelled) {
        break;
      }

      const fileEntry = pendingFiles[i];
      const fileIndex = store.files.findIndex((f) => f.id === fileEntry.id);

      if (fileIndex === -1) continue;

      setStore('currentIndex', fileIndex);
      setStore('files', fileIndex, 'status', 'processing');
      setStore('files', fileIndex, 'progress', 0);

      try {
        await processFile(fileEntry);

        // Auto-select first completed file's tab
        if (
          !store.activeTabId ||
          store.files.find((f) => f.id === store.activeTabId)?.status !== 'completed'
        ) {
          setStore('activeTabId', fileEntry.id);
        }
      } catch (error) {
        // Error already set in processFile, continue to next file
        console.error(`Error processing file ${fileEntry.name}:`, error);
      }
    }

    // Check if cancelled
    if (store.isCancelled) {
      setStore({
        isProcessing: false,
        currentIndex: -1,
      });
      return;
    }

    // 2. Get all completed files with results
    const completedFiles = store.files.filter(
      (f) => f.status === 'completed' && f.results !== null
    );

    if (completedFiles.length < 2) {
      console.error('Need at least 2 completed files for merge mode');
      setStore({
        isProcessing: false,
        currentIndex: -1,
      });
      return;
    }

    // 3. Validate schema compatibility
    const profilesForValidation = completedFiles.map((f) => ({
      fileId: f.id,
      fileName: f.name,
      profile: f.results!,
    }));

    const validation = validateBatchSchemas(profilesForValidation);
    setStore('schemaValidation', validation);

    // 4. If incompatible, show dialog and pause
    if (!validation.isAllCompatible) {
      setStore({
        showSchemaDialog: true,
        isProcessing: false,
        currentIndex: -1,
      });
      return;
    }

    // 5. If schemas match, proceed to merge
    performMerge();
  };

  /**
   * Performs the actual merge of statistics
   * Called after schema validation passes or user confirms to proceed
   */
  const performMerge = () => {
    const completedFiles = store.files.filter(
      (f) => f.status === 'completed' && f.results !== null
    );

    if (completedFiles.length < 2) {
      console.error('Need at least 2 completed files for merge');
      return;
    }

    // Aggregate statistics using flexible matching (by column name)
    const profilesToMerge = completedFiles.map((f) => ({
      fileName: f.name,
      profile: f.results!,
    }));

    const mergedStats = mergeProfilesFlexible(profilesToMerge);

    setStore({
      mergedStats,
      showSchemaDialog: false,
      isProcessing: false,
      currentIndex: -1,
    });
  };

  /**
   * Called when user confirms to proceed despite schema mismatch
   */
  const confirmSchemaMismatch = () => {
    setStore('showSchemaDialog', false);
    performMerge();
  };

  /**
   * Called when user cancels the schema validation dialog
   */
  const cancelSchemaMismatch = () => {
    setStore({
      showSchemaDialog: false,
      schemaValidation: null,
      isProcessing: false,
      currentIndex: -1,
    });
  };

  /**
   * Starts batch processing
   */
  const startBatch = () => {
    if (store.files.length === 0 || store.isProcessing) return;
    if (!store.mode) return;

    // For comparison mode, verify baseline is set
    if (store.mode === 'comparison') {
      const hasBaseline = store.files.some((f) => f.isBaseline);
      if (!hasBaseline) {
        // Auto-set first file as baseline if none selected
        if (store.files.length > 0) {
          setBaseline(store.files[0].id);
        }
      }
    }

    setStore({
      isProcessing: true,
      isCancelled: false,
      currentIndex: 0,
    });

    // Start processing based on mode
    if (store.mode === 'sequential') {
      processSequentially();
    } else if (store.mode === 'comparison') {
      processComparison();
    } else if (store.mode === 'merge') {
      processMerge();
    }
  };

  /**
   * Cancels the batch processing
   */
  const cancelBatch = () => {
    if (!store.isProcessing) return;

    setStore('isCancelled', true);

    // Terminate worker if exists
    if (worker) {
      worker.terminate();
      worker = null;
    }

    // Mark current processing file as pending (can retry later)
    const currentIdx = store.currentIndex;
    if (currentIdx >= 0 && currentIdx < store.files.length) {
      setStore('files', currentIdx, 'status', 'pending');
      setStore('files', currentIdx, 'progress', 0);
    }

    setStore({
      isProcessing: false,
      currentIndex: -1,
    });
  };

  /**
   * Updates progress for a specific file
   */
  const updateFileProgress = (id: string, progress: number) => {
    const index = store.files.findIndex((f) => f.id === id);
    if (index !== -1) {
      setStore('files', index, 'progress', Math.min(100, Math.max(0, progress)));
    }
  };

  /**
   * Sets the result for a specific file
   */
  const setFileResult = (id: string, results: ProfileResult) => {
    const index = store.files.findIndex((f) => f.id === id);
    if (index !== -1) {
      setStore('files', index, {
        results,
        status: 'completed',
        progress: 100,
      });
    }
  };

  /**
   * Sets an error for a specific file
   */
  const setFileError = (id: string, error: string) => {
    const index = store.files.findIndex((f) => f.id === id);
    if (index !== -1) {
      setStore('files', index, {
        error,
        status: 'error',
      });
    }
  };

  /**
   * Retries a failed file
   * Works mid-batch or after batch completes
   */
  const retryFile = async (id: string) => {
    const index = store.files.findIndex((f) => f.id === id);
    if (index === -1) return;

    const fileEntry = store.files[index];

    // Can only retry files in error state
    if (fileEntry.status !== 'error') return;

    // Reset the file state
    setStore('files', index, {
      status: 'pending',
      progress: 0,
      error: null,
      results: null,
    });

    // If batch is not currently processing, process just this file
    if (!store.isProcessing) {
      setStore({
        isProcessing: true,
        isCancelled: false,
        currentIndex: index,
      });

      setStore('files', index, 'status', 'processing');

      try {
        await processFile(fileEntry);
        // Set active tab to the retried file
        setStore('activeTabId', id);
      } catch (error) {
        console.error(`Error retrying file ${fileEntry.name}:`, error);
      }

      setStore({
        isProcessing: false,
        currentIndex: -1,
      });
    }
    // If batch is processing, the file will be picked up on the next pass
    // since it's now marked as pending
  };

  /**
   * Resets the entire batch store
   */
  const reset = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }

    setStore({
      mode: null,
      files: [],
      currentIndex: -1,
      isProcessing: false,
      isCancelled: false,
      activeTabId: null,
      comparisonDeltas: [],
      trendAnalysis: [],
      schemaValidation: null,
      showSchemaDialog: false,
      mergedStats: null,
    });
  };

  /**
   * Gets summary statistics for the batch
   */
  const getSummary = () => {
    const files = store.files;
    return {
      total: files.length,
      pending: files.filter((f) => f.status === 'pending').length,
      processing: files.filter((f) => f.status === 'processing').length,
      completed: files.filter((f) => f.status === 'completed').length,
      error: files.filter((f) => f.status === 'error').length,
      skipped: files.filter((f) => f.status === 'skipped').length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    };
  };

  /**
   * Checks if batch is ready to start processing
   */
  const canStartBatch = (): boolean => {
    return store.mode !== null && store.files.length > 0 && !store.isProcessing;
  };

  return {
    // State
    store,

    // Actions
    setMode,
    addFiles,
    removeFile,
    clearFiles,
    setBaseline,
    setActiveTab,
    startBatch,
    cancelBatch,
    retryFile,
    updateFileProgress,
    setFileResult,
    setFileError,
    reset,

    // Merge mode actions
    confirmSchemaMismatch,
    cancelSchemaMismatch,

    // Utilities
    getSummary,
    canStartBatch,
    isValidFileType,
    formatFileSize,
  };
}

// Create a singleton store instance using createRoot
export const batchStore = createRoot(createBatchStore);
