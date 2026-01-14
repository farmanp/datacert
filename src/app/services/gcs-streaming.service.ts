import { authStore } from '../stores/auth.store';

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
   * Fetches a file from a remote URL, handling auth for GCS if needed
   */
  async getFileStream(url: string, onProgress?: (bytes: number, total: number) => void): Promise<{ stream: ReadableStream<Uint8Array>, size: number, name: string }> {
    const httpsUrl = this.normalizeUrl(url);
    const isGCS = httpsUrl.includes('storage.googleapis.com') || url.startsWith('gs://');

    const headers: Record<string, string> = {};

    // Only add GCS auth if it's a GCS URL and we are authenticated
    if (isGCS && authStore.state.isAuthenticated) {
      const token = await authStore.getValidToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(httpsUrl, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized (401). Access denied.');
        if (response.status === 403) throw new Error('Access denied (403). Check permissions or pre-signed URL expiry.');
        if (response.status === 404) throw new Error('File not found (404). Check the URL.');
        if (response.status === 0) throw new Error('CORS Error. Please configure CORS on your storage bucket or server.');
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
      } catch (e) {
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
          }
        });
        stream = stream.pipeThrough(progressStream);
      }

      return { stream, size, name };

    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
        throw new Error('Network error or CORS block. Please check your connection and server CORS settings.');
      }
      throw err;
    }
  }
}

export const gcsStreamingService = new RemoteStreamingService();
export const remoteStreamingService = gcsStreamingService;
