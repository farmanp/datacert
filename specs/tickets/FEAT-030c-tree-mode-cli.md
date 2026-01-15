# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer using the CLI
I want to select specific JSON paths to profile
So that I can efficiently profile deeply nested JSON without interactive UI or OOM errors

**Success Looks Like:**
Users can run `datacert profile data.json --select '$.user.id,$.user.name'` to profile only specific paths, or use `--structure-only` to see all available paths, enabling scriptable column selection for deeply nested JSON.

## 2. Context & Constraints (Required)
**Background:**
This is the CLI implementation for FEAT-030 Tree Mode. Provides command-line alternatives to the Web UI's interactive tree picker. Enables automation, scripting, and power-user workflows.

**Parent Ticket:** FEAT-030-tree-mode.md
**Dependency:** FEAT-030a-tree-mode-backend.md (must be completed first)

**Scope:**
- **In Scope:**
  - `--structure-only` flag: Output tree structure as JSON/text
  - `--select <paths>` flag: Profile only specified paths
  - `--exclude <patterns>` flag: Exclude paths from profiling
  - Glob pattern support: `--select '$.user.*'`
  - JSON output format for structure scan
  - Text tree output format (like `tree` command)
  - Error when selecting > 500 columns
  - Works with deeply nested JSON (no depth limit)

- **Out of Scope:**
  - Interactive TUI (terminal UI) - future enhancement
  - ncurses-based tree browser - future
  - Saved column selections - future
  - Remote file profiling (separate feature)

**Constraints:**
- Compatible with existing `datacert profile` command
- Max 500 paths selectable via `--select`
- Glob patterns must be safe (no arbitrary regex)
- JSON output must be valid and parseable
- Error messages must be actionable

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Show structure only**
Given a JSON file with 2,345 paths
When I run `datacert profile data.json --structure-only`
Then structure analysis runs (no profiling)
And outputs text tree showing all paths
And shows depth, type, population for each path
And exits successfully

**Scenario: JSON output format**
Given a JSON file with nested structure
When I run `datacert profile data.json --structure-only --format json`
Then outputs valid JSON with TreeNode hierarchy
And can be piped to jq or other tools
And includes all path metadata

**Scenario: Select specific paths**
Given a JSON file with 2,345 paths
When I run `datacert profile data.json --select '$.user.id,$.user.name'`
Then profiler runs ONLY on those 2 paths
And profile output shows 2 columns
And other 2,343 paths are ignored

**Scenario: Glob pattern selection**
Given a JSON file with paths: $.user.id, $.user.name, $.user.email, $.metadata.timestamp
When I run `datacert profile data.json --select '$.user.*'`
Then profiles: $.user.id, $.user.name, $.user.email
And excludes: $.metadata.timestamp

**Scenario: Exclude patterns**
Given a JSON file with many paths
When I run `datacert profile data.json --select '$.user.*' --exclude '$.user.preferences.*'`
Then profiles $.user.id, $.user.name
And excludes all $.user.preferences.* paths

**Scenario: Selection limit enforcement**
Given a JSON file with 10,000 paths
When I run `datacert profile data.json --select '$.level1.*'` matching 600 paths
Then error message: "Error: Selected 600 paths, max is 500. Use --exclude to reduce selection"
And exits with code 1

**Scenario: Invalid path**
Given a JSON file
When I run `datacert profile data.json --select '$.nonexistent.path'`
Then warning: "Warning: Path '$.nonexistent.path' not found in data"
And continues profiling (empty result)

**Scenario: Combined with existing flags**
Given a JSON file
When I run `datacert profile data.json --select '$.user.*' --format json --output report.json`
Then selects $.user.* paths only
And outputs to report.json in JSON format

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/cli/commands/profile.ts` - Add --select, --exclude, --structure-only flags
- `src/cli/utils/path-selector.ts` - NEW: Glob pattern matching logic
- `src/cli/utils/structure-formatter.ts` - NEW: Format tree as text/JSON
- `src/cli/cli/index.ts` - Update command parser

**Must NOT Change:**
- Backend structure scan (FEAT-030a)
- Web UI components (FEAT-030b)
- Core profiling logic

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(cli): add --structure-only flag for JSON structure analysis
- feat(cli): add --select flag for path-based profiling
- feat(cli): add --exclude flag for path filtering
- feat(cli): implement glob pattern matching for path selection
- feat(cli): add text tree output formatter
- feat(cli): enforce 500 path selection limit
- test(cli): add path selection tests
- docs(cli): update CLI help with tree mode examples

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] `--structure-only` works on deeply nested JSON
- [ ] `--select` with comma-separated paths works
- [ ] Glob patterns match correctly
- [ ] `--exclude` filters paths
- [ ] 500 path limit enforced
- [ ] Error messages are clear
- [ ] JSON output is valid
- [ ] Text tree output is readable
- [ ] CLI help updated
- [ ] Integration tests pass
- [ ] Code reviewed

## 7. Resources
- FEAT-030 parent spec: `specs/tickets/FEAT-030-tree-mode.md`
- FEAT-030a backend: `specs/tickets/FEAT-030a-tree-mode-backend.md`
- Existing CLI: `src/cli/commands/profile.ts`
- Glob pattern library: minimatch or picomatch
- JSONPath spec: https://goessner.net/articles/JsonPath/
- CLI examples:
  ```bash
  # Show structure
  datacert profile data.json --structure-only
  
  # Select specific paths
  datacert profile data.json --select '$.user.id,$.user.name'
  
  # Use glob
  datacert profile data.json --select '$.user.*' --exclude '$.user.preferences.*'
  
  # JSON output
  datacert profile data.json --structure-only --format json > structure.json
  ```
