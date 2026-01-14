# DataCert Pilot Demo Script

This script guides you through demonstrating DataCert's key capabilities for enterprise data quality workflows.

## Prerequisites

- Modern browser (Chrome, Firefox, Safari, Edge)
- Sample data files (CSV, Parquet, JSON)
- For GCS demo: Google Cloud bucket with CORS configured

---

## Demo 1: "What's in this file?" (5 minutes)

**Scenario:** A data engineer receives a CSV file from an external vendor and needs to understand its structure before loading into the warehouse.

### Steps

1. **Open DataCert**
   - Navigate to https://datacert.app (or localhost:3000)
   - Note: All processing happens locally - no data leaves your machine

2. **Upload the file**
   - Drag and drop the CSV file onto the dropzone
   - Or click "Browse Files" to select

3. **Review instant profile**
   - **Summary cards**: Total rows, columns, data types, health score
   - **Column cards**: Each column shows type, completeness, distinct values
   - **Histograms**: Numeric columns display distribution charts

4. **Explore column details**
   - Click any column card to expand
   - View sample values, min/max, percentiles
   - Check quality metrics (completeness, uniqueness)

5. **Export profile**
   - Click "Export Profile"
   - Choose format: JSON, Great Expectations, or Markdown
   - Use for documentation or automated validation

**Key message:** "In 30 seconds, you know exactly what's in this file - no Spark jobs, no notebooks, no waiting."

---

## Demo 2: PII Detection Before Upload (5 minutes)

**Scenario:** Before uploading customer data to the warehouse, verify it doesn't contain unexpected PII.

### Steps

1. **Upload a file with PII**
   - Use a sample file containing email addresses or phone numbers

2. **Check the PII banner**
   - A prominent amber/rose banner appears at the top
   - Lists columns with detected PII types
   - Shows row counts for each detection

3. **Review detected PII types**
   - Email addresses
   - Phone numbers
   - SSN patterns
   - Credit card numbers
   - IP addresses
   - Date of birth patterns
   - Postal codes (US and Canadian)

4. **Column name detection**
   - Even without pattern matches, columns named "email", "phone", "ssn", etc. are flagged
   - Secondary signal for review

5. **Drill down to specific rows**
   - Click "View PII Rows" on any column card
   - Inspect the actual values flagged

**Key message:** "Catch PII before it hits your warehouse - no manual inspection, no compliance surprises."

---

## Demo 3: SQL Mode for Filtering (5 minutes)

**Scenario:** You need to profile only a subset of the data - specific date ranges or filtered segments.

### Steps

1. **Upload a larger dataset**
   - Works with CSV, JSON, Parquet

2. **Enter SQL Mode**
   - Click "SQL Mode" button in the profile report

3. **Write a filter query**
   ```sql
   SELECT * FROM data
   WHERE created_date > '2024-01-01'
   AND status = 'active'
   LIMIT 100000
   ```

4. **Execute and profile results**
   - Click "Run Query"
   - Preview first 1,000 rows
   - Click "Profile Results" to generate profile of filtered data

5. **Compare filtered vs. full profile**
   - Navigate back and forth between profiles
   - Identify segment-specific data quality issues

**Key message:** "Profile any slice of your data with standard SQL - no ETL pipelines, instant results."

---

## Demo 4: GCS Integration for Cloud Files (5 minutes)

**Scenario:** Profile files directly from Google Cloud Storage without downloading them first.

### Prerequisites
- GCS bucket with CORS configured (see `docs/deployment/GCS_CORS_SETUP.md`)
- Google account with bucket access

### Steps

1. **Open Remote Sources**
   - Click "Remote Sources" card on the home page
   - Select "Google Cloud"

2. **Authenticate**
   - Click "Sign in with Google"
   - Authorize DataCert to access your GCS buckets (read-only)

3. **Enter bucket and file**
   - Type bucket name in the "Bucket Name" field
   - Click "Browse" to list files, or
   - Enter full gs:// URL: `gs://your-bucket/path/to/file.csv`

4. **Profile the remote file**
   - Click "Profile File"
   - File streams directly from GCS to your browser
   - No download to disk required

5. **Handle CORS issues**
   - If CORS blocks the request, expand "CORS Setup Required"
   - Copy the provided commands
   - Run in terminal to configure bucket

**Key message:** "Profile cloud files without downloading - instant access to data quality metrics."

---

## Demo 5: Export to Great Expectations (3 minutes)

**Scenario:** Generate validation rules from the profile to use in your data pipeline.

### Steps

1. **Profile any file**
   - Complete steps from Demo 1

2. **Export as Great Expectations**
   - Click "Export Profile"
   - Select "Great Expectations Suite"

3. **Review generated expectations**
   ```json
   {
     "expectation_suite_name": "data_profile_suite",
     "expectations": [
       {
         "expectation_type": "expect_column_values_to_not_be_null",
         "kwargs": { "column": "id" }
       },
       {
         "expectation_type": "expect_column_values_to_be_between",
         "kwargs": { "column": "amount", "min_value": 0, "max_value": 10000 }
       }
     ]
   }
   ```

4. **Import into your pipeline**
   - Save the JSON file
   - Load into Great Expectations context
   - Run validations in CI/CD

**Key message:** "Turn profile insights into automated validation rules - bridge the gap between inspection and enforcement."

---

## Q&A Talking Points

### "How is this different from pandas profiling?"
- Runs entirely in-browser (no Python environment)
- Handles large files via streaming (500MB-1GB)
- No data leaves your machine (security/compliance)

### "What about Parquet files?"
- Full Parquet support with DuckDB-WASM
- Large Parquet files (>100MB) automatically use optimized path
- Memory-efficient columnar reads

### "Can we integrate this with our CI/CD?"
- Export profiles as JSON for automated checks
- Great Expectations export for pipeline validation
- CLI tool available for headless profiling

### "What about data that's already in our warehouse?"
- SQL Mode supports querying and profiling results
- Export filtered results back to CSV
- Great Expectations integration for warehouse validation

---

## Demo Data Suggestions

| File | Purpose | Notes |
|------|---------|-------|
| `sample_customers.csv` | PII detection | Include email, phone columns |
| `transactions.parquet` | Large file handling | 100MB+ for DuckDB demo |
| `events.json` | JSON profiling | Nested structures |
| `gs://public-bucket/sample.csv` | GCS integration | Pre-configured CORS |

---

## Timing Guide

| Demo | Duration | Complexity |
|------|----------|------------|
| What's in this file? | 5 min | Low |
| PII Detection | 5 min | Low |
| SQL Mode | 5 min | Medium |
| GCS Integration | 5 min | Medium |
| Great Expectations | 3 min | Low |
| **Total** | **~25 min** | |

Leave 5-10 minutes for Q&A.
