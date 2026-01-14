import { authStore } from '../stores/auth.store';

/**
 * Represents a file/object in a GCS bucket
 */
export interface GCSObject {
  name: string;
  fullPath: string;
  size: number;
  contentType: string;
  updated: string;
  isFolder: boolean;
}

/**
 * Response from GCS list objects API
 */
interface GCSListResponse {
  kind: string;
  nextPageToken?: string;
  prefixes?: string[];
  items?: Array<{
    id: string;
    selfLink: string;
    mediaLink: string;
    name: string;
    bucket: string;
    generation: string;
    metageneration: string;
    contentType: string;
    storageClass: string;
    size: string;
    md5Hash: string;
    crc32c: string;
    etag: string;
    timeCreated: string;
    updated: string;
    timeStorageClassUpdated: string;
  }>;
}

/**
 * Options for listing objects
 */
export interface ListObjectsOptions {
  prefix?: string;
  delimiter?: string;
  maxResults?: number;
  pageToken?: string;
}

const GCS_API_BASE = 'https://storage.googleapis.com/storage/v1';

/**
 * Parses a gs:// URL into bucket and path components
 */
export function parseGCSUrl(url: string): { bucket: string; path: string } | null {
  if (!url.startsWith('gs://')) {
    return null;
  }

  const path = url.slice(5);
  const slashIndex = path.indexOf('/');

  if (slashIndex === -1) {
    return { bucket: path, path: '' };
  }

  return {
    bucket: path.slice(0, slashIndex),
    path: path.slice(slashIndex + 1),
  };
}

/**
 * Formats file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets the file extension from a filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Checks if a file is a supported data format
 */
export function isSupportedDataFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  const supportedExtensions = ['csv', 'tsv', 'json', 'jsonl', 'parquet', 'avro', 'xlsx', 'xls'];
  return supportedExtensions.includes(ext);
}

/**
 * GCS Browser Service - Lists and browses objects in GCS buckets
 */
