# DataLens Profiler - Test Scenarios

This document outlines the comprehensive test scenarios for validating the DataLens Profiler application. It covers functional, performance, security, and usability testing across all supported workflows.

## 1. Core Functionality: File Ingestion & Profiling

### 1.1 Local File Upload (Drag & Drop)
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-001** | **Valid CSV Upload** | 1. Open app.<br>2. Drag a valid `.csv` file (e.g., 10k rows) into the dropzone. | - File is accepted.<br>- Parsing progress bar appears.<br>- Results dashboard loads.<br>- Row count matches file actuals. |
| **TC-002** | **Valid Parquet Upload** | 1. Open app.<br>2. Drag a valid `.parquet` file. | - Detected as Parquet.<br>- Profiling completes.<br>- Schema types (Int64, Timestamp) are preserved correctly. |
| **TC-003** | **Valid JSON Upload** | 1. Open app.<br>2. Drag a `.json` array of objects. | - Detected as JSON.<br>- Nested fields (e.g., `address.city`) are flattened into columns.<br>- "Value" column created for array of primitives. |
| **TC-004** | **Unsupported File Type** | 1. Upload a `.jpg` or `.pdf`. | - Error message: "Unsupported file type".<br>- Processing does not start. |
| **TC-005** | **Empty File** | 1. Upload a 0-byte CSV. | - Error message: "File is empty".<br>- App remains in idle state. |
| **TC-006** | **Large File Streaming** | 1. Upload a >500MB CSV file. | - UI remains responsive (no freezing).<br>- Progress bar updates smoothly.<br>- Memory usage remains stable (checked via Task Manager). |

### 1.2 Data Parsing & Statistics
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-007** | **Delimiter Detection** | 1. Upload a Tab-Separated (`.tsv`) file.<br>2. Upload a Pipe-Separated (`|`) file. | - Both files are parsed correctly without manual configuration.<br>- Columns are split correctly. |
| **TC-008** | **Numeric Statistics** | 1. Upload file with known numeric distribution.<br>2. Check "Deep Dive" card. | - Mean, Median, Min, Max, StdDev match expected values.<br>- Histogram bins look accurate. |
| **TC-009** | **Null/Missing Handling** | 1. Upload file with `null`, `""`, and `NA` values. | - Missing count accurately reflects empty values.<br>- "Health Score" decreases based on missing %.<br>- Quality Badge shows Yellow/Red for high null cols. |
| **TC-010** | **Mixed Types** | 1. Upload CSV where a column has both numbers and strings (e.g., ID column with "ERR-01"). | - Inferred type should be "String" (or mixed).<br>- Profiling does not crash.<br>- Non-numeric values are handled gracefully in stats. |

## 2. Integration: Google Cloud Storage (GCS)

### 2.1 Authentication
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-011** | **Google Sign-In** | 1. Click "Sign in with Google" (top right).<br>2. Complete OAuth flow in popup. | - Button changes to user profile picture.<br>- "Authenticated as [email]" is visible.<br>- `gcs_access_token` stored in SessionStorage. |
| **TC-012** | **Sign Out** | 1. Click "Sign out". | - User session cleared.<br>- Button reverts to "Sign in with Google".<br>- Access token removed from storage. |

### 2.2 Remote Profiling
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-013** | **Profile gs:// URL** | 1. Auth with Google.<br>2. Enter `gs://my-bucket/data.csv`.<br>3. Click "Profile". | - URL normalized to `https://storage...`.<br>- File streams and profiles.<br>- Results identical to local upload of same file. |
| **TC-014** | **CORS Error Handling** | 1. Enter URL for bucket *without* CORS config. | - Error message: "CORS Error. Please configure CORS...".<br>- Link to "CORS Setup Guide" displayed. |
| **TC-015** | **403 Forbidden** | 1. Enter URL for bucket user cannot access. | - Error: "Access denied (403). Check bucket permissions." |
| **TC-016** | **404 Not Found** | 1. Enter invalid filename. | - Error: "File not found (404)". |

## 3. Workflow & Exports

### 3.1 Reporting
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-017** | **Interactive HTML Export** | 1. Profile a file.<br>2. Menu -> "Interactive HTML". | - `.html` file downloads.<br>- Opens in browser without internet.<br>- Charts and tables are fully interactive. |
| **TC-018** | **Copy as Markdown** | 1. Profile a file.<br>2. Menu -> "Copy as Markdown".<br>3. Paste into GitHub/Jira. | - Toast "Markdown copied" appears.<br>- Paste results in a formatted table with Summary and Column Stats. |
| **TC-019** | **JSON/CSV Export** | 1. Profile a file.<br>2. Export as JSON and CSV. | - Files download correctly.<br>- JSON structure matches schema.<br>- CSV contains statistical summary (not raw data). |

### 3.2 Demo Mode
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-020** | **Load Sample Data** | 1. Click "Try with Sample Data". | - "Demo Data" badge appears in header.<br>- Sample dataset loads instantly.<br>- All charts populated. |
| **TC-021** | **Clear Demo** | 1. Load Demo.<br>2. Click "Clear". | - Results cleared.<br>- "Demo Data" badge disappears.<br>- App returns to dropzone state. |

## 4. UI/UX & Accessibility

### 4.1 Accessibility (a11y)
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-022** | **Keyboard Navigation** | 1. Use `Tab` / `Shift+Tab` to navigate.<br>2. Use `Enter` to activate buttons. | - Focus rings visible on all interactive elements.<br>- Can complete full workflow (Upload -> View -> Export) without mouse. |
| **TC-023** | **Screen Reader** | 1. Use VoiceOver/NVDA. | - Dropzone announces state.<br>- Results table headers and cells read correctly.<br>- Status messages (toasts) are announced. |
| **TC-024** | **Color Contrast** | 1. Audit text against dark background. | - All text meets WCAG AA (4.5:1).<br>- Secondary text uses `text-slate-400` or lighter. |

### 4.2 Responsiveness
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-025** | **Mobile View** | 1. Resize browser to mobile width (375px). | - Results table scrolls horizontally.<br>- Layout stacks vertically (Cards).<br>- No horizontal page scrollbar (overflow hidden). |

## 5. Security & Privacy

### 5.1 Local-First Verification
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-026** | **Network Isolation** | 1. Open DevTools > Network.<br>2. Upload local CSV. | - **Zero** requests sent to external servers (except analytics if configured, but strictly no file data).<br>- WASM processing happens on main/worker thread. |
| **TC-027** | **Offline Capability** | 1. Disconnect Internet.<br>2. Load app (PWA) and upload file. | - App functions 100% normally.<br>- Profiling completes successfully. |

### 5.2 Token Handling
| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-028** | **Token Persistence** | 1. Auth with Google.<br>2. Refresh page. | - User remains logged in (SessionStorage check). |
| **TC-029** | **Token Scope** | 1. Verify requested scopes. | - Only `devstorage.read_only` and userinfo scopes are requested. |
