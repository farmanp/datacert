import { authStore } from '../stores/auth.store';

export class GCSStreamingService {
  /**
   * Converts gs:// URL to https://storage.googleapis.com URL
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('gs://')) {
      const path = url.slice(5);
      return `https://storage.googleapis.com/${path}`;
    }
    return url;
  }

  /**
   * Fetches a file from GCS, handling auth and errors
   */
  async getFileStream(url: string, onProgress?: (bytes: number, total: number) => void): Promise<{ stream: ReadableStream<Uint8Array>, size: number, name: string }> {
    const httpsUrl = this.normalizeUrl(url);
    
    // Ensure we have a valid token
    const token = await authStore.getValidToken();
    if (!token) {
      throw new Error('Authentication required. Please sign in with Google.');
    }

    try {
      const response = await fetch(httpsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized (401). Token may have expired.');
        if (response.status === 403) throw new Error('Access denied (403). Check bucket permissions.');
        if (response.status === 404) throw new Error('File not found (404). Check the URL.');
        if (response.status === 0) throw new Error('CORS Error. Please configure CORS on your GCS bucket.');
        throw new Error(`GCS Error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      const contentLength = response.headers.get('Content-Length');
      const size = contentLength ? parseInt(contentLength, 10) : 0;
      
      // Extract filename from URL
      const urlObj = new URL(httpsUrl);
      const pathname = urlObj.pathname;
      const name = pathname.split('/').pop() || 'downloaded_file';

      // If we need to track progress, we pipe through a TransformStream
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
        // Fetch throws TypeError for network errors or CORS
        const error = err as Error;
        if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
            throw new Error('Network error or CORS not configured. Please check your connection and bucket CORS settings.');
        }
        throw err;
    }
  }
}

export const gcsStreamingService = new GCSStreamingService();
