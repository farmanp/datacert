# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to see comprehensive statistics including median, standard deviation, quantiles, and histograms
So that I can fully understand the distribution of my data

**Success Looks Like:**
Each numeric column displays median, standard deviation, quartiles (P25, P50, P75), and a visual histogram. Categorical columns show top-N value frequencies.

## 2. Context & Constraints (Required)
**Background:**
Basic statistics (FEAT-002) provide a foundation, but data engineers need distribution analysis to understand data shape, identify outliers, and validate assumptions. These advanced statistics require more sophisticated online algorithms.

**Scope:**
- **In Scope:**
  - Median (P50) using t-digest algorithm
  - Standard deviation using Welford's online algorithm
  - Quantiles: P25, P50, P75, P90, P95, P99
  - Histogram generation with automatic bin sizing
  - Top-N frequent values for all column types (default N=10)
  - Skewness and kurtosis for numeric columns
  - Mode (most frequent value)

- **Out of Scope:**
  - Correlation matrix (separate ticket)
  - Anomaly/outlier detection (separate ticket)
  - Custom quantile selection by user

**Constraints:**
- All statistics must compute in single pass (streaming)
- T-digest compression parameter should balance accuracy vs memory
- Histograms limited to 50 bins maximum
- Top-N tracking uses Count-Min Sketch for memory efficiency

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Compute median and standard deviation**
Given a numeric column with values [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
When profiling completes
Then median is 5.5 (within 5% for t-digest approximation)
And standard deviation is ~2.87

**Scenario: Compute quantiles**
Given a numeric column with 1000 sequential values (1-1000)
When profiling completes
Then P25 ≈ 250, P50 ≈ 500, P75 ≈ 750
And P90 ≈ 900, P95 ≈ 950, P99 ≈ 990
And all quantiles are within 2% of exact values

**Scenario: Generate histogram**
Given a numeric column with normal distribution (mean=100, std=15)
When profiling completes
Then histogram has appropriate bin count (10-50 bins)
And bin edges span from min to max value
And bin counts reflect the distribution shape

**Scenario: Top-N frequent values**
Given a categorical column with values appearing: "A"(100x), "B"(50x), "C"(25x), others(25x)
When profiling completes
Then top-3 values are ["A": 100, "B": 50, "C": 25]
And percentage of each is calculated correctly

**Scenario: Large dataset accuracy**
Given a numeric column with 1 million values
When profiling completes
Then median is within 1% of exact median
And quantiles are within 2% of exact values
And computation uses < 10MB memory for statistics

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/stats/numeric.rs` - Extend with advanced statistics
- `src/wasm/src/stats/categorical.rs` - Add top-N tracking
- `src/wasm/src/stats/tdigest.rs` - T-digest implementation (create)
- `src/wasm/src/stats/histogram.rs` - Histogram generation (create)

**Must NOT Change:**
- Basic statistics interface from FEAT-002
- Parser implementation
- UI components (will be updated in separate tickets)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(stats): implement t-digest for streaming median/quantiles
- feat(stats): add welford's algorithm for standard deviation
- feat(stats): implement histogram generation with auto-binning
- feat(stats): add top-n value tracking with count-min sketch
- feat(stats): add skewness and kurtosis computation
- test(stats): add advanced statistics accuracy tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Accuracy tests against exact computation on known datasets
- [ ] Memory profiling confirms O(1) space for streaming stats
- [ ] Performance: < 5% overhead vs basic stats
- [ ] Unit tests cover edge cases (empty, single value, all same)
- [ ] Code reviewed

## 7. Resources
- T-digest paper: https://arxiv.org/abs/1902.04023
- Welford's algorithm: https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm
- Count-Min Sketch: https://en.wikipedia.org/wiki/Count%E2%80%93min_sketch
- Rust t-digest crate: https://docs.rs/tdigest
