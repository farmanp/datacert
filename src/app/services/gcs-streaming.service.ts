import { authStore } from '../stores/auth.store';

export interface CORSError extends Error {
  isCORSError: boolean;
  bucketName?: string;
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Creates a detailed CORS error with bucket-specific guidance
 */
function createCORSError(url: string, originalError?: Error): CORSError {
  const bucketName = extractBucketName(url);
  const error = new Error(
    `CORS blocked request to ${bucketName ? `bucket "${bucketName}"` : 'the remote server'}.\n\n` +
      'To fix this, configure CORS on your GCS bucket:\n\n' +
      '1. Create a cors.json file:\n' +
      '   [\n' +
      '     {\n' +
      '       "origin": ["' + window.location.origin + '"],\n' +
      '       "method": ["GET", "HEAD"],\n' +
      '       "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],\n' +
      '       "maxAgeSeconds": 3600\n' +
      '     }\n' +
      '   ]\n\n' +
      '2. Apply to your bucket:\n' +
      `   gsutil cors set cors.json gs://${bucketName || 'your-bucket'}\n\n` +
      'See the "CORS Setup" section in Remote Sources for more details.'
  ) as CORSError;

  error.isCORSError = true;
  error.bucketName = bucketName;
  error.name = 'CORSError';
  if (originalError) {
    error.cause = originalError;
  }
  return error;
}

/**
 * Extracts bucket name from GCS URL
 */
function extractBucketName(url: string): string | undefined {
  if (url.startsWith('gs://')) {
    const path = url.slice(5);
    return path.split('/')[0];
  }
  if (url.includes('storage.googleapis.com/')) {
    const match = url.match(/storage\.googleapis\.com\/([^/]+)/);
    return match?.[1];
  }
  return undefined;
}

/**
 * Validates gs:// URL format
 */
export function validateGCSUrl(url: string): { valid: boolean; error?: string } {
  if (!url.startsWith('gs://')) {
    return { valid: false, error: 'URL must start with gs://' };
  }

  const path = url.slice(5);
  if (!path || path === '/') {
    return { valid: false, error: 'Missing bucket name' };
  }

  const parts = path.split('/');
  const bucketName = parts[0];

  // GCS bucket naming rules
  if (bucketName.length < 3 || bucketName.length > 63) {
    return { valid: false, error: 'Bucket name must be 3-63 characters' };
  }

  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(bucketName) && bucketName.length > 2) {
    return {
      valid: false,
      error: 'Bucket name must start and end with letter/number, contain only lowercase letters, numbers, dashes, underscores, and dots',
    };
  }

  if (parts.length < 2 || !parts[1]) {
    return { valid: false, error: 'Missing file path after bucket name' };
  }

  return { valid: true };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RemoteStreamingService {
  /**
   * Normalizes cloud storage URLs to HTTPS fetchable URLs
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('gs://')) {
      const path = url.slice(5);
      return `https://storage.googleapis.com/${path}`;
    }
    if (url.startsWith('s3://')) {
      // S3 public URLs or pre-signed URLs are usually already HTTPS.
      // If s3:// is provided, we can only support it if it's a known pattern or we have a proxy.
      // For now, assume s3:// is a hint to look for S3 patterns if we had more logic,
      // but standard fetch needs https://.
      // We'll just return as is or handle common patterns.
      const path = url.slice(5);
      return `https://s3.amazonaws.com/${path}`;
    }
    return url;
  }

  /**
   * Detects if an error is CORS-related
   */
  private isCORSRelatedError(error: Error, response?: Response): boolean {
    // Network error with "Failed to fetch" typically indicates CORS block
    if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
      return true;
    }
    // Status 0 often indicates CORS block (opaque response)
    if (response?.status === 0) {
      return true;
    }
    // Check for explicit CORS-related text in error
    if (error.message?.toLowerCase().includes('cors')) {
      return true;
    }
    return false;
  }

