# FEAT-031: Remote URL Profiling (S3, GCS, HTTP)

## 1. Intent (Required)

**User Story:**
As a data engineer
I want to profile files directly from S3/GCS/HTTP URLs
So that I don't have to download large files locally first

**Success Looks Like:**
Paste `s3://bucket/path/file.parquet` or `https://example.com/data.csv` → Profile streams directly without local download.

## 2. Context & Constraints (Required)

**Background:**
Large datasets often live in cloud storage. Currently users must:
1. Download file locally (slow, uses disk space)
2. Upload to DataCert (duplicate transfer)

Direct URL profiling would:
- Eliminate download step
- Enable profiling of files larger than local storage
- Support pre-signed URLs for private buckets
- Enable profiling data lakes directly

**Scope:**
- **In Scope:**
  - HTTP/HTTPS URLs (public files)
  - S3 URLs with pre-signed URLs
  - GCS URLs with pre-signed URLs
  - Streaming fetch (don't buffer entire file)
  - Progress indicator based on Content-Length
  - Support CSV, JSON, JSONL, Parquet

- **Out of Scope:**
  - AWS credentials management (use pre-signed)
  - GCP service account auth (use pre-signed)
  - Azure Blob (future ticket)
  - Private bucket browsing
  - URL validation before profiling

**Constraints:**
- CORS must be enabled on source (or use proxy)
- Pre-signed URLs expire (user responsibility)
- Parquet requires full file access (seek operations)
- Max file size: 1GB (browser memory)

## 3. Acceptance Criteria (Required)

**Scenario: Profile public HTTP URL**
Given a public CSV URL "https://data.gov/dataset.csv"
When I paste the URL in the URL input field
And click "Profile URL"
Then the file streams and profiles
And progress shows download + processing

**Scenario: Profile S3 pre-signed URL**
Given a pre-signed S3 URL with valid signature
When I paste the URL
Then the file is fetched and profiled
And original filename extracted from URL

**Scenario: Profile GCS pre-signed URL**
Given a pre-signed GCS URL
When I paste the URL
Then the file is fetched and profiled

**Scenario: CORS error handling**
Given a URL that blocks CORS
When I try to profile it
Then error shows "CORS blocked. Use a pre-signed URL or enable CORS on server"
And link to documentation provided

**Scenario: Large file streaming**
Given a 500MB CSV file URL
When I profile it
Then memory stays under 200MB (streaming)
And progress updates as data streams

**Scenario: Invalid URL**
Given a malformed or unreachable URL
When I try to profile it
Then error shows "Could not fetch URL: [reason]"
And UI returns to input state

## 4. AI Execution Instructions (Required)

**Allowed to Change:**
- Create `src/app/components/UrlInput.tsx`
- Modify `src/app/services/gcs-streaming.service.ts` to support S3/HTTP
- Create `src/app/utils/url-parser.ts`
- Modify `src/app/stores/fileStore.ts` to support URL source
- Add URL tab to FileDropzone

**Must NOT Change:**
- Profiling logic (reuse existing)
- WASM code
- Local file upload flow

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- feat(url): add UrlInput component
- feat(url): add remote URL streaming service
- feat(url): support S3 pre-signed URLs
- feat(url): support GCS pre-signed URLs
- feat(url): add CORS error handling
- docs: add remote URL profiling guide

## 6. Verification & Definition of Done (Required)

- [ ] Public HTTP CSV URLs work
- [ ] S3 pre-signed URLs work
- [ ] GCS pre-signed URLs work
- [ ] Parquet files from URL work
- [ ] Streaming keeps memory low
- [ ] CORS errors have clear message
- [ ] Progress shows during fetch
- [ ] URL tab integrated with dropzone
- [ ] Documentation updated

## 7. Technical Design

### URL Input UI

```tsx
<Tabs>
  <Tab label="Upload File">
    <FileDropzone />
  </Tab>
  <Tab label="Profile URL">
    <UrlInput />
  </Tab>
</Tabs>
```

### URL Parsing

```typescript
interface ParsedUrl {
  type: 's3' | 'gcs' | 'http';
  url: string;
  filename: string;
  bucket?: string;
  key?: string;
}

function parseDataUrl(input: string): ParsedUrl {
  if (input.startsWith('s3://')) {
    // s3://bucket/path/file.csv
    const [, bucket, ...keyParts] = input.replace('s3://', '').split('/');
    return {
      type: 's3',
      url: input,
      bucket,
      key: keyParts.join('/'),
      filename: keyParts[keyParts.length - 1]
    };
  }
  if (input.startsWith('gs://')) {
    // gs://bucket/path/file.csv
    // Similar parsing
  }
  // HTTP/HTTPS
  const url = new URL(input);
  return {
    type: 'http',
    url: input,
    filename: url.pathname.split('/').pop() || 'remote_file'
  };
}
```

### Streaming Fetch

```typescript
async function* streamRemoteFile(url: string): AsyncGenerator<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const contentLength = parseInt(response.headers.get('Content-Length') || '0');
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    loaded += value.byteLength;
    yield value;

    // Update progress
    if (contentLength > 0) {
      updateProgress(loaded / contentLength * 100);
    }
  }
}
```

### S3 Pre-signed URL Format

```
https://bucket.s3.region.amazonaws.com/key?
  X-Amz-Algorithm=AWS4-HMAC-SHA256&
  X-Amz-Credential=...&
  X-Amz-Date=...&
  X-Amz-Expires=3600&
  X-Amz-Signature=...
```

### GCS Pre-signed URL Format

```
https://storage.googleapis.com/bucket/key?
  X-Goog-Algorithm=GOOG4-RSA-SHA256&
  X-Goog-Credential=...&
  X-Goog-Date=...&
  X-Goog-Expires=3600&
  X-Goog-Signature=...
```

## 8. Resources

- [Fetch API Streaming](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
- [S3 Pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [GCS Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [CORS for S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
