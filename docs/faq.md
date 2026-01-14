# Frequently Asked Questions

## General

### What is DataCert?
DataCert is a browser-based Progressive Web App (PWA) for analyzing CSV, JSON, Parquet, Excel, and Avro files. It runs **entirely in your browser**—no data is ever uploaded to servers.

### Is my data safe?
Yes. All processing happens **locally in your browser**. No network requests are made during profiling. You can verify this in your browser's Network tab (F12).

### How large of a file can I profile?
- **Recommended:** Up to 500MB for smooth performance
- **Supported:** Technically up to 2GB (browser dependent)
- **Tip:** For files >500MB, use SQL Mode to filter first

### Does it work offline?
Yes! DataCert is a PWA. After the first visit, you can install it and use it completely offline.

---

## File Formats

### Which file formats are supported?
- CSV (.csv, .ts v, .txt)
- JSON / JSONL (.json, .jsonl)
- Parquet (.parquet)
- Excel (.xlsx, .xls)
- Apache Avro (.avro)

See **[File Formats Reference](./reference/file-formats.md)** for details.

### Can I profile multi-sheet Excel files?
Currently, only the **first sheet** is profiled. Export other sheets as CSV to profile them separately.

### How do I profile XML or SQL databases?
These aren't directly supported. Convert XML to CSV/JSON first, or export database tables to CSV/Parquet.

---

## Statistics & Accuracy

### Why is the distinct count approximate?
DataCert uses **HyperLogLog** for memory efficiency. This probabilistic algorithm provides ~98% accuracy while using constant memory, enabling profiling of high-cardinality columns without loading all values into RAM.

### What does "Mixed" type mean?
The column contains multiple incompatible data types (e.g., numbers and strings). This usually indicates data quality issues.

### How is the health score calculated?
```
Health Score = 0.4 × Completeness 
             + 0.3 × Type Consistency 
             + 0.2 × Uniqueness 
             + 0.1 × (1 - Outlier Rate)
```
See **[Statistics Reference](./reference/statistics.md)** for formulas.

### Are percentiles exact?
No, they use **t-digest** for streaming estimation (~95% accuracy). This trades perfect precision for the ability to handle unlimited data in constant memory.

---

## Performance

### Why is profiling slow?
- **Large files**: Try SQL Mode to filter/sample first
- **Complex JSON**: Deep nesting (>5 levels) slows parsing
- **Excel files**: XLSX parsing is inherently slower than CSV

### Can I speed up profiling?
- Convert Excel to CSV
- Use Parquet instead of JSON for large files
- Pre-filter data using SQL Mode

### My browser crashed. What happened?
The file likely exceeded available browser memory (varies by device). Try:
- Closing other tabs
- Using a lighter format (Parquet instead of JSON)
- Sampling the data first

---

## Profiling Results

### What are "outliers"?
Values more than 3 standard deviations from the mean. These may indicate data entry errors or legitimate extremes. Click the outlier badge to see row indices.

### Why isn't a column showing up?
Check if:
- Column is entirely null (shows as "Empty" type)
- Column name has special characters (may be escaped)
- Search filter is active (clear search)

### Can I profile the same column with different settings?
Not directly. Use SQL Mode to cast the column and profile the result:
```sql
SELECT CAST(price AS DECIMAL(10,2)) as price_decimal FROM data;
```

---

## Exports

### What's the difference between JSON Profile and JSON Schema?
- **JSON Profile**: Full statistics from profiling (mean, median, histogram, etc.)
- **JSON Schema**: Validation rules describing data structure (types, bounds)

### Can I use exported Great Expectations suites in production?
Yes! The generated JSON conforms to GX 1.x standards. Load it into your GX context:
```python
context.suites.add_or_update_suite("datacert_suite", suite_json)
```

### Why do Soda checks fail when I run `soda scan`?
The checks are **profile-based estimates**. Actual data may vary. Adjust tolerance or manually review failing checks.

---

## Validation

### How is validation different from profiling?
- **Profiling**: Analyzes your data to show actual characteristics
- **Validation**: Checks if data meets pre-defined rules (GX/Soda/JSON Schema)

