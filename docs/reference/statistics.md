# Statistics Reference

## Overview

This reference explains the statistical methods used in DataCert, including formulas, algorithms, and interpretation guidelines.

---

## Basic Statistics

### Count
**Formula:** Total number of non-null rows processed  
**Use:** Denominator for percentages, completeness checks

### Missing Count
**Formula:** Count of NULL, empty string, or whitespace-only values  
**Use:** Data quality assessment

### Completeness
**Formula:** `(Count - Missing) / Count × 100%`  
**Use:** Percentage of valid data

---

## Cardinality Estimation

### Distinct Count (HyperLogLog)
**Algorithm:** HyperLogLog++  
**Accuracy:** ±1-2% error for large datasets  
**Memory:** O(1) - fixed ~12KB per column  
**Trade-off:** Speed and memory vs. exact counts

**Why HyperLogLog?**
- Exact counting requires O(n) memory (storing all unique values)
- HLL uses probabilistic counting with constant memory
- Ideal for high-cardinality columns (millions of unique values)

**Example:**
```
Exact count: 1,234,567
HLL estimate: 1,241,892 (0.6% error)
```

---

## Numeric Statistics

### Mean (Average)
**Formula:** `Σ(values) / count`  
**Interpretation:** Center of distribution  
**Sensitivity:** Affected by outliers

### Median (p50)
**Algorithm:** t-digest (streaming percentile estimation)  
**Interpretation:** Middle value when sorted  
**Robustness:** Not affected by outliers

### Standard Deviation
**Formula:** `√(Σ(x - mean)² / (n-1))`  
**Interpretation:** Average distance from mean  
**Use:** Measure of spread/variability

### Variance
**Formula:** `σ² = Σ(x - mean)² / (n-1)`  
**Interpretation:** Square of standard deviation  
**Use:** Mathematical convenience in formulas

### Skewness
**Formula:** `Σ((x - mean) / σ)³ / n`  
**Interpretation:**
- **0:** Symmetric distribution
- **Positive (>0):** Right-skewed (long tail right)
- **Negative (<0):** Left-skewed (long tail left)

**Example:**
```
Income data: skewness = +2.1
→ Most people earn low/medium, few earn very high (right tail)
```

### Kurtosis
**Formula:** `Σ((x - mean) / σ)⁴ / n - 3`  
**Interpretation:**
- **0 (mesokurtic):** Normal distribution (Bell curve)
- **Positive:** Heavy tails, more outliers
- **Negative:** Light tails, fewer outliers

---

## Percentiles (t-digest)

### Algorithm
**Name:** t-digest (Dunning & Ertl, 2019)  
**Type:** Streaming quantile estimation  
**Accuracy:** Higher near 0/100, lower near 50  
**Memory:** O(1) - ~1KB per column

### Percentiles Computed
- **p25 (Q1):** 25th percentile, lower quartile
- **p50 (Median):** 50th percentile
- **p75 (Q3):** 75th percentile, upper quartile
- **p90:** 90th percentile
- **p95:** 95th percentile
- **p99:** 99th percentile

### Interpreting Percentiles

**Example: Response time data**
```
p50 (median): 120ms  → 50% of requests faster than this
p90: 450ms           → 90% faster, 10% slower
p99: 2,100ms         → 99% faster, 1% slower (outliers)
```

**Use cases:**
- **p50:** Typical user experience
- **p95/p99:** SLA thresholds, worst-case scenarios
- **IQR (p75 - p25):** Middle 50% spread

---

## Histograms

### Binning Strategy
**Method:** Equal-width bins  
**Bin count:** Dynamic based on data range (typically 10-50 bins)  
**Formula:** `bin_width = (max - min) / num_bins`

### Reading Histograms

**Distribution Shapes:**
- **Normal (Gaussian):** Bell curve, symmetric
- **Uniform:** Flat, all values equally likely
- **Exponential:** Sharp peak left, long tail right
- **Bimodal:** Two distinct peaks

**Example:**
```
Age distribution:
[18-25): ████████ (8 people)
[25-35): ████████████████ (16 people) ← Peak
[35-45): ████████████ (12 people)
[45-55): ████████ (8 people)
[55-65): ████ (4 people)
```

---

## Quality Metrics

### Health Score
**Formula:**
```
health_score = 0.4 × completeness 
             + 0.3 × type_consistency 
             + 0.2 × uniqueness_score
             + 0.1 × (1 - outlier_rate)
```

**Components:**
1. **Completeness** (40%): `(1 - missing_rate)`
2. **Type Consistency** (30%): Ratio of values matching inferred type
3. **Uniqueness** (20%): For ID columns, penalize duplicates
4. **Outlier Rate** (10%): `1 - (outliers / count)`

### Outlier Detection
**Method:** 3-sigma rule (standard deviation)  
**Formula:** `|x - mean| > 3σ`  
**Interpretation:** Values >3 standard deviations from mean are outliers

**Example:**
```
Mean = 100, σ = 10
Outlier threshold: < 70 or > 130
Value 145 → Outlier (4.5σ from mean)
```

**Limitation:** Assumes normal distribution. Less effective for skewed data.

---

## Type Inference

### Detection Heuristics

| Type | Test Logic |
|------|------------|
| **Integer** | `parseInt(value) == value && !value.includes('.')` |
| **Numeric** | `parseFloat(value) !== NaN` |
| **Boolean** | `value in ['true', 'false', 'yes', 'no', '1', '0']` |
| **Date** | Matches ISO-8601 or common patterns |
| **DateTime** | Date + time component |
| **String** | Default fallback |
| **Mixed** | Multiple incompatible types detected |

### Sampling Strategy
- **Sample size:** First 1,000 rows
- **Majority rule:** Type appearing in >80% of samples wins
- **Fallback:** Mixed if no clear majority

---

## Correlation (Pearson)

### Formula
```
r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)
```

### Interpretation
- **+1:** Perfect positive correlation (x↑ → y↑)
- **0:** No correlation
- **-1:** Perfect negative correlation (x↑ → y↓)

### Strength Guidelines
- **|r| > 0.7:** Strong
- **0.4 < |r| < 0.7:** Moderate
- **|r| < 0.4:** Weak

### Caveats
- **Correlation ≠ Causation**
- Only measures **linear** relationships
- Sensitive to outliers

---

## String Metrics

### Min/Max Length
**Formula:** Character count of shortest/longest strings  
**Use:** Schema validation, detecting truncation

---

## Memory-Efficient Algorithms

### Why Streaming?
DataCert processes files **in chunks** to handle datasets larger than RAM.

| Statistic | Algorithm | Memory | Accuracy |
|-----------|-----------|--------|----------|
| Mean | Running average | O(1) | Exact |
| Distinct count | HyperLogLog | O(1) | ~98% |
| Percentiles | t-digest | O(1) | ~95% |
| Histogram | Fixed bins | O(bins) | Exact |
| Standard deviation | Welford's method | O(1) | Exact |

---

## Further Reading

- **HyperLogLog:** [Flajolet et al., 2007](http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf)
- **t-digest:** [Dunning & Ertl, 2019](https://arxiv.org/abs/1902.04023)
- **Streaming algorithms:** [*Probabilistic Data Structures*](https://www.amazon.com/dp/1617291609)
