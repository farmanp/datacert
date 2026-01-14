# DataLens Profiler User Guide

Welcome to **DataLens Profiler**, a high-performance, local-first data profiling tool designed to give you instant insights into your datasets without ever compromising your privacy.

## Quick Start

1. **Launch the App**: Open DataLens Profiler in your browser.
2. **Upload Data**: Drag and drop a CSV, JSON, or Parquet file onto the upload zone.
3. **Analyze**: Watch as DataLens processes your data in real-time.
4. **Export**: Click the "Export" button to save your results as HTML, JSON, or CSV.

**New to DataLens?** Click the **"Try Demo"** button on the home page to explore sample data instantly—no upload required.

---

## Core Features

### 1. Streaming Data Processing
DataLens uses a custom Rust-powered engine compiled to WebAssembly. This allows it to handle large files (hundreds of megabytes) smoothly by processing them in chunks, keeping the UI responsive.

### 2. Comprehensive Statistics
For every column in your dataset, DataLens calculates:
- **Base Stats**: Total count, missing values, and uniqueness (distinct count).
- **Numeric Analysis**: Mean, Median, Min/Max, Standard Deviation, Skewness, and Kurtosis.
- **Quantiles**: P25, P75, P90, P95, and P99.
- **Categorical Analysis**: Top-N frequency distribution for non-numeric data.

### 3. Visualizations
- **Histograms**: Distribution views for numeric data.
- **Top Values**: Visual bars for categorical frequency.
- **Sparklines**: Mini-distributions in the tabular view for quick comparison.

### 4. Correlation Matrix
Understand relationships between numeric columns at a glance:
- Click the **"Compute Correlation"** button to generate a Pearson correlation matrix.
- View results as an interactive heatmap: red (-1) to white (0) to green (+1).
- Correlations are computed on-demand rather than automatically, keeping performance snappy for large datasets.

### 5. Interactive Results Table
- **Sorting**: Click any header to sort your columns by specific metrics (e.g., sort by "Missing %" to find dirty columns).
- **Search**: Quickly find specific columns by name.
- **View Toggles**: Switch between a compact **Table View** for comparison and high-detail **Card View** for deep dives.

---

## Comparison Mode

Compare two datasets side-by-side to track schema changes, data quality shifts, or version differences.

### Getting Started
1. Navigate to `/compare` or click **"Compare Mode"** from the home page.
2. Upload **File A** (your baseline) on the left panel.
3. Upload **File B** (your comparison target) on the right panel.

### What You'll See
- **Schema Differences**: Columns are categorized as added, removed, modified, or unchanged.
- **Statistical Deltas**: Compare metrics between files with color-coded indicators:
  - Green: Improvement (e.g., fewer missing values)
  - Red: Degradation (e.g., increased null percentage)
  - Gray: Unchanged or negligible difference

### Exporting Comparisons
Click **"Export Comparison"** to generate a standalone HTML report that includes all schema differences and statistical comparisons.

---

## Google Cloud Storage Integration

Stream files directly from Google Cloud Storage without downloading them to your local machine first.

### Authentication Options

**Option 1: OAuth (Recommended for regular use)**
1. Click the **GCS** button in the upload area.
2. Select **"Sign in with Google"**.
3. Authorize DataLens to access your Cloud Storage.
4. Browse and select files from your buckets.

**Option 2: Signed URL (Quick access)**
1. Click the **GCS** button in the upload area.
2. Select **"Use Signed URL"**.
3. Paste your pre-signed URL.
4. DataLens will stream the file directly.

### CORS Configuration
To stream files from your GCS bucket, you'll need to configure CORS settings. See [GCS Setup Guide](docs/user-guides/gcs-setup.md) for detailed instructions.

### Privacy Note
Data flows directly from GCS to your browser—it never passes through DataLens servers. Your cloud credentials are handled securely by Google's OAuth flow.

---

## Supported Formats

### CSV (Comma Separated Values)
- **Auto-detection**: DataLens automatically detects the delimiter (comma, semicolon, tab, pipe).
- **Header Detection**: Automatically identifies if the first row contains column headers.

### JSON (JavaScript Object Notation)
- **Standard Arrays**: `[{...}, {...}]`
- **JSON Lines**: One JSON object per line.
- **Flattening**: Nested JSON objects are automatically flattened into dot-notation columns (e.g., `user.address.zip`).

### Apache Parquet
- **Columnar Format**: Efficiently handles `.parquet` files commonly used in data engineering and analytics pipelines.
- **Auto-detection**: File type is automatically detected from the extension.

---

## Exporting Results

You can export your findings in four formats:

1. **Interactive HTML**: A standalone, high-fidelity report that can be shared and opened in any browser. Great for sharing with stakeholders.
2. **Print to PDF**: Uses calibrated print styles to create a clean, multi-page document of your profile.
3. **Data Profile (JSON)**: The full technical summary, including all metrics and metadata. Perfect for integrating into data engineering pipelines.
4. **Column Stats (CSV)**: A simple spreadsheet summary where each row is a column from your dataset.

---

## Privacy & Security

**Your data never leaves your device.**

DataLens Profiler is built on a "Local-First" architecture. Unlike other online tools, the files you upload are processed entirely within your browser's memory and local Web Workers. No data is sent to any server, making it safe for sensitive, proprietary, or regulated data.

When using GCS integration, data streams directly from Google's servers to your browser—DataLens acts only as a conduit, never storing or transmitting your data elsewhere.

---

## Pro Tips

- **Sort by Distinct Value**: High uniqueness in a non-numeric column often suggests a primary key or an ID.
- **Check Skewness**: Use the numeric Skewness metric to identify outliers or data imbalances before feeding data into ML models.
- **PWA Mode**: Install DataLens as a desktop app (via the browser icon) to use it offline and with a dedicated window.
- **Use Demo Mode**: Explore DataLens features with sample data before uploading your own files.
- **Correlation Analysis**: Use the correlation matrix to identify multicollinearity before building regression models.

---

## Canceling Processing

Need to stop a profile in progress? DataLens has you covered:

- A **Cancel** button appears in the progress bar during file processing.
- For files larger than 50MB, you'll see a confirmation dialog to prevent accidental cancellation.
- Canceling immediately stops processing and clears the workspace, allowing you to upload a new file.

---

## Troubleshooting

### Error Messages
DataLens provides clear, actionable error messages when something goes wrong:
- **Error Description**: A plain-language explanation of what happened.
- **Likely Cause**: The most probable reason for the error.
- **Recovery Suggestions**: Specific steps you can take to resolve the issue.
- **Technical Details**: Expandable section with debugging information for advanced users.

### Common Issues

**Large File Issues**
While DataLens is high-performance, very large files (e.g., >1GB) may hit browser memory limits. If the app crashes, try processing a smaller sample.

**Encoding Problems**
DataLens expects **UTF-8** encoding. If you see strange characters, ensure your source file is saved as UTF-8.

**Browser Support**
For the best experience, use a modern browser (Chrome, Edge, Firefox, or Safari) with WebAssembly and Web Worker support enabled.

**GCS Connection Issues**
If you're having trouble connecting to GCS:
- Verify your CORS configuration is correct (see [GCS Setup Guide](docs/user-guides/gcs-setup.md)).
- Ensure your signed URL hasn't expired.
- Check that your Google account has read access to the bucket.

**Processing Seems Stuck**
If a file appears to be processing indefinitely:
- Use the Cancel button to stop and try again.
- For very large files, consider sampling your data first.
- Check the browser console for any error messages (press F12 to open developer tools).
