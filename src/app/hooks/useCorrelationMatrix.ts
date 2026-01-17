import { createSignal, createMemo, onCleanup, Accessor } from 'solid-js';
import type { ColumnProfile, CorrelationMatrixResult } from '../stores/profileStore';
import type { FileInfo } from '../stores/fileStore';

const COMPUTATION_TIMEOUT_MS = 30_000; // 30 seconds

export interface UseCorrelationProps {
  file: Accessor<FileInfo | undefined>;
  numericColumns: Accessor<ColumnProfile[]>;
}

export interface UseCorrelationReturn {
  showCorrelationMatrix: Accessor<boolean>;
  setShowCorrelationMatrix: (show: boolean) => void;
  correlationData: Accessor<CorrelationMatrixResult | null>;
  isComputingCorrelation: Accessor<boolean>;
  correlationError: Accessor<string | null>;
  canComputeCorrelation: Accessor<boolean>;
  computeCorrelation: () => Promise<void>;
}

export function useCorrelationMatrix(props: UseCorrelationProps): UseCorrelationReturn {
  // Correlation Matrix state
  const [showCorrelationMatrix, setShowCorrelationMatrix] = createSignal(false);
  const [correlationData, setCorrelationData] = createSignal<CorrelationMatrixResult | null>(null);
  const [isComputingCorrelation, setIsComputingCorrelation] = createSignal(false);
  const [correlationError, setCorrelationError] = createSignal<string | null>(null);

  let correlationWorker: Worker | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Check if correlation matrix can be computed (2+ numeric columns)
  const canComputeCorrelation = createMemo(() => props.numericColumns().length >= 2);

  // Cleanup timeout helper
  const clearComputationTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  // Terminate worker helper
  const terminateWorker = () => {
    if (correlationWorker) {
      correlationWorker.terminate();
      correlationWorker = null;
    }
    clearComputationTimeout();
  };

  // Compute correlation matrix
  const computeCorrelation = async () => {
    // Guard against concurrent computations
    if (isComputingCorrelation()) {
      console.warn('Correlation computation already in progress');
      return;
    }

    if (!canComputeCorrelation() || !props.file()) {
      return;
    }

    setIsComputingCorrelation(true);
    setCorrelationError(null);

    try {
      // Create a new worker for correlation computation
      correlationWorker = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), {
        type: 'module',
      });

      // Set up timeout protection
      timeoutId = setTimeout(() => {
        setCorrelationError('Computation timed out after 30 seconds');
        setIsComputingCorrelation(false);
        terminateWorker();
      }, COMPUTATION_TIMEOUT_MS);

      correlationWorker.onmessage = async (e) => {
        const { type, result, error } = e.data;

        switch (type) {
          case 'ready': {
            // Worker is ready, read file and compute correlation
            const fileInfo = props.file();
            const file = fileInfo?.file;
            if (!file) {
              setCorrelationError('File not available');
              setIsComputingCorrelation(false);
              terminateWorker();
              return;
            }

            // Read file content
            const text = await file.text();
            const lines = text.split('\n').filter((line) => line.trim().length > 0);
            if (lines.length < 2) {
              setCorrelationError('Not enough data');
              setIsComputingCorrelation(false);
              terminateWorker();
              return;
            }

            // Parse headers and rows
            const delimiter = text.includes('\t') ? '\t' : ',';
            const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
            const rows = lines
              .slice(1)
              .map((line) =>
                line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, '')),
              );

            // Get numeric column indices with validation
            const numericIndices = props
              .numericColumns()
              .map((col) => headers.indexOf(col.name))
              .filter((idx) => idx !== -1); // Filter out columns not found in headers

            if (numericIndices.length < 2) {
              setCorrelationError('Not enough valid numeric columns found in file headers');
              setIsComputingCorrelation(false);
              terminateWorker();
              return;
            }

            // Send correlation computation request
            correlationWorker?.postMessage({
              type: 'compute_correlation',
              data: {
                headers,
                rows,
                numericColumnIndices: numericIndices,
              },
            });
            break;
          }

          case 'correlation_computed':
            clearComputationTimeout();
            setCorrelationData(result as CorrelationMatrixResult);
            setShowCorrelationMatrix(true);
            setIsComputingCorrelation(false);
            terminateWorker();
            break;

          case 'error':
            clearComputationTimeout();
            setCorrelationError(error || 'Failed to compute correlation');
            setIsComputingCorrelation(false);
            terminateWorker();
            break;
        }
      };

      correlationWorker.onerror = (error) => {
        clearComputationTimeout();
        setCorrelationError(error.message || 'Worker error occurred');
        setIsComputingCorrelation(false);
        terminateWorker();
      };

      correlationWorker.postMessage({ type: 'init' });
    } catch (err) {
      clearComputationTimeout();
      console.error('Correlation computation failed', err);
      setCorrelationError(err instanceof Error ? err.message : 'Computation failed');
      setIsComputingCorrelation(false);
      terminateWorker();
    }
  };

  // Cleanup correlation worker on unmount
  onCleanup(() => {
    terminateWorker();
  });

  return {
    showCorrelationMatrix,
    setShowCorrelationMatrix,
    correlationData,
    isComputingCorrelation,
    correlationError,
    canComputeCorrelation,
    computeCorrelation,
  };
}
