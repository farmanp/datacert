# Export Formats Guide

*Audience: Data engineers*

## Overview

DataCert supports **7 export formats**, each designed for different use cases. This guide helps you choose the right format and configure exports correctly.

---

## Format Comparison

| Format | Best For | File Type | Size | Human Readable |
|--------|----------|-----------|------|----------------|
| **HTML Report** | Stakeholder presentations | `.html` | Large | ✅ Yes |
| **JSON Profile** | Pipeline integration | `.json` | Medium | ⚠️ Technical |
| **Column Stats (CSV)** | Spreadsheet analysis | `.csv` | Small | ✅ Yes |
| **Markdown Summary** | Documentation | Clipboard | Tiny | ✅ Yes |
| **Great Expectations Suite** | Python validation | `.json` | Medium | ⚠️ Technical |
| **Soda Checks (YAML)** | SodaCL monitoring | `.yml` | Small | ✅ Yes |
| **JSON Schema** | Universal validation | `.json` | Small | ⚠️ Technical |

---

## Export Format Details

### 1. HTML Report

**Use when:** Sharing results with non-technical stakeholders

**Contains:**
- KPI summary cards
- Full column statistics table
- Embedded histograms (base64 data URLs)
- Responsive design (print-friendly)

**Example use case:**
```
Weekly data quality report sent to business users
```

**File size:** ~500KB for 50 columns with histograms

**Configuration:** None

---

### 2. JSON Profile

**Use when:** Integrating with data pipelines or custom tools

**Contains:**
```json
{
  "metadata": {
    "filename": "sales_data.csv",
    "timestamp": "2024-01-15T10:30:00Z",
    "totalRows": 100000
  },
  "columns": [
    {
      "name": "order_id",
      "type": "Integer",
      "count": 100000,
      "missing": 0,
      "distinctEstimate": 99876,
      "numericStats": { ... },
      "histogram": { ... }
    }
  ]
}
```

**Example use case:**
```python
import json

with open('profile.json') as f:
    profile = json.load(f)
    
for col in profile['columns']:
    if col['type'] == 'String' and 'email' in col['name'].lower():
        print(f"PII detected: {col['name']}")
```

**File size:** ~100KB for 50 columns

**Configuration:** None

---

### 3. Column Stats (CSV)

**Use when:** Analyzing profiles in Excel/Google Sheets

**Contains:**
| Column | Type | Count | Missing | Distinct | Mean | Median | Min | Max | StdDev |
|--------|------|-------|---------|----------|------|--------|-----|-----|--------|
| order_id | Integer | 10000 | 0 | 9987 | 5000.5 | 5000 | 1 | 10000 | 2886.8 |

**Example use case:**
```
Compare statistics across multiple profiling runs using pivot tables
```

**File size:** ~10KB for 50 columns

**Configuration:** None

---

### 4. Markdown Summary

**Use when:** Documenting datasets in README files or wikis

**Contains:**
- Dataset summary (rows, columns, health score)
- Column table with key metrics
- Timestamp and generator attribution

**Example output:**
```markdown
# Data Profile: sales_data.csv

**Generated:** 2024-01-15 10:30:00  
**Total Rows:** 100,000  
**Total Columns:** 25  
**Health Score:** 87%

## Column Statistics

| Column | Type | Missing % | Distinct |
|--------|------|-----------|----------|
| order_id | Integer | 0.0% | 99,876 |
| ...
```

**Example use case:**
```
Copy to GitHub README to document a public dataset
```

**File size:** ~5KB for 50 columns

**Configuration:** Auto-copies to clipboard

---

### 5. Great Expectations Suite

**Use when:** Creating Python validation rules for prod pipelines

**Format:** GX 1.x Suite JSON

**Contains expectation rules like:**
```json
{
  "expectation_type": "expect_column_values_to_be_between",
  "kwargs": {
    "column": "order_value",
    "min_value": 0.9,      // 10% tolerance applied
    "max_value": 11000,    // 10% tolerance applied
    "mostly": 1.0
  }
}
```

