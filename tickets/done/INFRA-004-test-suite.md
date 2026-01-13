# AI-Ready Infra Template

## 1. Objective (Required)
**What:**
Establish a comprehensive testing infrastructure covering unit tests, integration tests, and end-to-end tests for both the Rust/WASM core and SolidJS frontend.

**Why:**
Reliable testing is essential for a data profiling tool where accuracy is critical. Users trust our statistics to make decisions. Comprehensive tests prevent regressions and enable confident refactoring.

## 2. Scope (Required)
**In Scope:**
- Unit test framework for Rust code (built-in `#[test]`)
- Unit test framework for TypeScript (vitest)
- Integration tests for WASM ↔ JS boundary
- Component tests for SolidJS UI
- Test fixtures: sample CSV, JSON, Parquet files
- Accuracy tests: compare stats against pandas/numpy baseline
- Performance benchmarks with regression detection
- CI-ready test scripts

**Out of Scope:**
- Visual regression testing
- Load/stress testing
- Browser automation (e2e with Playwright)
- Security testing

## 3. Technical Approach
**Strategy:**
1. Rust unit tests: test each statistics algorithm in isolation
2. TypeScript unit tests: test stores, utilities, formatters
3. WASM integration tests: parse real files, verify output
4. Component tests: render components, verify DOM output
5. Create golden files: expected output for known inputs

**Test Organization:**
```
tests/
├── unit/
│   ├── rust/           # cargo test
│   │   ├── stats/
│   │   ├── parser/
│   │   └── quality/
│   └── ts/             # vitest
│       ├── stores/
│       ├── utils/
│       └── components/
├── integration/
│   ├── csv_parsing.test.ts
│   ├── json_parsing.test.ts
│   └── full_profile.test.ts
├── accuracy/
│   ├── baseline/       # pandas-generated expected values
│   └── accuracy.test.ts
├── performance/
│   └── benchmarks.ts
└── fixtures/
    ├── small.csv       # 100 rows
    ├── medium.csv      # 10K rows
    ├── large.csv       # 100K rows
    ├── nested.json
    ├── sample.parquet
    └── malformed.csv
```

**Accuracy Testing Approach:**
1. Generate baseline statistics using pandas-profiling for fixture files
2. Save expected values as JSON golden files
3. Run DataLens on same fixtures
4. Compare values within tolerance (e.g., 0.01% for most stats)

**Files to Create:**
- `vitest.config.ts` - Test configuration
- `tests/setup.ts` - Test setup and utilities
- `scripts/generate-baseline.py` - Generate pandas baseline
- `scripts/test.sh` - Run all test suites

**Dependencies:**
```json
{
  "vitest": "^1.x",
  "@solidjs/testing-library": "^0.8.x",
  "jsdom": "^24.x"
}
```

## 4. Acceptance Criteria (Required)
- [ ] `npm test` runs all tests (Rust + TypeScript)
- [ ] `npm run test:unit` runs only unit tests
- [ ] `npm run test:integration` runs integration tests
- [ ] Test coverage report generated (target: 80% for core modules)
- [ ] Accuracy tests pass within 0.1% tolerance for all statistics
- [ ] Performance benchmarks establish baseline times
- [ ] All tests pass in CI environment

## 5. Rollback Plan
Tests are additive; no rollback needed. If a test framework proves problematic, replace while maintaining test logic.

## 6. Planned Git Commit Message(s)
- chore(test): configure vitest for typescript tests
- test(rust): add unit tests for statistics algorithms
- test(integration): add csv parsing integration tests
- test(accuracy): add pandas baseline accuracy tests
- chore(ci): add test fixtures and baseline data

## 7. Verification
- [ ] All test commands work
- [ ] Tests fail when expected (intentionally break code)
- [ ] Coverage reports generate correctly
- [ ] Tests complete in reasonable time (< 2 minutes for full suite)
- [ ] CI can run tests successfully
