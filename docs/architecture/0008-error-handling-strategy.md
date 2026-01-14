---
id: error-handling-strategy
title: 8. Error Handling Strategy
sidebar_label: 8. Error Handling
---

# 8. Error Handling Strategy

Date: 2026-01-13

## Status

Accepted

## Context

DataLens Profiler processes user-provided data files that may contain malformed content, unexpected encodings, or structural issues. Additionally, the hybrid architecture (ADR 0002) introduces failure points at the Wasm boundary, Web Worker communication, and (with ADR 0007) network operations.

The problem is that **raw technical error messages confuse users** and provide no actionable guidance. Messages like "CSV parse error at byte offset 45892" or "Wasm memory allocation failed" are accurate but unhelpful for users who simply want to profile their data.

## Decision

We will implement a **structured error handling system** with user-friendly error presentation:

### 1. Structured Error Types

All errors are categorized into a finite set of error types that map to user-understandable scenarios:

| Error Type        | Description                                      |
|-------------------|--------------------------------------------------|
| `PARSE_ERROR`     | File content could not be parsed (malformed CSV, invalid JSON structure) |
| `FILE_TOO_LARGE`  | File exceeds the browser's memory constraints    |
| `INVALID_FORMAT`  | File extension or MIME type not supported        |
| `ENCODING_ERROR`  | Character encoding detection failed or unsupported encoding |
| `NETWORK_ERROR`   | Cloud storage fetch failed (timeout, CORS, auth) |
| `WASM_ERROR`      | Internal Wasm engine failure (memory, panic)     |

### 2. ProfilerError Interface

All errors are transformed into a consistent structure before reaching the UI:

```typescript
interface ProfilerError {
  type: ErrorType;
  title: string;           // Human-readable headline
  description: string;     // Detailed explanation
  causes: string[];        // Possible reasons this occurred
  actions: string[];       // Concrete steps the user can take
  technical?: {            // Optional debug info (collapsed by default)
    code: string;
    details: string;
    stack?: string;
  };
}
```

Example transformation:

```typescript
// Raw Wasm error
"CSV parse error: record 15234 has 5 fields, expected 6"

// Transformed ProfilerError
{
  type: "PARSE_ERROR",
  title: "Unable to Parse CSV File",
  description: "The file contains rows with inconsistent column counts.",
  causes: [
    "Row 15234 has 5 columns instead of the expected 6",
    "The file may have unescaped commas or quotes in cell values",
    "The delimiter may have been incorrectly detected"
  ],
  actions: [
    "Check row 15234 in your source file for formatting issues",
    "Ensure all text fields with commas are properly quoted",
    "Try specifying the delimiter manually if auto-detection failed"
  ],
  technical: {
    code: "CSV_FIELD_COUNT_MISMATCH",
    details: "record 15234 has 5 fields, expected 6"
  }
}
```

### 3. ErrorDisplay Component

A dedicated `ErrorDisplay` component provides consistent error presentation across the application:

*   **Visual Hierarchy:** Error type icon, title, description, expandable causes/actions sections.
*   **Copy Debug Info:** One-click button to copy technical details for bug reports.
*   **Retry Action:** For recoverable errors (network, transient Wasm), a retry button is provided.
*   **Dismissible:** Users can dismiss errors to try a different file.

### 4. Error Boundaries

*   **Worker Errors:** The worker catches all exceptions and sends structured error messages to the main thread.
*   **Wasm Panics:** Rust panics are caught at the Wasm boundary and converted to `WASM_ERROR` type.
*   **React Error Boundary:** A top-level error boundary catches rendering errors and displays a recovery UI.

## Consequences

### Positive

*   **User-Friendly:** Users see actionable guidance instead of cryptic technical messages.
*   **Consistent UX:** All errors look and behave the same way, regardless of source.
*   **Debuggable:** Technical details are preserved and easily shared for bug reports.
*   **Recoverable:** Users understand what went wrong and how to fix it, reducing support burden.

### Negative

*   **Translation Overhead:** Every new error case in Wasm/Worker code requires a corresponding user-friendly message mapping.
*   **Maintenance:** Error messages must be kept accurate as the codebase evolves.
*   **Potential Information Loss:** Over-simplification could occasionally hide relevant technical context from power users.

### Neutral

*   **Localization-Ready:** The structured format naturally supports future internationalization of error messages.
*   **Analytics-Friendly:** Structured error types enable tracking of common failure modes to prioritize fixes.
