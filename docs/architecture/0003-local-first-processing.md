---
id: local-first-processing
title: 3. Local-First Processing
sidebar_label: 3. Local-First
---

# 3. Local-First Data Processing

Date: 2026-01-13

## Status

Accepted

## Context

Data profiling tools often require users to upload their data to a server for processing. This presents significant barriers:
1.  **Privacy/Security:** Users are hesitant to upload sensitive or proprietary data to third-party servers.
2.  **Latency/Bandwidth:** Uploading gigabyte-sized CSV files is slow and consumes bandwidth.
3.  **Cost:** Hosting backend infrastructure to process large datasets is expensive.

## Decision

We will implement a **Local-First** architecture. **No data will leave the user's device.**
All parsing, analysis, and visualization generation will happen directly in the client's browser using the Wasm engine.

## Consequences

### Positive
*   **Privacy:** Complete data privacy guarantees; data never touches our servers.
*   **Speed:** Instant feedback; no upload time required.
*   **Cost:** Zero backend processing costs for us; the user's machine does the work.
*   **Offline:** The application can work entirely offline once loaded (PWA).

### Negative
*   **Hardware Constraints:** The processing power is limited by the user's device (CPU/RAM). We cannot rely on scalable cloud clusters.
*   **Browser Limits:** Browsers impose limits on memory usage and execution time (mitigated by Wasm and Workers).
