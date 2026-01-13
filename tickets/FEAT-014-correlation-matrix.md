# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to see correlation between numeric columns
So that I can identify relationships and potential redundancies in my data

**Success Looks Like:**
A correlation matrix heatmap displays pairwise Pearson correlation coefficients for all numeric columns, with interactive tooltips and filtering.

## 2. Context & Constraints (Required)
**Background:**
Correlation analysis reveals relationships between variables that inform feature engineering, identify redundant columns, and validate expected data relationships. This is a standard feature in data profiling tools.

**Scope:**
- **In Scope:**
  - Pearson correlation coefficient computation
  - Correlation matrix heatmap visualization
  - Interactive hover showing exact correlation value
  - Color scale: blue (negative) to white (zero) to red (positive)
  - Filter to show only correlations above threshold
  - Sort columns by correlation strength
  - Only computed for numeric columns

- **Out of Scope:**
  - Spearman rank correlation
  - Categorical correlation (Cramér's V)
  - Partial correlation
  - Correlation significance testing
  - Scatter plot drill-down

**Constraints:**
- Compute in single pass using online algorithm
- Memory: O(n²) where n = numeric column count
- Limit to 50 numeric columns (n²=2500 pairs)
- Skip if > 50 numeric columns with user warning

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Compute correlation matrix**
Given a dataset with 5 numeric columns
When profiling completes
Then a 5x5 correlation matrix is computed
And diagonal values are 1.0 (self-correlation)
And matrix is symmetric

**Scenario: Display heatmap**
Given correlation matrix has been computed
When viewing the correlation tab
Then a heatmap displays all pairwise correlations
And colors range from blue (-1) to red (+1)
And hovering shows exact value (e.g., "revenue × quantity: 0.73")

**Scenario: Filter by threshold**
Given correlation matrix is displayed
When user sets threshold to 0.5
Then only correlations with |r| >= 0.5 are shown
And weak correlations are hidden

**Scenario: Handle many columns**
Given a dataset with 60 numeric columns
When profiling completes
Then correlation matrix is not computed
And a message displays "Correlation matrix skipped: too many numeric columns (60 > 50 limit)"

**Scenario: Handle missing values**
Given two columns with different missing value patterns
When correlation is computed
Then only rows with both values present are used
And the effective N is shown in tooltip

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/stats/correlation.rs` - Correlation computation (create)
- `src/app/components/CorrelationMatrix.tsx` - Heatmap component (create)
- `src/app/pages/Profile.tsx` - Add correlation tab
- `src/app/stores/profileStore.ts` - Add correlation data

**Must NOT Change:**
- Basic statistics computation
- Other UI components
- Export functionality (add correlation in separate ticket)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(stats): implement online pearson correlation computation
- feat(ui): create correlation matrix heatmap component
- feat(ui): add correlation threshold filter
- test(stats): add correlation computation tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Correlation values verified against pandas/numpy
- [ ] Heatmap renders correctly for various matrix sizes
- [ ] Memory usage acceptable for 50×50 matrix
- [ ] Color scale is accessible (colorblind-friendly option)
- [ ] Code reviewed

## 7. Resources
- Pearson correlation: https://en.wikipedia.org/wiki/Pearson_correlation_coefficient
- Online correlation algorithm: https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Covariance
- Heatmap accessibility: https://blog.datawrapper.de/colorblind-check/