  /**
   * Fetches a file from a remote URL with retry logic
   */
  async getFileStream(
    url: string,
    onProgress?: (bytes: number, total: number) => void,
    retryOptions?: RetryOptions
  ): Promise<{ stream: ReadableStream<Uint8Array>; size: number; name: string }> {
    const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
    const httpsUrl = this.normalizeUrl(url);
    const isGCS = httpsUrl.includes('storage.googleapis.com') || url.startsWith('gs://');

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= (options.maxRetries || 3); attempt++) {
      try {
        return await this.attemptFetch(url, httpsUrl, isGCS, onProgress);
      } catch (err: unknown) {
        const error = err as Error;
        lastError = error;

        // Don't retry CORS errors - they require user action
        if ((error as CORSError).isCORSError || this.isCORSRelatedError(error)) {
          throw createCORSError(url, error);
        }

        // Don't retry 4xx errors (except 429 Too Many Requests)
        if (
          error.message?.includes('401') ||
          error.message?.includes('403') ||
          error.message?.includes('404')
        ) {
          throw error;
        }

        // Check if we should retry
        if (attempt < (options.maxRetries || 3)) {
          const isRetryable =
            error.message?.includes('429') ||
            error.message?.includes('500') ||
            error.message?.includes('502') ||
            error.message?.includes('503') ||
            error.message?.includes('504') ||
            error.message?.includes('Network error') ||
            error.name === 'TypeError';

          if (isRetryable) {
            options.onRetry?.(attempt, error);

            // Exponential backoff
            const delay = (options.retryDelay || 1000) * Math.pow(2, attempt - 1);
            await sleep(delay);
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError || new Error('Failed to fetch file after retries');
  }

  /**
   * Single fetch attempt
   */
  private async attemptFetch(
    originalUrl: string,
    httpsUrl: string,
    isGCS: boolean,
    onProgress?: (bytes: number, total: number) => void
  ): Promise<{ stream: ReadableStream<Uint8Array>; size: number; name: string }> {
    const headers: Record<string, string> = {};

    // Only add GCS auth if it's a GCS URL and we are authenticated
    if (isGCS && authStore.state.isAuthenticated) {
      const token = await authStore.getValidToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let response: Response;
    try {
      response = await fetch(httpsUrl, { headers });
    } catch (err: unknown) {
      const error = err as Error;
      if (this.isCORSRelatedError(error)) {
        throw createCORSError(originalUrl, error);
      }
      throw error;
    }

    if (!response.ok) {
      if (response.status === 0) {
        throw createCORSError(originalUrl);
      }
      if (response.status === 401) {
        throw new Error(
          'Unauthorized (401). Please sign in with Google to access this file.'
        );
      }
      if (response.status === 403) {
        throw new Error(
          'Access denied (403). Check that you have read permissions on this bucket/file, or verify any pre-signed URL has not expired.'
        );
      }
      if (response.status === 404) {
        throw new Error(
          'File not found (404). Check that the bucket and file path are correct.'
        );
      }
      throw new Error(`Remote Error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const contentLength = response.headers.get('Content-Length');
    const size = contentLength ? parseInt(contentLength, 10) : 0;

    // Extract filename from URL
    let name = 'remote_file';
    try {
      const urlObj = new URL(httpsUrl);
      name = urlObj.pathname.split('/').pop() || 'remote_file';
    } catch {
      // Fallback or ignore
    }

    let stream = response.body;

    if (onProgress && size > 0) {
      let loaded = 0;
      const progressStream = new TransformStream({
        transform(chunk, controller) {
          loaded += chunk.length;
          onProgress(loaded, size);
          controller.enqueue(chunk);
        },
      });
      stream = stream.pipeThrough(progressStream);
    }

    return { stream, size, name };
  }
}

export const gcsStreamingService = new RemoteStreamingService();
export const remoteStreamingService = gcsStreamingService;
