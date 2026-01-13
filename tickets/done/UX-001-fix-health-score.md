# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to see an accurate health score calculated from my data
So that I can trust the quality metrics and make informed decisions

**Success Looks Like:**
The Health Score KPI card displays a real calculated value based on the average missing percentage across all columns, not a hardcoded "98%".

## 2. Context & Constraints (Required)
**Background:**
Currently the Health Score in ProfileReport.tsx displays a static "98%" regardless of actual data quality. This misleads users and undermines trust in the profiler. A real health score should reflect the completeness of the data.

**Scope:**
- **In Scope:**
  - Calculate health score from column profiles
  - Formula: `(1 - avgMissingPercent) * 100`
  - Update KPI card to use computed value
  - Color code: green >90%, amber 70-90%, red <70%
  - Round to 1 decimal place

- **Out of Scope:**
  - Multi-dimensional quality scoring (uniqueness, validity, etc.)
  - Exportable quality report
  - Historical score tracking

**Constraints:**
- Must compute on-the-fly from profileStore results
- Must not add latency to the UI
- Color thresholds should be consistent with QualityBadge component

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Display calculated health score**
Given a user has uploaded a CSV file
And the file has been profiled
When the ProfileReport displays
Then the Health Score KPI shows a calculated percentage based on data quality
And the value matches `(1 - (sum of missing / sum of counts)) * 100`

**Scenario: Color coding for excellent data**
Given a dataset with <10% missing values across all columns
When the Health Score displays
Then the score text is colored emerald/green (text-emerald-400)

**Scenario: Color coding for warning**
Given a dataset with 10-30% missing values across all columns
When the Health Score displays
Then the score text is colored amber (text-amber-400)

**Scenario: Color coding for critical**
Given a dataset with >30% missing values across all columns
When the Health Score displays
Then the score text is colored rose/red (text-rose-400)

**Scenario: All complete data**
Given a dataset with 0% missing values
When the Health Score displays
Then the score shows "100%" with green coloring

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ProfileReport.tsx` - Update KPI card logic

**Must NOT Change:**
- `src/app/stores/profileStore.ts` - No schema changes
- Other components

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): calculate real health score from column profiles

## 6. Verification & Definition of Done (Required)
- [ ] Health score displays calculated value, not hardcoded
- [ ] Color changes based on thresholds (green/amber/red)
- [ ] Verified with multiple test datasets (clean, messy, all-null columns)
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- ProfileReport.tsx:236 - Current hardcoded implementation
- QualityBadge.tsx - Reference for color threshold patterns
