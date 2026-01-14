# FEAT-034: Smart Data Quality Suggestions

## 1. Intent (Required)

**User Story:**
As a data analyst
I want automatic suggestions for data quality issues and fixes
So that I don't have to manually interpret statistics and figure out what's wrong

**Success Looks Like:**
After profiling, see actionable suggestions like "Column 'email' has 5% missing - consider adding a NOT NULL constraint" or "Column 'price' has outliers beyond 3σ - review rows 142, 890, 1203".

## 2. Context & Constraints (Required)

**Background:**
DataCert shows statistics, but users must interpret them. Smart suggestions bridge this gap by:
- Detecting common data quality patterns
- Providing actionable recommendations
- Prioritizing issues by severity
- Suggesting specific SQL/validation rules to add

This differentiates DataCert from basic profilers that just show numbers.

**Scope:**
- **In Scope:**
  - Completeness issues (missing data patterns)
  - Type inference problems (mixed types)
  - Cardinality anomalies (unexpected uniqueness)
  - Distribution issues (skew, outliers, bimodal)
  - PII detection with column-specific guidance
  - Format issues (inconsistent strings)
  - Suggested validation rules for each issue
  - Priority/severity ranking
  - Copy suggestion as validation rule

- **Out of Scope:**
  - Auto-fix data issues
  - ML-based anomaly detection
  - Cross-column relationship analysis
  - Natural language explanations (simple templates only)

**Constraints:**
- Suggestions must be deterministic (same input = same output)
- No external API calls (runs locally)
- Must be fast (<100ms for 100 columns)

## 3. Acceptance Criteria (Required)

**Scenario: Missing data suggestion**
Given a column "email" has 5% missing values
When I view suggestions
Then I see "email: 5% missing values. Consider: 1) Add NOT NULL constraint, 2) Investigate source of nulls"
And suggested validation rule is copyable

**Scenario: High cardinality suggestion**
Given a column "user_id" has 99.9% unique values
When I view suggestions
Then I see "user_id: Appears to be a unique identifier. Consider adding UNIQUE constraint."

**Scenario: Low cardinality warning**
Given a column "country" has only 3 unique values but 1M rows
When I view suggestions
Then I see "country: Low cardinality (3 values). Consider using ENUM type or accepted_values validation."

**Scenario: Outlier detection**
Given a column "price" has values with z-score > 3
When I view suggestions
Then I see "price: 12 potential outliers detected (>3σ). Review values: $99,999, $-500, ..."
And outlier row indices are provided

**Scenario: PII detection**
Given a column "ssn" matches SSN pattern
When I view suggestions
Then I see "ssn: Potential PII (SSN pattern detected). Consider: 1) Mask/hash this column, 2) Restrict access"
And severity is marked as HIGH

**Scenario: Type mismatch**
Given a column "age" is inferred as Mixed (some strings, some integers)
When I view suggestions
Then I see "age: Mixed types detected. 85% numeric, 15% string. Common non-numeric values: 'N/A', 'unknown'"

**Scenario: Priority ranking**
Given multiple issues detected across columns
When I view suggestions
Then issues are sorted by severity: HIGH (PII) → MEDIUM (missing) → LOW (formatting)

## 4. AI Execution Instructions (Required)

**Allowed to Change:**
- Create `src/app/utils/generateSuggestions.ts`
- Create `src/app/components/SuggestionsPanel.tsx`
- Create `src/app/types/suggestions.ts`
- Modify ProfileReport to show suggestions section

**Must NOT Change:**
- Profile computation logic
- Statistics algorithms
- Validation export formats

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- feat(suggestions): add suggestion generation engine
- feat(suggestions): add completeness suggestions
- feat(suggestions): add cardinality suggestions
- feat(suggestions): add outlier suggestions
- feat(suggestions): add PII suggestions
- feat(suggestions): add SuggestionsPanel UI component
- feat(suggestions): add copy-as-rule functionality

## 6. Verification & Definition of Done (Required)

