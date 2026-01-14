# FEAT-027: Import JSON Schema for Validation

## 1. Intent (Required)

**User Story:**
As a developer
I want to import a JSON Schema and validate my profiled data structure against it
So that I can verify my data conforms to an expected schema

**Success Looks Like:**
User can upload a JSON Schema file, see which schema constraints pass/fail against the current profile's structure and types.

## 2. Context & Constraints (Required)

**Background:**
JSON Schema is a universal standard for describing data structures. Many teams maintain schemas as contracts for their data. By validating profiles against schemas, users can quickly check structural conformance without processing raw data through a validator.

**Scope:**
- **In Scope:** JSON Schema import, type validation, required field validation
- **Out of Scope:** Full JSON Schema validation (patterns, formats, conditionals), nested schemas

**Constraints:**
- Validation is structural (types, required fields, bounds)
- Cannot validate regex patterns, formats, or conditional schemas
- Limited to flat/tabular data structures

## 3. Acceptance Criteria (Required)

**Scenario: Import JSON Schema**
```gherkin
Given I have profiled a CSV file
When I click "Validate" and upload a schema.json file
Then the file is parsed
And column types are validated against schema properties
And required columns are checked for presence
And I see pass/fail results
```

**Scenario: Type match**
```gherkin
Given my profile shows column "amount" as Numeric type
And the schema defines properties.amount.type as "number"
When validation runs
Then that property shows as "Pass"
```

**Scenario: Type mismatch**
```gherkin
Given my profile shows column "id" as String type
And the schema defines properties.id.type as "integer"
When validation runs
Then that property shows as "Fail"
And shows "Observed: String, Expected: integer"
```

**Scenario: Missing required field**
```gherkin
Given my profile does not contain column "required_field"
And the schema has "required_field" in the required array
When validation runs
Then that requirement shows as "Fail"
And shows "Required column not found"
```

**Scenario: Bounds validation**
```gherkin
Given my profile shows column "score" with max=150
And the schema defines properties.score.maximum as 100
When validation runs
Then that constraint shows as "Fail"
And shows "Observed max: 150, Schema max: 100"
```

## 4. AI Execution Instructions (Required)

**Files to Create:**
- `src/app/utils/importJsonSchema.ts` - Parse JSON Schema

**Files to Modify:**
- `src/app/utils/validateExpectations.ts` - Add JSON Schema evaluation
- `src/app/components/ValidationRuleImporter.tsx` - Support schema files
- `src/app/stores/validationStore.ts` - Handle schema validation state

**Allowed to Change:**
- Validation utilities and components

**Must NOT Change:**
- ProfileResult data structure
- Other validation logic

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- `feat(validation): add JSON Schema import and validation`

## 6. Verification & Definition of Done (Required)

- [ ] Acceptance criteria pass
- [ ] JSON Schema parses correctly
- [ ] Type mapping works (JSON Schema types ↔ DataLens types)
- [ ] Required fields validated
- [ ] Numeric bounds validated
- [ ] Reuses ValidationResultsView from FEAT-025
- [ ] Unit tests for import logic
- [ ] Code reviewed

## 7. Dependencies

- **FEAT-025:** Import Great Expectations Suite (validation infrastructure)

## 8. Technical Notes

**Type Mapping (JSON Schema → DataLens):**

| JSON Schema Type | DataLens Types (Pass) |
|------------------|----------------------|
| "integer" | Integer |
| "number" | Integer, Numeric |
| "string" | String, Date, DateTime |
| "boolean" | Boolean |
| "null" | Empty |
| array of types | Mixed |

**Supported Constraints:**

| JSON Schema Keyword | Can Validate |
|---------------------|--------------|
| type | Yes |
| required | Yes |
| minimum / maximum | Yes |
| minLength / maxLength | Partial (if captured) |
| enum | Partial (via topValues) |
| pattern | No |
| format | Partial |

**Validation Structure:**

```typescript
interface SchemaValidationResult {
  property: string;
  constraint: 'type' | 'required' | 'minimum' | 'maximum' | 'enum';
  status: 'pass' | 'fail' | 'skipped';
  observed?: string;
  expected?: string;
}
```

## 9. Resources

- [JSON Schema Specification](https://json-schema.org/draft/2020-12/schema)
- [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