### Why are some checks "skipped"?
DataCert validates **against profile statistics**, not raw data. Checks requiring regex patterns or custom SQL cannot be evaluated and are marked "Skipped."

### Can I validate without the actual validation tool?
Yes, for **quick feedback**. But for production, run full GX/Soda scans on databases for complete coverage.

---

## SQL Mode

### What SQL dialect does DataCert use?
**DuckDB SQL**—a PostgreSQL-compatible dialect with powerful analytics functions.

### Can I join multiple files?
Not yet (v1). Workaround: Use external tool to merge files first, then profile the result.

### Do queries persist?
No. Query history is ephemeral (resets on page reload). Copy queries manually or save them externally.

---

## Privacy & Security

### Does DataCert phone home?
No. The only network requests are for lazy-loading dependencies (DuckDB-Wasm from CDN). No data or telemetry is sent.

### Can I use it in an air-gapped environment?
Yes, after installation. The PWA caches all assets. DuckDB-Wasm loads from CDN on first SQL Mode use, but you can pre-cache it.

### Is it GDPR/HIPAA compliant?
DataCert itself doesn't process data—**your browser does**. Since no data leaves your device, there's no data transfer to regulate. However, consult your organization's policies.

---

## Installation & Deployment

### How do I install it offline?
1. Visit [https://datacert.app](https://datacert.app) *(example URL)*
2. Click "Install" in browser address bar
3. App is now cached and works offline

### Can I self-host DataCert?
Yes. It's a static site. Build and serve:
```bash
npm run build
npx serve dist
```

### Does it work on mobile?
Yes, but large files (>50MB) may struggle. Optimized for desktop/laptop.

---

## Troubleshooting

### "Worker failed to initialize"
**Cause:** Browser doesn't support Web Workers  
**Fix:** Update to modern browser (Chrome 90+, Firefox 88+, Safari 15+)

### "Out of memory" error
**Cause:** File too large for available RAM  
**Fix:** Close other tabs, use SQL Mode to filter, or upgrade device memory

### Histograms not showing
**Cause:** Column has no numeric data  
**Fix:** Histograms only appear for Integer/Numeric columns

### "Failed to parse CSV"
**Cause:** Malformed CSV (unescaped quotes, missing headers)  
**Fix:** Validate with `csvlint` or open in Excel to identify issues

---

## Feature Requests & Bugs

### How do I request a feature?
Open an issue on GitHub: [github.com/your-org/datacert/issues](https://github.com)

### I found a bug. What should I do?
1. Check browser console (F12) for errors
2. Open GitHub issue with:
   - Browser/OS version
   - File type and size
   - Console error screenshot

### Is there a roadmap?
Yes! See `docs/ROADMAP.md` or GitHub Projects.

---

## Advanced Usage

### Can I automate profiling?
Yes, using headless browsers:
```javascript
// Playwright example
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.setInputFiles('input#file-upload', './data.csv');
  await page.waitForSelector('.profile-results');
  const profile = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('lastProfile'));
  });
  console.log(profile);
  await browser.close();
})();
```

### Can I embed DataCert in my app?
Not directly (it's a standalone PWA). You could:
- Link to hosted instance
- Self-host and iframe (has limitations)
- Use the Rust WASM module directly in your app

---

## Comparison to Other Tools

### How does DataCert compare to Pandas Profiling?
| Feature | DataCert | Pandas Profiling |
|---------|----------|------------------|
| Installation | None (browser) | `pip install` |
| Performance | Streaming (1M rows/sec) | In-memory (slower on large files) |
| Platform | Any (browser) | Python required |
| Privacy | Local-only | Local-only |
| Exports | 7 formats | HTML, JSON |

### What about Great Expectations Cloud?
DataCert **generates** GX suites but doesn't replace GX. Use DataCert for quick profiling and GX for production validation pipelines.

---

## Miscellaneous

### Why is it called "DataCert"?
It's short for "data pocket"—a portable toolkit for data that fits right in your browser.

### Who built this?
DataCert is an open-source project. See `CONTRIBUTORS.md`.

### Can I contribute?
Yes! See `CONTRIBUTING.md` for guidelines.

---

**Still have questions?**  
Check the [GitHub Discussions](https://github.com/your-org/datacert/discussions) or open an issue.
