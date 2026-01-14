# Supported File Formats

## Overview

DataCert supports **5 major data formats** with specific parsing optimizations for each.

---

## CSV (Comma-Separated Values)

### Specifications
- **Extensions:** `.csv`, `.tsv`, `.txt`
- **Encoding:** UTF-8, ISO-8859-1 (auto-detected)
- **Delimiters:** Auto-detected (`,`, `\t`, `;`, `|`)
- **Max file size:** 500MB recommended, 2GB theoretical limit
- **Row limit:** Unlimited (streaming parser)

### Features
- ✅ Header row detection
- ✅ Quote escaping (`"value, with comma"`)
- ✅ Multi-line values
- ✅ Comments (`#` prefix, optional)

### Known Limitations
- ❌ Non-standard line endings (`\r` only) not fully supported
- ❌ Fixed-width files require pre-conversion

### Example Files
```csv
id,name,email,created_at
1,"Alice Smith","alice@example.com","2024-01-15"
2,"Bob, Jr.","bob@example.com","2024-01-16"
```

---

## JSON / JSONL

### Specifications
- **Extensions:** `.json`, `.jsonl`, `.ndjson`
- **Formats:**
  - **JSON Array**: `[{...}, {...}]`
  - **JSONL** (Newline-Delimited): One object per line
- **Max file size:** 200MB recommended
- **Nesting:** Auto-flattened to dot notation

### Features
- ✅ Nested object flattening (`user.address.city`)
- ✅ Array expansion (first element sampled)
- ✅ Mixed-type arrays

### Nested Object Handling

**Input:**
```json
[
  {
    "id": 1,
    "user": {
      "name": "Alice",
      "address": {
        "city": "NYC"
      }
    }
  }
]
```

**Profiled Columns:**
- `id`
- `user.name`
- `user.address.city`

### Known Limitations
- ❌ Deep nesting (>5 levels) may cause performance issues
- ❌ Arrays of primitives shown as `[Mixed]`
- ❌ Heterogeneous schemas slow down profiling

---

## Parquet

### Specifications
- **Extension:** `.parquet`
- **Compression:** Auto-detected (Snappy, GZIP, LZO, Zstd)
- **Max file size:** 1GB recommended
- **Row groups:** Processed incrementally

### Features
- ✅ Native schema preservation
- ✅ Type information (INT32, FLOAT, TIMESTAMP, etc.)
- ✅ Dictionary encoding support
- ✅ Partitioned file reading *(experimental)*

### Known Limitations
- ❌ Encrypted Parquet not supported
- ❌ Complex types (MAP, LIST) partially supported

---

## Excel (XLSX/XLS)

### Specifications
- **Extensions:** `.xlsx` (Office Open XML), `.xls` (legacy)
- **Max file size:** 50MB recommended
- **Max rows:** ~100,000 rows for smooth performance
- **Sheets:** First sheet only

### Features
- ✅ Formula evaluation (converted to values)
- ✅ Date/time recognition
- ✅ Styled cells (styling ignored, values extracted)

### Known Limitations
- ❌ Multi-sheet files: Only first sheet profiled
- ❌ Macros ignored
- ❌ Charts/images skipped
- ❌ Merged cells treated as separate cells
- ❌ Binary `.xlsb` not supported

### Workaround for Multi-Sheet Files
Export each sheet as CSV from Excel, then profile individually.

---

## Apache Avro

### Specifications
- **Extension:** `.avro`
- **Schema:** Embedded (auto-read)
- **Compression:** Auto-detected (Deflate, Snappy)
- **Max file size:** 500MB recommended

### Features
- ✅ Schema evolution support
- ✅ Union types
- ✅ Binary/fixed types
- ✅ Logical types (date, timestamp)

### Known Limitations
- ❌ Complex nested schemas may flatten unpredictably
- ❌ Custom codecs not supported

---

## Performance Characteristics

