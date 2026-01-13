# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want automatic data quality assessment for each column
So that I can quickly identify data issues without manual inspection

**Success Looks Like:**
Each column displays quality metrics (completeness, uniqueness) with visual indicators, and potential issues (PII, duplicates) are flagged with warnings.

## 2. Context & Constraints (Required)
**Background:**
Data quality assessment is critical for data engineers validating new datasets. Automated detection of common issues saves hours of manual inspection and reduces the risk of building pipelines on flawed data.

**Scope:**
- **In Scope:**
  - Completeness score: (non-null count / total count)
  - Uniqueness score: (distinct count / non-null count)
  - Duplicate row detection (exact row matches)
  - PII pattern detection (email, phone, SSN, credit card)
  - Constant column detection (only 1 unique value)
  - High cardinality warning (>90% unique in string column)
  - Composite quality score per column and overall
  - Quality issue severity levels (info, warning, error)

- **Out of Scope:**
  - Custom validation rules (Phase 3)
  - Cross-column validation
  - Data type consistency validation
  - Referential integrity checks

**Constraints:**
- PII detection uses regex patterns only (no ML/external services)
- Detection should be conservative (prefer false positives over false negatives)
- Quality score formula should be documented and configurable
- All detection runs in single pass with statistics

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Calculate completeness**
Given a column with 100 values, 15 of which are null
When quality metrics are computed
Then completeness score is 0.85 (85%)
And a warning is shown for completeness < 90%

**Scenario: Calculate uniqueness**
Given a column with 100 non-null values, 80 unique
When quality metrics are computed
Then uniqueness score is 0.80 (80%)

**Scenario: Detect email PII**
Given a column containing values like "user@example.com"
When quality metrics are computed
Then the column is flagged as "potential PII: email"
And severity is "warning"

**Scenario: Detect SSN PII**
Given a column with values matching "XXX-XX-XXXX" pattern
When quality metrics are computed
Then the column is flagged as "potential PII: SSN"
And severity is "error" (high sensitivity)

**Scenario: Detect duplicate rows**
Given a dataset with 1000 rows, 50 of which are exact duplicates
When quality metrics are computed
Then duplicate count is 50
And duplicate percentage is 5%
And a warning indicates "50 duplicate rows detected"

**Scenario: Composite quality score**
Given a column with completeness=0.9, uniqueness=0.5, no PII
When quality metrics are computed
Then a composite quality score is calculated
And score reflects weighted combination of metrics

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/quality/mod.rs` - Quality module entry
- `src/wasm/src/quality/completeness.rs` - Completeness calculation
- `src/wasm/src/quality/uniqueness.rs` - Uniqueness calculation
- `src/wasm/src/quality/patterns.rs` - PII pattern detection
- `src/wasm/src/quality/duplicates.rs` - Duplicate row detection

**Must NOT Change:**
- Statistics implementation
- Parser implementation
- UI components

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(quality): implement completeness and uniqueness metrics
- feat(quality): add pii pattern detection for email, phone, ssn
- feat(quality): implement duplicate row detection
- feat(quality): add composite quality score calculation
- feat(quality): add quality issue severity classification
- test(quality): add quality metrics test suite

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] PII patterns tested against common formats
- [ ] False positive rate for PII detection documented
- [ ] Quality score formula documented
- [ ] Performance: quality metrics add < 10% overhead
- [ ] Unit tests cover all quality metrics
- [ ] Code reviewed

## 7. Resources
- Common PII regex patterns: https://github.com/madisonmay/CommonRegex
- Data quality dimensions: https://www.dataversity.net/data-quality-dimensions/
- Great Expectations metrics reference: https://docs.greatexpectations.io/docs/reference/expectations/
