export interface ParsedUrl {
    type: 's3' | 'gcs' | 'http';
    url: string;
    filename: string;
    bucket?: string;
    key?: string;
}

/**
 * Parses a data URL to extract source type, bucket, key, and filename.
 */
export function parseDataUrl(input: string): ParsedUrl {
    const trimmedInput = input.trim();

    // S3 Protocol
    if (trimmedInput.startsWith('s3://')) {
        const withoutProtocol = trimmedInput.replace('s3://', '');
        const firstSlashIndex = withoutProtocol.indexOf('/');

        if (firstSlashIndex === -1) {
            return {
                type: 's3',
                url: trimmedInput,
                bucket: withoutProtocol,
                key: '',
                filename: withoutProtocol,
            };
        }

        const bucket = withoutProtocol.substring(0, firstSlashIndex);
        const key = withoutProtocol.substring(firstSlashIndex + 1);
        const filename = key.split('/').pop() || bucket;

        return {
            type: 's3',
            url: trimmedInput,
            bucket,
            key,
            filename,
        };
    }

    // GCS Protocol
    if (trimmedInput.startsWith('gs://')) {
        const withoutProtocol = trimmedInput.replace('gs://', '');
        const firstSlashIndex = withoutProtocol.indexOf('/');

        if (firstSlashIndex === -1) {
            return {
                type: 'gcs',
                url: trimmedInput,
                bucket: withoutProtocol,
                key: '',
                filename: withoutProtocol,
            };
        }

        const bucket = withoutProtocol.substring(0, firstSlashIndex);
        const key = withoutProtocol.substring(firstSlashIndex + 1);
        const filename = key.split('/').pop() || bucket;

        return {
            type: 'gcs',
            url: trimmedInput,
            bucket,
            key,
            filename,
        };
    }

    // HTTP/HTTPS or Pre-signed URLs
    try {
        const url = new URL(trimmedInput);
        let type: 's3' | 'gcs' | 'http' = 'http';

        // Heuristics for pre-signed URLs
        if (url.hostname.includes('.s3.') || url.hostname.endsWith('.amazonaws.com')) {
            type = 's3';
        } else if (url.hostname.includes('storage.googleapis.com')) {
            type = 'gcs';
        }

        const pathname = url.pathname;
        const filename = pathname.split('/').pop() || 'remote_file';

        return {
            type,
            url: trimmedInput,
            filename,
        };
    } catch (e) {
        // Treat as fallback HTTP if URL parsing fails or just return minimal
        return {
            type: 'http',
            url: trimmedInput,
            filename: trimmedInput.split('/').pop() || 'remote_file',
        };
    }
}
