# DataCert User Guide

Welcome to **DataCert**, a high-performance, local-first data profiling tool designed to give you instant insights into your datasets without ever compromising your privacy.

## 🚀 Quick Start

1. **Launch the App**: Open DataCert in your browser.
2. **Upload Data**: Drag and drop a CSV or JSON file onto the upload zone.
3. **Analyze**: Watch as DataCert processes your data in real-time.
4. **Export**: Click the "Export" button to save your results as HTML, JSON, or CSV.

---

## 🛠 Core Features

### 1. Streaming Data Processing
DataCert uses a custom Rust-powered engine compiled to WebAssembly. This allows it to handle large files (hundreds of megabytes) smoothly by processing them in chunks, keeping the UI responsive.

### 2. Comprehensive Statistics
For every column in your dataset, DataCert calculates:
- **Base Stats**: Total count, missing values, and uniqueness (distinct count).
- **Numeric Analysis**: Mean, Median, Min/Max, Standard Deviation, Skewness, and Kurtosis.
- **Quantiles**: P25, P75, P90, P95, and P99.
- **Categorical Analysis**: Top-N frequency distribution for non-numeric data.

### 3. Visualizations
- **Histograms**: Distribution views for numeric data.
- **Top Values**: Visual bars for categorical frequency.
- **Sparklines**: Mini-distributions in the tabular view for quick comparison.

### 4. Interactive Results Table
- **Sorting**: Click any header to sort your columns by specific metrics (e.g., sort by "Missing %" to find dirty columns).
- **Search**: Quickly find specific columns by name.
- **View Toggles**: Switch between a compact **Table View** for comparison and high-detail **Card View** for deep dives.

---

## 📂 Supported Formats

### CSV (Comma Separated Values)
- **Auto-detection**: DataCert automatically detects the delimiter (comma, semicolon, tab, pipe).
- **Header Detection**: Automatically identifies if the first row contains column headers.

### JSON (JavaScript Object Notation)
- **Standard Arrays**: `[{...}, {...}]`
- **JSON Lines**: One JSON object per line.
- **Flattening**: Nested JSON objects are automatically flattened into dot-notation columns (e.g., `user.address.zip`).

---

## 📤 Exporting Results

You can export your findings in four formats:

1. **Interactive HTML**: A standalone, high-fidelity report that can be shared and opened in any browser. Great for sharing with stakeholders.
2. **Print to PDF**: Uses calibrated print styles to create a clean, multi-page document of your profile.
3. **Data Profile (JSON)**: The full technical summary, including all metrics and metadata. Perfect for integrating into data engineering pipelines.
4. **Column Stats (CSV)**: A simple spreadsheet summary where each row is a column from your dataset.

---

## 🔒 Privacy & Security

**Your data never leaves your device.**

DataCert is built on a "Local-First" architecture. Unlike other online tools, the files you upload are processed entirely within your browser's memory and local Web Workers. No data is sent to any server, making it safe for sensitive, proprietary, or regulated data.

---

## 💡 Pro Tips

- **Sort by Distinct Value**: High uniqueness in a non-numeric column often suggests a primary key or an ID.
- **Check Skewness**: Use the numeric Skewness metric to identify outliers or data imbalances before feeding data into ML models.
- **PWA Mode**: Install DataCert as a desktop app (via the browser icon) to use it offline and with a dedicated window.

---

## ❓ Troubleshooting

- **Large File Issues**: While DataCert is high-performance, very large files (e.g., >1GB) may hit browser memory limits. If the app crashes, try processing a smaller sample.
- **Encoding**: DataCert expects **UTF-8** encoding. If you see strange characters, ensure your source file is saved as UTF-8.
- **Browser Support**: For the best experience, use a modern browser (Chrome, Edge, Firefox, or Safari) with WebAssembly and Web Worker support enabled.
