# FEAT-026: Import Soda Checks for Validation

## 1. Intent (Required)

**User Story:**
As a data engineer
I want to import existing Soda Checks YAML and validate my profiled data against it
So that I can check if my data meets established Soda quality rules

**Success Looks Like:**
User can upload a checks.yml file, see which checks pass/fail against the current profile, with clear visual indicators.

## 2. Context & Constraints (Required)

**Background:**
Teams using Soda Core maintain checks.yml files that define their data quality standards. By importing these checks and validating against DataLens profiles, users can assess data quality without running `soda scan`.

**Scope:**
- **In Scope:** SodaCL YAML import, check evaluation against ProfileResult, pass/fail UI
- **Out of Scope:** Custom SQL checks, Soda Cloud integration, data source configuration

**Constraints:**
- Validation happens locally against ProfileResult statistics
- Some checks cannot be evaluated (e.g., custom SQL, freshness)
- Must parse SodaCL YAML syntax correctly

## 3. Acceptance Criteria (Required)

**Scenario: Import Soda Checks**
```gherkin
Given I have profiled a CSV file
When I click "Validate" and upload a checks.yml file
Then the file is parsed
And each check is evaluated against the profile
And I see pass/fail results
```

**Scenario: Passing check**
```gherkin
Given my profile shows column "amount" with min=50
And the imported checks has "min(amount) >= 0"
When validation runs
Then that check shows as "Pass"
```

**Scenario: Failing check**
```gherkin
Given my profile shows column "amount" with 10% missing
And the imported checks has "missing_percent(amount) < 5"
When validation runs
Then that check shows as "Fail"
And shows "Observed: 10%, Threshold: <5%"
```

**Scenario: Unsupported check handling**
```gherkin
Given the uploaded checks contains a custom SQL check
When validation runs
Then that check shows as "Skipped"
And shows "Cannot validate: requires database execution"
```

## 4. AI Execution Instructions (Required)

**Files to Create:**
- `src/app/utils/importSodaChecks.ts` - Parse SodaCL YAML

**Files to Modify:**
- `src/app/utils/validateExpectations.ts` - Add Soda check evaluation
- `src/app/components/ValidationRuleImporter.tsx` - Support YAML files
- `src/app/stores/validationStore.ts` - Handle Soda validation state

**Allowed to Change:**
- Validation utilities and components

**Must NOT Change:**
- ProfileResult data structure
- GX validation logic

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- `feat(validation): add Soda Checks import and validation`

## 6. Verification & Definition of Done (Required)

- [ ] Acceptance criteria pass
- [ ] SodaCL YAML parses correctly
- [ ] Supported checks evaluated accurately
- [ ] Unsupported checks clearly marked
- [ ] Reuses ValidationResultsView from FEAT-025
- [ ] Unit tests for import logic
- [ ] Code reviewed

## 7. Dependencies

- **SPIKE-007:** Research Soda Checks YAML Format
- **FEAT-025:** Import Great Expectations Suite (validation infrastructure)

## 8. Technical Notes

**Supported Checks:**

| Check Type | Can Evaluate | Required ProfileResult Fields |
|------------|--------------|-------------------------------|
| missing_count | Yes | nullCount |
| missing_percent | Yes | nullCount, totalRows |
| duplicate_count | Yes | distinctCount, totalRows |
| min | Yes | min |
| max | Yes | max |
| avg | Yes | mean |
| row_count | Yes | totalRows |
| freshness | No | requires timestamp comparison |
| custom SQL | No | requires database |

**Check Parsing:**

```typescript
interface SodaCheck {
  type: 'metric' | 'custom_sql' | 'schema';
  column?: string;
  metric?: string;
  operator?: '=' | '<' | '>' | '<=' | '>=' | 'between';
  threshold?: number | [number, number];
  raw: string;
}
```

## 9. Resources

- [Soda SodaCL Documentation](https://docs.soda.io/soda-cl/soda-cl-overview.html)
