# CLI Guide

The DataCert Command Line Interface (CLI) allows you to run high-performance data profiling as part of your CI/CD pipelines, scheduled jobs, or local scripts.

## Installation

The CLI is included with the DataCert package. You can run it directly via `npx` if you have the package installed or are in the project root.

```bash
# In the project root after building
npm run build:cli
node ./dist/cli/cli/index.js profile <files>
```

*(Note: Once published to npm, it will be available via `npx datacert`)*

## Commands

### `profile`

The main command used to analyze datasets.

**Usage:**
```bash
datacert profile <files...> [options]
```

**Arguments:**
- `<files...>`: One or more paths to CSV files. Supports glob patterns (e.g., `"data/*.csv"`).

**Options:**
- `-o, --output <path>`: Specifies where to save the results.
  - If a directory is provided, files will be saved as `<filename>_profile.<format>`.
  - If a file path is provided, results will be written there (only recommended for single-file input).
- `-f, --format <type>`: Output format. Options: `json` (default), `html`, `markdown`.
- `-q, --quiet`: Suppresses non-essential output (progress logs).
- `--fail-on-missing <pct>`: Sets a quality gate. The CLI will exit with code `1` if any column has a missing value percentage greater than `<pct>`.
- `--fail-on-duplicates`: Sets a quality gate. The CLI will exit with code `1` if any column contains duplicate values (where uniqueness is expected).
- `--tolerance <pct>`: (Planned) Tolerance for statistical validation.

## Quality Gates & CI/CD

DataCert CLI is designed to be used in automated pipelines. Use the `--fail-on-*` flags to enforce data quality standards.

### Example: GitHub Actions

```yaml
jobs:
  data-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Profile Data
        run: |
          npx datacert profile data/latest_extract.csv \
            --fail-on-missing 5 \
            --fail-on-duplicates
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0`  | Success (Profiling complete, quality gates passed) |
| `1`  | Quality Gate Failure (Missing values or duplicates exceeded thresholds) |
| `2`  | Fatal Error (File not found, invalid WASM, or internal crash) |

## Output Formats

### JSON (Default)
A comprehensive machine-readable summary containing all statistical metrics, PII detection results, and column profiles.

### Markdown
A clean, table-based summary suitable for pasting into PR comments or documentation.

### HTML
A self-contained report with basic styling for quick visual inspection without the full DataCert UI.
