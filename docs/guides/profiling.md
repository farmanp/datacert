# Data Profiling Basics

*Audience: All users*

## Overview

Data profiling reveals the **actual characteristics** of your dataset—what types of values exist, how complete the data is, and where quality issues lurk. This guide explains how to interpret DataCert profiling results.

---

## Understanding the Profile

### Health Score

The **Health Score** (0-100%) summarizes overall data quality:

- **90-100%**: Excellent – Minimal issues
- **70-89%**: Good – Some missing values or type inconsistencies  
- **50-69%**: Fair – Noticeable quality concerns
- **Below 50%**: Poor – Significant data quality work needed

**Calculated from:**
- Completeness (weight: 40%)
- Type consistency (weight: 30%)
- Uniqueness where expected (weight: 20%)
- Outlier prevalence (weight: 10%)

---

## Column Statistics Deep Dive

### **Base Statistics** (all columns)

| Metric | Description | Example |
|--------|-------------|---------|
| **Count** | Total rows processed | 10,000 |
| **Missing** | Null, empty, or blank values | 450 (4.5%) |
| **Distinct Estimate** | Approximate unique values using HyperLogLog | ~8,234 |
| **Inferred Type** | Auto-detected data type | Integer, String, Date |

**Pro Tip:** Distinct count uses probabilistic algorithms (HyperLogLog) for memory efficiency. Expect ±1-2% accuracy on large datasets.

### **Numeric Statistics** (Integer, Numeric columns)

| Metric | Description |
|--------|-------------|
| **Min / Max** | Smallest and largest observed values |
| **Mean** | Average value |
| **Median (p50)** | Middle value when sorted |
| **Std Dev** | Standard deviation (spread around mean) |
| **Variance** | Square of standard deviation |
| **Skewness** | Asymmetry of distribution (0 = symmetric) |
| **Kurtosis** | Tailedness (3 = normal distribution) |
| **Percentiles** | p25, p75, p90, p95, p99 using t-digest |

**Example Interpretation:**
```
Column: order_value
Mean: $127.45
Median: $89.99
Skewness: 2.3 (right-skewed → many small orders, few large ones)
```

### **Categorical Statistics** (String, Boolean columns)

- **Top Values**: Most frequent values with counts and percentages
- **Unique Count**: Exact count if small (< 1000), else estimated

**Example:**
```
Column: product_category
Top Values:
  Electronics: 3,245 (32.5%)
  Clothing: 2,891 (28.9%)
  Home & Garden: 1,567 (15.7%)
  ...
```

### **String Metrics**

- **Min Length / Max Length**: Shortest and longest string observed

---

## Data Type Detection

DataCert automatically infers column types by sampling values:

| Type | Detection Rules | Example Values |
|------|-----------------|----------------|
| **Integer** | All values are whole numbers | `1`, `42`, `-7` |
| **Numeric** | Contains decimals or scientific notation | `3.14`, `1e6` |
| **Boolean** | true/false, yes/no, 1/0 | `true`, `False`, `1` |
| **Date** | ISO dates, common patterns | `2024-01-15`, `01/15/2024` |
| **DateTime** | Date with time component | `2024-01-15T10:30:00Z` |
| **String** | Text values | `Alice`, `N/A`, `abc123` |
| **Mixed** | Multiple incompatible types | `123`, `abc`, `null` |
| **Empty** | All null/empty | | |

**Note:** Type inference uses heuristics. If incorrect, use SQL Mode to cast columns explicitly.

---

## Quality Warnings

### 🔴 **Missing Values**

- **Triggers when:** >5% of values are null/empty
- **Impact:** Can break pipelines, skew statistics
- **Action:** Investigate why data is missing. Is it expected (e.g., optional fields)?

### 🟡 **Potential PII**

- **Triggers when:** Column names match patterns: `email`, `ssn`, `phone`, `credit_card`, `password`
- **Impact:** GDPR/privacy risk
- **Action:** Verify if column contains real PII. Anonymize if needed.

### ⚠️ **Outliers**

- **Triggers when:** Values fall outside mean ± 3 standard deviations
- **Impact:** May indicate data entry errors or legitimate extremes
- **Action:** Click badge to view outlier row indices

---

## Histograms

Histograms show value distributions using **equal-width bins**:

- **X-axis**: Value ranges
- **Y-axis**: Frequency (count of values in that range)
- **Hover**: See exact bin boundaries and counts

**Reading histograms:**
- **Normal distribution** (bell curve): Most data centers around mean
- **Right-skewed**: Long tail on right (common for prices, counts)
- **Left-skewed**: Long tail on left (less common)
- **Bimodal**: Two peaks (suggests multiple subgroups)

---

## Search & Filter

Use the **column search bar** to filter by name:
- `email` → Shows only columns containing "email"
- Case-insensitive, partial matches

**Keyboard shortcut:** `Ctrl/Cmd + K`

---

## View Modes

### Table View
- **Best for:** Quick scanning, comparing metrics across many columns
- **Layout:** Compact grid, all stats visible

### Card View
- **Best for:** Deep inspection, seeing histograms and samples
- **Layout:** One card per column, includes visualizations

**Switch anytime** using the toggle buttons.

---

## Correlation Matrix

For datasets with **2+ numeric columns**:

1. Click **"Compute Correlation"**
2. View Pearson correlation coefficients (-1 to +1)
   - **+1**: Perfect positive correlation
   - **0**: No correlation
   - **-1**: Perfect negative correlation
3. **Use case:** Identify relationships (e.g., "age" vs "income")

**Pro Tip:** Correlation ≠ causation. High correlation just means values move together.

---

## Anomaly

 Drill-Down

Click quality warning badges to see **exact row indices** where issues occur:

- **Missing Values**: Rows with nulls
- **PII Detected**: Rows flagged for review
- **Outliers**: Statistical anomalies

**Caveat:** Row indices are capped at **1,000 per issue type** to manage memory.

---

## Sample Values

Each column card shows **up to 10 sample values** from the dataset. These are randomly selected, not the most common.

---

## Next Steps

- **[SQL Mode Guide](./sql-mode.md)** – Filter data before profiling
- **[Export Formats](./exports.md)** – Share results or generate validation rules
- **[Statistics Reference](../reference/statistics.md)** – Mathematical definitions