| Format | Parse Speed | Memory Usage | Best For |
|--------|-------------|--------------|----------|
| CSV | ⚡ Very Fast | Low | Large datasets, simple structure |
| JSONL | ⚡ Fast | Low | Streaming logs, APIs |
| JSON | 🐢 Moderate | High | Nested data, small files |
| Parquet | ⚡⚡ Fastest | Very Low | Big data, analytics |
| Excel | 🐢 Slow | High | Business reports, small datasets |
| Avro | ⚡ Fast | Low | Schema-strict data pipelines |

---

## File Size Recommendations

| Size Range | Experience | Recommendation |
|------------|------------|----------------|
| < 10MB | ⚡ Instant | All formats work great |
| 10-100MB | ✅ Smooth | Use CSV, Parquet, or JSONL |
| 100-500MB | ⚠️ Manageable | Prefer Parquet, avoid JSON |
| 500MB-1GB | 🐢 Slow| Use SQL Mode to filter first |
| 1GB+ | ❌ Not ideal | Pre-sample or use external profiler |

---

## Encoding Support

**Auto-detected encodings:**
- UTF-8 (default)
- ISO-8859-1 (Latin-1)
- Windows-1252

**Not supported:**
- UTF-16, UTF-32
- EBCDIC
- Custom encodings

**Workaround:** Convert to UTF-8 using `iconv`:
```bash
iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
```

---

## Compression Support

| Format | Compression Type | Auto-Detected |
|--------|------------------|---------------|
| CSV | GZIP (`.csv.gz`) | ✅ Yes |
| Parquet | Snappy, GZIP, Zstd | ✅ Yes |
| Avro | Deflate, Snappy | ✅ Yes |
| JSON | GZIP (`.json.gz`) | ✅ Yes |
| Excel | Built-in (XLSX) | ✅ Yes |

**Note:** Decompression happens in-browser. GZIP files >200MB may be slow.

---

## Format-Specific Tips

### CSV
- **Escaped quotes:** Use `"` inside quoted strings: `"He said ""Hello"""`
- **NULL values:** Represent as empty field or literal `NULL`
- **Thousands separator:** Avoid (e.g., `1,234` → `1234`)

### JSON
- **Flatten first:** For very nested data, pre-flatten using `jq`:
  ```bash
  jq -c '.[] | {id, name: .user.name, city: .user.address.city}' input.json
  ```

### Parquet
- **Check schema:** Use `parquet-tools` to inspect before profiling:
  ```bash
  parquet-tools schema file.parquet
  ```

### Excel
- **Clean data:** Remove formulas, formatting, merged cells
- **First row as header:** Ensure row 1 contains column names

---

## Unsupported Formats

**Workarounds available:**
- **XML:** Convert to CSV using `xml2csv` or `xmltodict`
- **HDF5:** Export to Parquet using Python/R
- **Feather:** Use Parquet instead (similar performance)
- **ORC:** Convert to Parquet using Spark/Pandas
- **SAS/SPSS/Stata:** Export to CSV from native tools

---

## Future Format Support *(Roadmap)*

- ✅ SQLite (`.db`, `.sqlite`)
- ✅ Apache Arrow (`.arrow`)
- ✅ Feather v2
- ✅ DuckDB (`.duckdb`)
- ✅ Remote files via URL (S3, HTTP)

---

## Troubleshooting

### "Failed to parse CSV"
- **Cause:** Malformed quotes, inconsistent delimiters
- **Fix:** Validate CSV with `csvlint` or open in Excel

### "File too large"
- **Cause:** File exceeds browser memory
- **Fix:** Use SQL Mode to sample, or pre-filter data

### "Encoding error"
- **Cause:** Non-UTF-8 encoding
- **Fix:** Convert to UTF-8 before upload

### "Nested JSON too complex"
- **Cause:** >5 levels of nesting
- **Fix:** Flatten using `jq` or limit depth in export

---

## Related Guides

- **[SQL Mode](../guides/sql-mode.md)** – Filter large files before profiling
- **[Getting Started](../getting-started.md)** – File upload basics