- [ ] Missing data suggestions appear
- [ ] Cardinality suggestions (high/low) work
- [ ] Outlier detection suggestions with row indices
- [ ] PII detection with severity HIGH
- [ ] Type mismatch suggestions
- [ ] Suggestions sorted by priority
- [ ] Each suggestion has copyable validation rule
- [ ] Panel integrates into ProfileReport

## 7. Technical Design

### Suggestion Types

```typescript
interface Suggestion {
  id: string;
  column: string;
  type: 'completeness' | 'cardinality' | 'outlier' | 'pii' | 'type' | 'format' | 'distribution';
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendations: string[];
  validationRule?: {
    format: 'gx' | 'soda' | 'sql';
    rule: string;
  };
  affectedRows?: number[];
  stats?: Record<string, string | number>;
}
```

### Detection Rules

```typescript
const DETECTION_RULES: DetectionRule[] = [
  // Completeness
  {
    name: 'missing_critical',
    severity: 'high',
    detect: (col) => col.base_stats.missing / col.base_stats.count > 0.1,
    title: (col) => `${col.name}: ${pct(missing)}% missing values`,
    recommendations: [
      'Add NOT NULL constraint if missing not expected',
      'Investigate data source for null handling',
      'Consider default value or imputation'
    ],
    validationRule: (col) => ({
      format: 'soda',
      rule: `missing_percent(${col.name}) < 10`
    })
  },

  // PII Detection
  {
    name: 'pii_ssn',
    severity: 'high',
    detect: (col) => col.notes?.includes('PII') && /ssn|social/i.test(col.name),
    title: (col) => `${col.name}: Potential SSN data detected`,
    recommendations: [
      'Hash or mask this column before storage',
      'Restrict column access to authorized users',
      'Consider tokenization service'
    ]
  },

  // Outliers
  {
    name: 'numeric_outliers',
    severity: 'medium',
    detect: (col) => col.outlier_rows?.length > 0,
    title: (col) => `${col.name}: ${col.outlier_rows.length} potential outliers`,
    recommendations: [
      'Review extreme values for data entry errors',
      'Consider winsorization if outliers expected',
      'Add range validation'
    ],
    validationRule: (col) => ({
      format: 'soda',
      rule: `min(${col.name}) >= ${col.numeric_stats.p1}\nmax(${col.name}) <= ${col.numeric_stats.p99}`
    })
  },

  // Low cardinality
  {
    name: 'low_cardinality',
    severity: 'info',
    detect: (col) => col.base_stats.distinct_estimate < 20 && col.base_stats.count > 1000,
    title: (col) => `${col.name}: Low cardinality (${col.base_stats.distinct_estimate} unique values)`,
    recommendations: [
      'Consider ENUM type for fixed categories',
      'Add accepted_values validation',
      'Document expected values'
    ],
    validationRule: (col) => ({
      format: 'gx',
      rule: JSON.stringify({
        expectation_type: 'expect_column_distinct_values_to_be_in_set',
        kwargs: {
          column: col.name,
          value_set: col.categorical_stats.top_values.map(v => v.value)
        }
      }, null, 2)
    })
  }
];
```

### UI Component

```tsx
<SuggestionsPanel>
  <Header>
    <Title>Data Quality Suggestions</Title>
    <Badge>{suggestions.length} issues found</Badge>
  </Header>

  <Filters>
    <SeverityFilter selected={filter} onChange={setFilter} />
  </Filters>

  <SuggestionList>
    {filteredSuggestions.map(s => (
      <SuggestionCard
        severity={s.severity}
        title={s.title}
        column={s.column}
        description={s.description}
        recommendations={s.recommendations}
        onCopyRule={() => copyToClipboard(s.validationRule)}
      />
    ))}
  </SuggestionList>

  <EmptyState when={suggestions.length === 0}>
    No issues detected - your data looks healthy!
  </EmptyState>
</SuggestionsPanel>
```

## 8. Resources

- [Data Quality Dimensions](https://www.dataversity.net/what-is-data-quality/)
- [Common Data Quality Issues](https://www.talend.com/resources/what-is-data-quality/)
- [PII Detection Patterns](https://docs.aws.amazon.com/macie/latest/user/managed-data-identifiers.html)
