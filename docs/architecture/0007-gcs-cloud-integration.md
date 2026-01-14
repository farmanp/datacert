---
id: gcs-cloud-integration
title: 7. GCS Cloud Integration
sidebar_label: 7. GCS Integration
---

# 7. Google Cloud Storage Integration

Date: 2026-01-13

## Status

Accepted

## Context

DataLens Profiler is built on a privacy-first, local-processing architecture (ADR 0003). However, enterprise users increasingly store their datasets in cloud storage services like Google Cloud Storage (GCS). These users need to profile cloud-hosted data without compromising the core privacy guarantee that **data never leaves the user's control**.

The challenge is to enable cloud storage access while maintaining the architectural principle that no data passes through DataLens servers.

## Decision

We will implement a **hybrid authentication and direct-streaming architecture** for GCS integration:

### 1. Hybrid Authentication Strategy

We support two authentication methods to cover different use cases:

*   **OAuth 2.0 with PKCE (Proof Key for Code Exchange):** For interactive users who want to browse and select files from their GCS buckets. The OAuth flow happens entirely in the browser, and access tokens are stored locally (never sent to DataLens servers).
*   **Signed URLs:** For automated workflows or sharing scenarios where users generate time-limited, pre-authenticated URLs from the GCS Console or `gsutil`. Users paste the signed URL directly into DataLens.

### 2. Direct Browser-to-GCS Streaming

Once authenticated, the browser fetches data directly from GCS:

```
User → DataLens UI → GCS API (direct HTTPS)
         ↓
    profiler.worker.ts (processes stream)
         ↓
    ProfileResult → UI
```

*   **Mechanism:** We use the browser's `fetch` API with appropriate authentication headers to stream data directly from `storage.googleapis.com`.
*   **Streaming:** Large files are read using range requests, processed in chunks (consistent with ADR 0004), and never fully buffered in memory.
*   **Zero Server Involvement:** DataLens servers never see the data, the bucket name, or even that a cloud file is being processed.

### 3. CORS Configuration Requirement

For direct browser access to work, users must configure CORS on their GCS buckets:

```json
[
  {
    "origin": ["https://datalens.app"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
```

We provide documentation and a one-click configuration helper for users who have `gsutil` access.

## Consequences

### Positive

*   **Privacy Preserved:** Data flows directly from GCS to the user's browser. DataLens servers never see or handle user data, maintaining the core privacy guarantee.
*   **Enterprise-Ready:** Organizations can profile datasets stored in their existing cloud infrastructure without data exfiltration concerns.
*   **Familiar Authentication:** OAuth 2.0 PKCE is a standard flow that enterprise security teams can audit and approve.
*   **Performance:** Direct streaming avoids the latency and bandwidth costs of proxying through an intermediary server.

### Negative

*   **CORS Configuration Required:** Users must configure CORS on their buckets, which requires bucket-level permissions and may involve IT/DevOps coordination.
*   **Network-Dependent Performance:** Unlike local file processing (ADR 0006), cloud file profiling speed depends on the user's network bandwidth and GCS region latency.
*   **Token Management Complexity:** OAuth tokens expire and must be refreshed. We must handle token refresh gracefully without interrupting long-running profiling operations.

### Neutral

*   **GCS-First:** This ADR focuses on GCS. AWS S3 and Azure Blob Storage may follow a similar pattern but will require separate ADRs due to authentication differences.
*   **Offline Unavailable:** Cloud integration naturally requires network connectivity, unlike local file processing which works fully offline.
