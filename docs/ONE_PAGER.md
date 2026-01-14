# DataCert: Instant Data Profiling for Enterprise Teams

**Know what's in your data before it hits the warehouse.**

---

## The Problem

Data teams waste hours answering basic questions about incoming data:

- "What columns are in this file?"
- "Are there any null values?"
- "Does this contain PII?"
- "What's the data distribution?"

Current solutions require:
- Spinning up notebooks or Spark clusters
- Waiting for batch jobs to complete
- Navigating security reviews for SaaS tools
- Manual inspection for sensitive data

**Result:** 2-5 days to profile a single dataset.

---

## The Solution

DataCert profiles data files **instantly in your browser**:

| Capability | How It Works |
|------------|--------------|
| **Instant Profiling** | Upload a file, get statistics in seconds |
| **Local-First** | All processing happens in your browser - no data leaves your machine |
| **PII Detection** | Automatic flagging of emails, SSNs, phone numbers, and more |
| **SQL Filtering** | Query and profile subsets with standard SQL |
| **Cloud Integration** | Stream files directly from GCS without downloading |
| **Export Anywhere** | JSON, Great Expectations, Markdown formats |

---

## Key Features

### 1. Zero Infrastructure

No servers, no Spark, no notebooks. Open the browser, drop a file, get answers.

- Works offline (PWA)
- No installation required
- No data egress concerns

### 2. Enterprise-Scale Files

Handles files up to 1GB through streaming architecture:

| Format | Approach |
|--------|----------|
| CSV/TSV | 64KB streaming chunks |
| Parquet | DuckDB-WASM for large files |
| JSON/JSONL | Incremental parsing |
| Excel | Sheet-by-sheet processing |
| Avro | Schema extraction + profiling |

### 3. Automatic PII Detection

Catches sensitive data before warehouse upload:

- Email addresses
- Phone numbers (multiple formats)
- Social Security Numbers
- Credit card numbers
- IP addresses
- Dates of birth
- Postal codes (US/Canada)
- Column name heuristics (e.g., "customer_email")

### 4. Quality Metrics

Every column analyzed for:

- **Completeness** - Percentage of non-null values
- **Uniqueness** - Distinct value ratio
- **Distribution** - Histograms and percentiles
- **Anomalies** - Outliers and patterns

### 5. Integration Ready

Export profiles for automation:

```json
{
  "expectation_type": "expect_column_values_to_not_be_null",
  "kwargs": { "column": "customer_id" }
}
```

Compatible with:
- Great Expectations
- dbt tests
- Custom validation pipelines

---

## How It Compares

| Feature | DataCert | Pandas Profiling | Spark/Deequ | SaaS Tools |
|---------|----------|------------------|-------------|------------|
| Setup time | 0 min | 10+ min | 30+ min | Days |
| File size limit | 1GB | ~100MB | Unlimited | Varies |
| Data leaves machine | No | No | Maybe | Yes |
| PII detection | Built-in | Limited | Plugin | Varies |
| Security review | None | None | IT approval | Procurement |
| Cost | Free | Free | Compute | $$$ |

---

## Use Cases

### Pre-Upload Inspection
Profile vendor files before loading to warehouse. Catch schema changes, PII, and quality issues before they propagate.

### Ad-Hoc Analysis
Answer "what's in this file?" questions in seconds instead of hours. No ticket, no waiting.

### Compliance Checks
Detect PII before data moves between systems. Document what's in each dataset for audit trails.

### Data Discovery
Explore unfamiliar datasets quickly. Understand distributions, identify anomalies, find patterns.

---

## Technical Details

**Architecture:**
- Frontend: SolidJS (reactive UI)
- Compute: Rust/WebAssembly (performance)
- SQL Engine: DuckDB-WASM (large file handling)
- Storage: Browser-only (no backend)

**Statistics Algorithms:**
- Mean/Variance: Welford's online algorithm
- Percentiles: t-digest approximation
- Distinct counts: HyperLogLog++
- Histograms: Dynamic binning

**Supported Formats:**
- CSV, TSV (any delimiter)
- JSON, JSONL
- Apache Parquet
- Apache Avro
- Excel (.xlsx, .xls)

---

## Getting Started

1. **Open** https://datacert.app
2. **Drop** a data file
3. **Review** instant profile
4. **Export** to your pipeline

No account required. No data uploaded. No strings attached.

---

## For Enterprise Deployment

### Self-Hosting
Deploy behind your firewall:
```bash
docker pull datacert/datacert:latest
docker run -p 3000:3000 datacert/datacert
```

### GCS Integration
Profile cloud files directly:
1. Configure CORS on your buckets
2. Sign in with Google
3. Enter gs:// URLs

### CLI for CI/CD
Headless profiling for automation:
```bash
npx datacert profile data.csv --output profile.json
```

---

## Security & Compliance

- **SOC2 Friendly:** No data leaves your machine
- **HIPAA Compatible:** PHI never transmitted
- **GDPR Compliant:** No personal data processing on servers
- **Air-Gapped OK:** Works fully offline

---

## Contact

- **Demo:** https://datacert.app
- **Docs:** https://docs.datacert.app
- **GitHub:** https://github.com/anthropics/datacert
- **Support:** support@datacert.app

---

*DataCert: Because knowing your data shouldn't take days.*
