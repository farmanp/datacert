# FEAT-025: Import Great Expectations Suite for Validation

## 1. Intent (Required)

**User Story:**
As a data engineer
I want to import an existing Great Expectations Suite and validate my profiled data against it
So that I can check if my data meets established quality rules

**Success Looks Like:**
User can upload a GX Suite JSON, see which expectations pass/fail against the current profile, with clear visual indicators and explanations for each result.

## 2. Context & Constraints (Required)

**Background:**
Data teams often have existing Great Expectations suites that define their data quality standards. By importing these suites and validating against DataLens profiles, users can quickly assess whether new data meets established quality requirements without running the full GX pipeline.

**Scope:**
- **In Scope:** GX Suite JSON import, expectation evaluation against ProfileResult, pass/fail UI
- **Out of Scope:** Full GX runtime, custom expectation evaluation, GX Cloud integration

**Constraints:**
- Validation happens locally against ProfileResult statistics (not raw data)
- Some expectations cannot be evaluated (e.g., regex patterns, custom SQL)
- Must clearly indicate unsupported expectations

## 3. Acceptance Criteria (Required)

**Scenario: Import GX Suite**
```gherkin
Given I have profiled a CSV file
When I click "Validate" and upload an expectations.json file
Then the file is parsed
And each expectation is evaluated against the profile
And I see a pass/fail result for each expectation
```

**Scenario: Passing expectation**
```gherkin
Given my profile shows column "amount" with min=50, max=500
And the imported suite has expect_column_values_to_be_between(min=0, max=1000)
When validation runs
Then that expectation shows as "Pass" with green indicator
```

**Scenario: Failing expectation**
```gherkin
Given my profile shows column "id" with 5% null values
And the imported suite has expect_column_values_to_not_be_null(mostly=1.0)
When validation runs
Then that expectation shows as "Fail" with red indicator
And shows "Observed: 95% non-null, Expected: 100%"
```

**Scenario: Unsupported expectation handling**
```gherkin
Given the uploaded suite contains expect_column_values_to_match_regex
When validation runs
Then that expectation shows as "Skipped" with gray indicator
And shows "Cannot validate: requires raw data evaluation"
```

**Scenario: Missing column handling**
```gherkin
Given the suite expects column "legacy_field"
And that column does not exist in my profile
When validation runs
Then that expectation shows as "Fail"
And shows "Column not found in profile"
```

## 4. AI Execution Instructions (Required)

**Files to Create:**
- `src/app/utils/importGreatExpectations.ts` - Parse GX Suite JSON
- `src/app/utils/validateExpectations.ts` - Evaluate expectations against ProfileResult
- `src/app/components/ValidationRuleImporter.tsx` - File upload UI
- `src/app/components/ValidationResultsView.tsx` - Results display
- `src/app/stores/validationStore.ts` - Validation state management

**Files to Modify:**
- `src/app/pages/Home.tsx` or `src/app/components/ProfileReport.tsx` - Add validation UI entry point

**Allowed to Change:**
- Validation-related components and utilities
- State management for validation

**Must NOT Change:**
- ProfileResult data structure
- Existing profiling workflow
- Export functionality

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- `feat(validation): add GX Suite import and validation`

## 6. Verification & Definition of Done (Required)

- [ ] Acceptance criteria pass
- [ ] GX Suite JSON parses correctly
- [ ] Supported expectations evaluated accurately
- [ ] Unsupported expectations clearly marked
- [ ] Pass/fail UI is clear and accessible
- [ ] Unit tests for import and validation logic
- [ ] Code reviewed

## 7. Dependencies

- **SPIKE-006:** Research Great Expectations Suite Format

## 8. Technical Notes

**Supported Expectations:**

| Expectation Type | Can Evaluate | Required ProfileResult Fields |
|------------------|--------------|-------------------------------|
| expect_column_to_exist | Yes | column names |
| expect_column_values_to_not_be_null | Yes | nullCount, totalRows |
| expect_column_values_to_be_of_type | Partial | inferredType |
| expect_column_values_to_be_between | Yes | min, max |
| expect_column_values_to_be_unique | Yes | distinctCount, totalRows |
| expect_column_distinct_values_to_be_in_set | Partial | topValues |
| expect_column_mean_to_be_between | Yes | mean |
| expect_column_values_to_match_regex | No | requires raw data |
| expect_column_values_to_be_in_set | Partial | topValues |

**Validation Result Structure:**

```typescript
interface ValidationResult {
  expectationType: string;
  column: string;
  status: 'pass' | 'fail' | 'skipped';
  observed?: string;
  expected?: string;
  reason?: string;
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: ValidationResult[];
}
```

**UI Layout:**

```
┌─────────────────────────────────────────────┐
│ Validation Results                          │
│ Suite: production_expectations.json         │
├─────────────────────────────────────────────┤
│ Summary: 8 Pass | 2 Fail | 1 Skipped        │
├─────────────────────────────────────────────┤
│ ✓ expect_column_to_exist(id)                │
│ ✓ expect_column_values_to_not_be_null(id)   │
│ ✗ expect_column_values_to_be_between(amount)│
│   Observed: max=1500, Expected: max≤1000    │
│ ○ expect_column_values_to_match_regex(email)│
│   Skipped: requires raw data evaluation     │
└─────────────────────────────────────────────┘
```

## 9. Resources

- [Great Expectations Docs](https://docs.greatexpectations.io/docs/)
