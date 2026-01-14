# FEAT-028: CLI / Headless Mode (Done)

**Status:** Done ✅
**Completion Date:** 2026-01-14

## 1. Intent (Required)

**User Story:**
As a data engineer
I want to run DataCert from the command line
So that I can integrate data profiling into CI/CD pipelines and automation scripts

**Success Looks Like:**
`npx datacert profile sales.csv --output profile.json` works and produces the same results as the web UI.

## 2. Context & Constraints (Required)

**Background:**
The #1 request from power users is automation. Currently, DataCert only works via browser UI. A CLI enables:
- CI/CD quality gates (fail build if >5% null)
- Scheduled profiling jobs (cron)
- Integration with dbt, Airflow, Dagster
- Batch processing of multiple files
- Scripted workflows

**Scope:**
- **In Scope:**
  - Node.js CLI tool using the same WASM core
  - Profile single file to JSON/HTML/Markdown output
  - Basic options: output format, tolerance, quiet mode
  - Exit codes for CI (0=pass, 1=quality issues, 2=error)
  - npx-compatible (zero install usage)

- **Out of Scope:**
  - Remote file support (S3/GCS) - separate ticket
  - Interactive mode / TUI
  - Watch mode for file changes
  - Comparison mode in CLI

**Constraints:**
- Must use existing WASM profiler (no duplication)
- Node.js 18+ required (WASM support)
- Output must be identical to web UI exports
- <5s startup time for small files

## 3. Acceptance Criteria (Required)

**Scenario: Profile CSV file**
Given a valid CSV file "sales.csv"
When I run `npx datacert profile sales.csv`
Then JSON profile output is written to stdout
And exit code is 0

**Scenario: Output to file**
Given a valid CSV file "sales.csv"
When I run `npx datacert profile sales.csv -o report.html --format html`
Then HTML report is written to "report.html"
And exit code is 0

**Scenario: Quality gate failure**
Given a CSV file with >10% missing values
When I run `npx datacert profile bad.csv --fail-on-missing 10`
Then exit code is 1
And stderr contains "Quality gate failed: missing > 10%"

**Scenario: Multiple files**
Given files "jan.csv" and "feb.csv"
When I run `npx datacert profile *.csv -o reports/`
Then "reports/jan_profile.json" and "reports/feb_profile.json" are created

**Scenario: Help command**
When I run `npx datacert --help`
Then usage information is displayed
And available commands and options are listed

## 4. AI Execution Instructions (Required)

**Allowed to Change:**
- Create `src/cli/` directory for CLI code
- Create `bin/datacert` entry point
- Modify `package.json` to add bin entry and CLI dependencies
- Create CLI-specific types in `src/cli/types.ts`

**Must NOT Change:**
- `src/wasm/` (use existing WASM)
- `src/app/` (web UI code)
- Existing profiling logic (reuse, don't duplicate)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- feat(cli): add headless profiling CLI tool
- feat(cli): add quality gate exit codes
- feat(cli): add batch file processing
- docs: add CLI usage documentation

## 6. Verification & Definition of Done (Required)

- [x] `npx datacert profile sample.csv` produces valid JSON
- [x] `--format html|json|markdown` flags work
- [x] `--output` flag writes to file
- [x] `--fail-on-missing` exit code works
- [x] Glob patterns process multiple files
- [x] `--help` displays usage
- [x] README updated with CLI section
- [x] No regressions in web UI

## 7. Technical Design

### CLI Structure

```
src/cli/
├── index.ts          # Entry point, argument parsing
├── commands/
│   ├── profile.ts    # Main profile command
│   └── version.ts    # Version command
├── utils/
│   ├── wasm-loader.ts  # Load WASM in Node environment
│   ├── output.ts       # Format and write outputs
│   └── quality-gates.ts # Exit code logic
└── types.ts          # CLI-specific types
```

### Package.json Changes

```json
{
  "bin": {
    "datacert": "./dist/cli/index.js"
  },
  "scripts": {
    "build:cli": "tsc -p tsconfig.cli.json"
  }
}
```

### CLI Options

```
datacert profile <file> [options]

Options:
  -o, --output <path>       Output file or directory
  -f, --format <type>       Output format: json|html|markdown|csv (default: json)
  -q, --quiet               Suppress progress output
  --fail-on-missing <pct>   Exit 1 if any column > pct% missing
  --fail-on-duplicates      Exit 1 if any column has duplicates
  --tolerance <pct>         Tolerance for GX/Soda exports (default: 10)
  -h, --help                Show help
  -v, --version             Show version
```

## 8. Resources

- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Node WASM Support](https://nodejs.org/api/wasm.html)
- [exit codes conventions](https://tldp.org/LDP/abs/html/exitcodes.html)
