# Getting Started with DataCert

*Estimated reading time: 5 minutes*

## What is DataCert?

DataCert is a browser-based tool that analyzes your data **entirely on your device**—no uploads, no servers, no data ever leaves your machine. Think of it as a magnifying glass for CSV, JSON, Parquet, and Excel files.

## Quick Start

### 1. Upload Your Data (30 seconds)

Drag and drop any data file onto the landing page, or click **"Choose File"**.

**Supported formats:**
- CSV (`.csv`)
- JSON/JSONL (`.json`, `.jsonl`)
- Parquet (`.parquet`)
- Excel (`.xlsx`, `.xls`)
- Apache Avro (`.avro`)

**File size limits:**
- Up to **500MB** recommended for smooth performance
- Handles millions of rows using streaming architecture

### 2. View Profile Results (1 minute)

Once profiling completes, you'll see:

#### **KPI Summary Cards**
- **Total Rows**: Number of records
- **Total Columns**: Number of fields
- **Health Score**: Overall quality (0-100%)
- **Flagged Issues**: Missing values, PII, outliers

#### **Column Statistics**

Switch between **Table View** and **Card View**:

- **Table View**: Compact grid showing all metrics at once
- **Card View**: Detailed cards with histograms and sample values

**Key metrics explained:**
- **Completeness**: Percentage of non-null values (e.g., 95% = 5% missing)
- **Distinct Count**: Approximate unique values using HyperLogLog
- **Type**: Auto-detected data type (Integer, Numeric, String, Date, Boolean, Mixed)
- **Min/Max/Mean/Median**: For numeric columns
- **Top Values**: Most frequent values for categorical data

### 3. Explore Details (2 minutes)

#### **Search Columns**
Use the search bar to filter columns by name (e.g., "price" or "email").

#### **View Distributions**
Hover over histograms to see value ranges and frequencies.

#### **Drill Into Issues**
Click on warning badges (🔴 **Missing**, 🟡 **PII**, ⚠️ **Outliers**) to see the **specific row indices** where issues occur.

#### **Correlation Matrix** *(for numeric data)*
Click **"Compute Correlation"** to see relationships between numeric columns. Blue = positive correlation, red = negative.

### 4. Export Results (1 minute)

Click **"Export Profile"** and choose a format:

| Format | Use Case | File Type |
|--------|----------|-----------|
| **HTML Report** | Share with stakeholders, visual presentation | `.html` |
| **JSON Profile** | Programmatic access, integrate with pipelines | `.json` |
| **Column Stats (CSV)** | Spreadsheet analysis | `.csv` |
| **Markdown Summary** | Documentation, copy to clipboard | (clipboard) |
| **Great Expectations Suite** | Python validation rules | `.json` |
| **Soda Checks (YAML)** | SodaCL monitoring | `.yml` |
| **JSON Schema** | Universal schema validation | `.json` |

---

## What's Next?

### For Data Analysts
→ **[Data Profiling Guide](./guides/profiling.md)** – Deep dive into statistics and visualizations

### For Power Users
→ **[SQL Mode Guide](./guides/sql-mode.md)** – Query your data with DuckDB before profiling

### For Data Engineers
→ **[Export Formats Guide](./guides/exports.md)** – Choose the right export for your pipeline  
→ **[Schema Validation Guide](./guides/validation.md)** – Import and validate against GX/Soda/JSON Schema rules

### For Data Ops Teams
→ **[Batch & Compare Guide](./guides/batch-compare.md)** – Multi-file processing and schema drift detection

---

## Key Workflows

### "I want to understand my data"
1. Upload file → View **Column Cards** → Examine **Histograms** and **Top Values**

### "I want to validate data quality"
1. Profile your reference dataset → **Export Great Expectations Suite**
2. When new data arrives → Profile it → Go to **Quality** tab → Upload the GX Suite → See pass/fail results

### "I want to filter before profiling"
1. Upload file → Click **SQL Mode** → Write DuckDB query → Click **Profile Results**

### "I want to detect schema drift"
1. Upload two files → Use **Compare Mode** → View side-by-side diff

---

## Tips & Tricks

**Keyboard Shortcuts**
- `Ctrl/Cmd + K` → Focus search
- `Esc` → Close modals
- Arrow keys → Navigate in Table View

**Offline Mode**
DataCert is a Progressive Web App (PWA). Install it for offline use:
- Chrome/Edge: Click the install icon in the address bar
- iOS/Android: "Add to Home Screen"

**Privacy**
All processing happens **in your browser**. No data is ever uploaded. Check the Network tab—you'll see zero outgoing requests during profiling.

---

## Need Help?

- **[FAQ](./faq.md)** – Common questions
- **[Statistics Reference](./reference/statistics.md)** – What do these numbers mean?
- **[File Formats Reference](./reference/file-formats.md)** – Supported formats and known limitations

**Found a bug?** Open an issue on GitHub or check the console (F12) for error details.