**Configuration:**
- **Tolerance (1-50%)**: Adds wiggle room to numeric bounds
  - `tolerance=10%` means `min` becomes `min * 0.9`, `max` becomes `max * 1.1`
- **Default:** 10%

**Supported expectations:**
- `expect_column_to_exist`
- `expect_column_values_to_not_be_null`
- `expect_column_values_to_be_of_type`
- `expect_column_values_to_be_between`
- `expect_column_values_to_be_unique`
- `expect_column_mean_to_be_between`

**Example use case:**
```python
import great_expectations as gx

context = gx.get_context()
suite = context.suites.get("datacert_generated_suite")
results = context.run_checkpoint("my_checkpoint")
```

**File size:** ~50KB for 50 columns

---

### 6. Soda Checks (YAML)

**Use when:** Using Soda Core for data quality monitoring

**Format:** SodaCL YAML

**Contains checks like:**
```yaml
checks for sales_data:
  # Column: order_id
  - missing_count(order_id) = 0
  - duplicate_count(order_id) = 0

  # Column: order_value
  - missing_percent(order_value) < 3
  - min(order_value) >= 0.9
  - max(order_value) <= 11000
  - avg(order_value) between 115 and 140
```

**Configuration:**
- **Table Name**: Required (e.g., `sales_data`, `users`)
- **Tolerance (1-50%)**: Same as GX, adds buffer to bounds
- **Default:** 10%

**Supported checks:**
- `missing_count(col)`
- `missing_percent(col)`
- `duplicate_count(col)`
- `min(col)`, `max(col)`, `avg(col)`
- `row_count`

**Example use case:**
```bash
soda scan -d my_datasource -c soda_checks_sales_data.yaml
```

**File size:** ~5KB for 50 columns

---

### 7. JSON Schema

**Use when:** Validating JSON data or generating API contracts

**Format:** JSON Schema Draft 2020-12

**Contains:**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "order_id": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10000
    },
    "email": {
      "type": "string",
      "format": "email",
      "minLength": 5,
      "maxLength": 255
    }
  },
  "required": ["order_id", "email"]
}
```

**Configuration:** None

**Example use case:**
```python
import jsonschema

schema = json.load(open('schema.json'))
data = json.load(open('new_data.json'))
jsonschema.validate(data, schema)  # Raises error if invalid
```

**File size:** ~20KB for 50 columns

---

## Choosing the Right Format

### Decision Tree

```
Need to share with non-technical users?
├─ Yes → HTML Report or Markdown Summary
└─ No → Continue...

Need validation rules for production?
├─ Yes
│   ├─ Using Python/GX? → Great Expectations Suite
│   ├─ Using Soda? → Soda Checks (YAML)
│   └─ Language-agnostic? → JSON Schema
└─ No → Continue...

Need programmatic access?
├─ Yes → JSON Profile
└─ No → Column Stats (CSV)
```

---

## Export Workflow

### From Profile View

1. Click **"Export Profile"** button (top right)
2. Modal opens with format options
3. Select format
4. Configure options (if applicable):
   - **GX/Soda**: Set tolerance slider
   - **Soda**: Enter table name
5. Click **"Download"**
6. File saves to browser's downloads folder

### From SQL Mode

Profile query results first, then export as usual.

---

## Tolerance Configuration (GX & Soda)

**What it does:** Adds percentage-based buffer to numeric constraints

**Why:** Production data often has slight variance from profiled samples

**Example:**
```
Profiled data: min=100, max=1000
Tolerance=10%

Generated rules:
  min >= 90   (100 * 0.9)
  max <= 1100 (1000 * 1.1)
```

**Recommended values:**
- **Strict (1-5%)**: Reference data, golden datasets
- **Moderate (10-15%)**: Production pipelines, daily batches
- **Loose (20-30%)**: Highly variable data, exploratory

---

## Next Steps

- **[Validation Guide](./validation.md)** – Import and validate against exported rules
- **[Batch Processing](./batch-compare.md)** – Export profiles for multiple files