class GCSBrowserService {
  /**
   * Lists objects in a GCS bucket
   *
   * @param bucket - The bucket name
   * @param options - Optional listing options (prefix, delimiter, etc.)
   * @returns List of objects and any prefixes (folders)
   */
  async listObjects(
    bucket: string,
    options: ListObjectsOptions = {}
  ): Promise<{
    objects: GCSObject[];
    folders: string[];
    nextPageToken?: string;
  }> {
    const token = await authStore.getValidToken();
    if (!token) {
      throw new Error('Not authenticated. Please sign in with Google first.');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (options.prefix) params.set('prefix', options.prefix);
    if (options.delimiter) params.set('delimiter', options.delimiter);
    if (options.maxResults) params.set('maxResults', options.maxResults.toString());
    if (options.pageToken) params.set('pageToken', options.pageToken);

    const url = `${GCS_API_BASE}/b/${encodeURIComponent(bucket)}/o?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication expired. Please sign in again.');
      }
      if (response.status === 403) {
        throw new Error(
          'Access denied to bucket. Check that you have storage.objects.list permission.'
        );
      }
      if (response.status === 404) {
        throw new Error(`Bucket "${bucket}" not found.`);
      }
      const errorText = await response.text();
      throw new Error(`Failed to list bucket objects: ${response.status} - ${errorText}`);
    }

    const data: GCSListResponse = await response.json();

    // Process items into GCSObject format
    const objects: GCSObject[] = (data.items || []).map((item) => ({
      name: item.name.split('/').filter(Boolean).pop() || item.name,
      fullPath: `gs://${bucket}/${item.name}`,
      size: parseInt(item.size, 10),
      contentType: item.contentType,
      updated: item.updated,
      isFolder: false,
    }));

    // Process prefixes (folders) when using delimiter
    const folders: string[] = data.prefixes || [];

    return {
      objects,
      folders,
      nextPageToken: data.nextPageToken,
    };
  }

  /**
   * Lists objects in a bucket with folder-like navigation
   * Uses '/' as delimiter for directory-like listing
   *
   * @param bucket - The bucket name
   * @param prefix - Optional path prefix (folder path)
   * @param maxResults - Maximum number of results per page
   * @param pageToken - Pagination token for next page
   */
  async browseFolder(
    bucket: string,
    prefix: string = '',
    maxResults: number = 100,
    pageToken?: string
  ): Promise<{
    items: GCSObject[];
    nextPageToken?: string;
    currentPath: string;
  }> {
    // Ensure prefix ends with / if not empty (for folder navigation)
    const normalizedPrefix = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;

    const { objects, folders, nextPageToken: nextToken } = await this.listObjects(bucket, {
      prefix: normalizedPrefix,
      delimiter: '/',
      maxResults,
      pageToken,
    });

    // Convert folders to GCSObject format
    const folderObjects: GCSObject[] = folders.map((folderPath) => {
      const folderName = folderPath.slice(normalizedPrefix.length, -1); // Remove prefix and trailing /
      return {
        name: folderName,
        fullPath: `gs://${bucket}/${folderPath}`,
        size: 0,
        contentType: 'application/x-directory',
        updated: '',
        isFolder: true,
      };
    });

    // Filter out folder placeholder objects (objects that are just the prefix itself)
    const fileObjects = objects.filter(
      (obj) => obj.name && !obj.name.endsWith('/') && obj.size > 0
    );

    // Combine folders and files, folders first
    const items = [...folderObjects, ...fileObjects];

    return {
      items,
      nextPageToken: nextToken,
      currentPath: normalizedPrefix,
    };
  }

  /**
   * Gets metadata for a specific object
   */
  async getObjectMetadata(bucket: string, objectPath: string): Promise<GCSObject | null> {
    const token = await authStore.getValidToken();
    if (!token) {
      throw new Error('Not authenticated. Please sign in with Google first.');
    }

    const url = `${GCS_API_BASE}/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectPath)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get object metadata: ${response.status}`);
    }

    const item = await response.json();

    return {
      name: item.name.split('/').filter(Boolean).pop() || item.name,
      fullPath: `gs://${bucket}/${item.name}`,
      size: parseInt(item.size, 10),
      contentType: item.contentType,
      updated: item.updated,
      isFolder: false,
    };
  }

  /**
   * Searches for files matching a pattern in a bucket
   */
  async searchFiles(
    bucket: string,
    searchTerm: string,
    options: { prefix?: string; maxResults?: number } = {}
  ): Promise<GCSObject[]> {
    // GCS doesn't support wildcard search, so we list with prefix and filter client-side
    const { objects } = await this.listObjects(bucket, {
      prefix: options.prefix,
      maxResults: options.maxResults || 1000,
    });

    const searchLower = searchTerm.toLowerCase();
    return objects.filter((obj) => obj.name.toLowerCase().includes(searchLower));
  }

  /**
   * Lists only data files (CSV, Parquet, etc.) in a bucket path
   */
  async listDataFiles(
    bucket: string,
    prefix: string = '',
    maxResults: number = 100
  ): Promise<GCSObject[]> {
    const { items } = await this.browseFolder(bucket, prefix, maxResults);
    return items.filter((item) => item.isFolder || isSupportedDataFormat(item.name));
  }

  /**
   * Helper to format an object for display
   */
  formatObjectForDisplay(obj: GCSObject): {
    name: string;
    displaySize: string;
    type: string;
    icon: string;
  } {
    if (obj.isFolder) {
      return {
        name: obj.name,
        displaySize: '-',
        type: 'Folder',
        icon: '📁',
      };
    }

    const ext = getFileExtension(obj.name);
    const iconMap: Record<string, string> = {
      csv: '📊',
      tsv: '📊',
      json: '📋',
      jsonl: '📋',
      parquet: '🗃️',
      avro: '🗃️',
      xlsx: '📗',
      xls: '📗',
    };

    return {
      name: obj.name,
      displaySize: formatFileSize(obj.size),
      type: ext.toUpperCase() || 'File',
      icon: iconMap[ext] || '📄',
    };
  }
}

export const gcsBrowserService = new GCSBrowserService();
