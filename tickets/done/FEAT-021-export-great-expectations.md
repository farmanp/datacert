# FEAT-021: Export to Great Expectations Suite

## 1. Intent (Required)

**User Story:**
As a data engineer
I want to export my DataCert profile as a Great Expectations Suite JSON
So that I can use it in my existing GX validation pipelines

**Success Looks Like:**
User can download a valid GX Suite JSON file that loads successfully in Great Expectations Python and validates data against profiled expectations.

## 2. Context & Constraints (Required)

**Background:**
Great Expectations is a widely-used data quality framework. Data engineers maintain expectation suites that define data quality rules. By exporting DataCert profiles as GX suites, users can bootstrap their validation rules from actual data characteristics rather than manually defining each expectation.

**Scope:**
- **In Scope:** GX Suite JSON export, tolerance configuration, column-level expectations
- **Out of Scope:** Custom expectations, GX Cloud upload, batch-level expectations, Data Docs generation

**Constraints:**
- Must produce valid GX 1.x JSON format
- Must allow user-configurable tolerance for numeric thresholds
- Must handle all DataCert column types (String, Integer, Numeric, Boolean, Date, DateTime, Mixed, Empty)

## 3. Acceptance Criteria (Required)

**Scenario: Export profile to GX Suite**
```gherkin
Given I have profiled a CSV file
And the profile contains numeric and string columns
When I click "Export" and select "Great Expectations Suite"
And I configure a tolerance of 10%
Then a JSON file downloads
And the JSON is valid GX Suite format (meta, expectations array, expectation_suite_name)
And it contains expectations for each column based on profile statistics
```

**Scenario: Tolerance affects numeric bounds**
```gherkin
Given I have a numeric column with min=100 and max=1000
When I export with 10% tolerance
Then expect_column_values_to_be_between uses min_value=90 and max_value=1100
```

**Scenario: Null tolerance configuration**
```gherkin
Given I have a column with 5% null values
When I export with tolerance
Then expect_column_values_to_not_be_null uses mostly=0.95
```

**Scenario: Type mapping**
```gherkin
Given I have columns with various inferred types
When I export to GX Suite
Then Integer columns map to INTEGER type expectations
And Numeric columns map to FLOAT type expectations
And String columns get string-based expectations
And Date/DateTime columns get datetime expectations
```

## 4. AI Execution Instructions (Required)

**Files to Create:**
- `src/app/utils/exportGreatExpectations.ts`

**Files to Modify:**
- `src/app/utils/exportReport.ts` (integrate new format)
- `src/app/components/ProfileReport.tsx` (add export option - depends on FEAT-024)

**Allowed to Change:**
- Export utilities
- UI components for export

**Must NOT Change:**
- ProfileResult data structure
- Existing export formats (HTML, JSON)
- Worker protocol

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- `feat(export): add Great Expectations Suite JSON export`

## 6. Verification & Definition of Done (Required)

- [ ] Acceptance criteria pass
- [ ] Exported JSON loads in GX Python without errors
- [ ] All ProfileResult column types handled
- [ ] Tolerance configuration works correctly
- [ ] Unit tests for export function
- [ ] Code reviewed
- [ ] No breaking changes to existing exports

## 7. Dependencies

- **SPIKE-006:** Research Great Expectations Suite Format (must complete first)
- **FEAT-024:** Export Format Selector UI (UI integration)

## 8. Technical Notes

**Expected Expectations per Column Type:**

| DataCert Type | GX Expectations |
|---------------|-----------------|
| Integer | `to_be_of_type(INTEGER)`, `to_be_between` |
| Numeric | `to_be_of_type(FLOAT)`, `to_be_between` |
| String | `to_be_of_type(STRING)`, `to_be_in_set` (top values) |
| Boolean | `to_be_of_type(BOOLEAN)`, `to_be_in_set([true, false])` |
| Date | `to_be_of_type(DATE)` |
| DateTime | `to_be_of_type(DATETIME)` |
| Mixed | Skip type expectation, include null check only |
| Empty | Skip entirely |

**GX Suite JSON Structure:**

```json
{
  "expectation_suite_name": "datacert_generated_suite",
  "meta": {
    "generated_by": "DataCert",
    "generated_at": "2024-01-15T10:30:00Z",
    "source_file": "data.csv",
    "tolerance": 0.1
  },
  "expectations": [
    {
      "expectation_type": "expect_column_values_to_not_be_null",
      "kwargs": {
        "column": "column_name",
        "mostly": 0.95
      }
    }
  ]
}
```

## 9. Resources

- [Great Expectations Docs](https://docs.greatexpectations.io/docs/0.18/reference/learn/terms/expectation_suite/)
- [GX Core Expectations](https://greatexpectations.io/expectations/)
