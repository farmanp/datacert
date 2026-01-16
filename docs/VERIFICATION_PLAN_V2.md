# UX Verification Plan - V2 Features

This document provides a structured verification plan to confirm the successful implementation of the four major UX enhancements: **Performance Metrics**, **Privacy Badge**, **Dropzone Feedback**, and **Sample Data Integration**.

---

## 1. Performance Metrics (UX-002)
*Goal: Provide immediate feedback on the speed of the local profiling engine.*

| Check | Action | Expected Result |
| :--- | :--- | :--- |
| **Accuracy** | Profile a file of known size (e.g., 50MB). | "Processed 50MB in Xs" appears in the report header. |
| **Formatting (ms)** | Profile a very small file (e.g., 1KB). | Time displays in milliseconds (e.g., `45ms`) instead of `0.04s`. |
| **Formatting (s)** | Profile a larger file (> 1s). | Time displays in seconds with 2 decimal places (e.g., `1.24s`). |
| **Reset** | Click "Clear" or upload a new file. | Metrics are cleared and do not persist from the previous run. |
| **MB/s Display** | Check the report header text. | The processed size and time are visible and legible. |

---

## 2. Privacy Badge (UX-003)
*Goal: Build user trust by visually confirming 100% local data processing.*

| Check | Action | Expected Result |
| :--- | :--- | :--- |
| **Presence** | Open the Home page. | "Private & Local" badge is visible in the navigation bar. |
| **Animation** | Observe the green dot in the badge. | A subtle pulse animation is visible on the status indicator. |
| **Tooltip** | Hover over the "Private & Local" badge. | A tooltip appears explaining that "No data leaves your device." |
| **Consistency** | Navigate to "SQL Mode" or other tools. | The badge remains visible in the header of all sub-pages. |
| **Compact Mode** | View on a mobile screen or in report view. | Badge adapts or remains accessible without breaking layout. |

---

## 3. Dropzone Feedback (UX-004)
*Goal: Create an immersive and reactive file import experience.*

| Check | Action | Expected Result |
| :--- | :--- | :--- |
| **Global Drag** | Drag a file anywhere over the browser window. | Full-screen **"Drop to Profile"** glassmorphism overlay appears. |
| **Card Reactivity** | Drag a file over the window specifically. | The "Import Files" landing card glows with a blue ring and border. |
| **Drop Validation** | Drop an unsupported file (e.g., `.jpg`). | A full-screen **Error Overlay** appears stating "Unsupported file format." |
| **Contextual Text** | Drag a file directly over the dropzone target. | Text changes from "Drag and drop..." to **"Drop file to analyze"**. |
| **Leave Sensitivity**| Drag a file into the window, then drag it back out. | Overlay vanishes immediately and cleanly. |

---

## 4. Sample Data Integration (UX-005)
*Goal: Lower the barrier to entry for new users.*

| Check | Action | Expected Result |
| :--- | :--- | :--- |
| **Call to Action** | Find the "Try with Sample Data" button on Home. | Button is visible and clearly separated from manual upload. |
| **Loading State** | Click "Try with Sample Data". | Transitions to "Computing Statistics..." loading state immediately. |
| **End-to-End** | Wait for sample profiling to finish. | Results load automatically without further clicks. |
| **Demo Badge** | Observe the report header for sample data. | "Processed 241.25 KB in Xms" (or similar) is correctly calculated. |

---

## 🧪 Automated Verification
The following unit and integration tests have been implemented to ensure regression safety:

1.  **`src/app/pages/Home.test.tsx`**: Verifies global drag overlay, drag-leave logic, and error modal triggering.
2.  **`src/app/components/ProfileReport.test.tsx`**: Verifies performance metric formatting (seconds vs. milliseconds).
3.  **`src/app/stores/profileStore.test.ts`**: Verifies state management and resetting of performance metrics.
4.  **`src/app/components/PrivacyBadge.test.tsx`**: Verifies tooltip behavior and presence.

### Running Tests
```bash
# Run all relevant tests
npm run test:ts -- src/app/pages/Home.test.tsx src/app/components/ProfileReport.test.tsx src/app/stores/profileStore.test.ts
```
