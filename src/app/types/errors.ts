/**
 * Error types for DataCert
 *
 * Categorizes errors to provide user-friendly messages with recovery suggestions.
 */

/**
 * Enumeration of all error categories
 */
export type ErrorType =
  | 'PARSE_ERROR'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'ENCODING_ERROR'
  | 'NETWORK_ERROR'
  | 'WASM_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Recovery action that can be taken by the user
 */
export interface RecoveryAction {
  label: string;
  action: 'retry' | 'upload_different' | 'change_delimiter' | 'reauthenticate' | 'custom';
  /** Optional custom handler key for the component to implement */
  customHandler?: string;
}

/**
 * Structured error information for display
 */
export interface ProfilerError {
  type: ErrorType;
  title: string;
  description: string;
  causes: string[];
  actions: RecoveryAction[];
  /** Original error message for debugging */
  originalMessage?: string;
}

/**
 * Error configuration for each error type
 */
interface ErrorConfig {
  title: string;
  description: string;
  causes: string[];
  actions: RecoveryAction[];
}

const errorConfigs: Record<ErrorType, ErrorConfig> = {
  PARSE_ERROR: {
    title: 'Could not parse file',
    description: "The file format doesn't match what we expected.",
    causes: [
      'Wrong delimiter (try comma vs semicolon vs tab)',
      'Inconsistent number of columns across rows',
      'Malformed quotes or escape characters',
      'File contains binary data or is corrupted',
    ],
    actions: [
      { label: 'Try Again', action: 'retry' },
      { label: 'Upload Different File', action: 'upload_different' },
    ],
  },

  FILE_TOO_LARGE: {
    title: 'File is too large',
    description: 'The file exceeds the memory limits for browser-based processing.',
    causes: [
      'File size exceeds available browser memory',
      'Too many columns causing memory overflow',
      'Very large cell values consuming memory',
    ],
    actions: [{ label: 'Upload Smaller File', action: 'upload_different' }],
  },

  INVALID_FORMAT: {
    title: 'Unsupported file format',
    description: 'This file type is not supported for data profiling.',
    causes: [
      'File extension is not CSV, TSV, JSON, JSONL, or Parquet',
      'File content does not match its extension',
      'File is actually a different format (e.g., Excel .xlsx)',
    ],
    actions: [{ label: 'Upload Different File', action: 'upload_different' }],
  },

  ENCODING_ERROR: {
    title: 'Character encoding issue',
    description: 'The file contains characters that could not be decoded properly.',
    causes: [
      'File uses an unsupported character encoding',
      'Mixed encodings within the file',
      'File contains invalid byte sequences',
    ],
    actions: [
      { label: 'Try Again', action: 'retry' },
      { label: 'Upload Different File', action: 'upload_different' },
    ],
  },

  NETWORK_ERROR: {
    title: 'Network connection failed',
    description: 'Unable to retrieve the file from cloud storage.',
    causes: [
      'Internet connection is unavailable',
      'Cloud storage service is down',
      'CORS is not configured on the storage bucket',
      'Authentication token has expired',
    ],
    actions: [
      { label: 'Try Again', action: 'retry' },
      { label: 'Re-authenticate', action: 'reauthenticate' },
      { label: 'Upload Local File', action: 'upload_different' },
    ],
  },

  WASM_ERROR: {
    title: 'Processing engine error',
    description: 'The data processing engine encountered an internal error.',
    causes: [
      'WebAssembly module failed to initialize',
      'Browser does not fully support WebAssembly',
      'Memory allocation failure in the processing engine',
    ],
    actions: [
      { label: 'Try Again', action: 'retry' },
      { label: 'Upload Different File', action: 'upload_different' },
    ],
  },

  UNKNOWN_ERROR: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred while processing your file.',
    causes: ['An unexpected condition occurred during processing'],
    actions: [
      { label: 'Try Again', action: 'retry' },
      { label: 'Upload Different File', action: 'upload_different' },
    ],
  },
};

/**
 * Patterns to match error messages to error types
 */
const errorPatterns: Array<{ pattern: RegExp; type: ErrorType }> = [
  // Parse errors
  { pattern: /parse|parsing|csv|json|syntax|unexpected token|malformed/i, type: 'PARSE_ERROR' },
  { pattern: /column|row|delimiter|separator|quote/i, type: 'PARSE_ERROR' },
  { pattern: /inconsistent|mismatch/i, type: 'PARSE_ERROR' },

  // File size errors
  { pattern: /too large|memory|out of memory|oom|allocation failed/i, type: 'FILE_TOO_LARGE' },
  { pattern: /exceed|limit|overflow/i, type: 'FILE_TOO_LARGE' },

  // Format errors
  { pattern: /unsupported.*type|invalid.*format|not supported/i, type: 'INVALID_FORMAT' },
  { pattern: /file type|extension/i, type: 'INVALID_FORMAT' },

  // Encoding errors
  { pattern: /encoding|decode|utf-?8|charset|character|byte sequence/i, type: 'ENCODING_ERROR' },

  // Network errors
  { pattern: /network|fetch|cors|connection|timeout/i, type: 'NETWORK_ERROR' },
  {
    pattern: /401|403|404|unauthorized|forbidden|not found|authentication/i,
    type: 'NETWORK_ERROR',
  },
  { pattern: /gcs|storage\.googleapis|bucket/i, type: 'NETWORK_ERROR' },

  // WASM errors
  { pattern: /wasm|webassembly|profiler not initialized|module/i, type: 'WASM_ERROR' },
  { pattern: /unreachable|panic|rust/i, type: 'WASM_ERROR' },
];

/**
 * Classifies an error message into an ErrorType
 */
export function classifyError(errorMessage: string): ErrorType {
  const lowerMessage = errorMessage.toLowerCase();

  for (const { pattern, type } of errorPatterns) {
    if (pattern.test(lowerMessage)) {
      return type;
    }
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Creates a ProfilerError from an error message
 */
export function createProfilerError(errorMessage: string, overrideType?: ErrorType): ProfilerError {
  const type = overrideType || classifyError(errorMessage);
  const config = errorConfigs[type];

  return {
    type,
    title: config.title,
    description: config.description,
    causes: config.causes,
    actions: config.actions,
    originalMessage: errorMessage,
  };
}

/**
 * Creates a ProfilerError with a specific type
 */
export function createTypedError(type: ErrorType, originalMessage?: string): ProfilerError {
  const config = errorConfigs[type];

  return {
    type,
    title: config.title,
    description: config.description,
    causes: config.causes,
    actions: config.actions,
    originalMessage,
  };
}
