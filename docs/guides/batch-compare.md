# Batch Processing & Comparison Mode

*Audience: Data ops teams*

## Overview

**Batch processing** and **comparison mode** enable multi-file workflows for detecting schema drift, comparing datasets, and analyzing data over time.

---

## Batch Processing

### Use Cases
- Profile multiple files at once
- Monitor daily batch quality
- Aggregate statistics across partitions

### How It Works *(Coming Soon)*

**Current Limitation**: DataCert processes one file at a time.

**Planned Feature** (v2):
1. Upload multiple files → Checkbox "Batch Mode"
2. Each file profiles independently
3. View aggregated results:
   - Average health score across all files
   - Column presence matrix (which columns appear in which files)
   - Schema evolution timeline

**Workaround**:
Profile files individually, export JSON, then compare programmatically:

```javascript
const profiles = [
  JSON.parse(fs.readFileSync('day1_profile.json')),
  JSON.parse(fs.readFileSync('day2_profile.json')),
  JSON.parse(fs.readFileSync('day3_profile.json'))
];

profiles.forEach((p, i) => {
  console.log(`Day ${i+1}: ${p.columns.length} columns, ${p.metadata.totalRows} rows`);
});
```

---

## Comparison Mode

### What is Comparison Mode?

Compare **two datasets** side-by-side to detect:
- **Schema drift**: New/missing/renamed columns
- **Type changes**: Column changed from Integer to String
- **Statistical drift**: Mean shifted significantly
- **Quality degradation**: New missing values

### Workflow

**Step 1: Profile Both Files**
1. Profile File A (e.g., `sales_2024-01.csv`)
2. Profile File B (e.g., `sales_2024-02.csv`)

**Step 2: Export Profiles**
- Export both as JSON Profile format

**Step 3: Use Comparison Tool** *(Manual for now)*

```python
import json

with open('jan_profile.json') as f:
    jan = json.load(f)
with open('feb_profile.json') as f:
    feb = json.load(f)

# Find new columns
jan_cols = {c['name'] for c in jan['columns']}
feb_cols = {c['name'] for c in feb['columns']}

print("New columns:", feb_cols - jan_cols)
print("Removed columns:", jan_cols - feb_cols)

# Find type changes
for col in jan['columns']:
    feb_col = next((c for c in feb['columns'] if c['name'] == col['name']), None)
    if feb_col and col['type'] != feb_col['type']:
        print(f"Type changed: {col['name']} from {col['type']} to {feb_col['type']}")
```

### Planned UI Feature *(v2)*

**Diff View**:
```
┌─────────────────┬─────────────────┬──────────────────┐
│ Column          │ Jan 2024        │ Feb 2024         │
├─────────────────┼─────────────────┼──────────────────┤
│ order_id        │ Integer         │ Integer          │
│ customer_email  │ String (✓ PII)  │ String (✓ PII)   │
│ order_value     │ Mean: $127      │ Mean: $145 (+14%)│
│ promo_code      │ —               │ String (NEW!)    │
│ legacy_field    │ String          │ — (REMOVED)      │
└─────────────────┴─────────────────┴──────────────────┘
```

**Alert Triggers**:
- 🔴 Type change detected
- 🟡 Mean shifted >20%
- 🟢 New optional column
- ⚪ Column removed

---

## Schema Evolution Tracking

### Manual Approach

**Step 1**: Profile baseline dataset
```bash
# Jan 1, 2024
Profile: baseline.csv → Export: baseline_profile.json
```

**Step 2**: Profile new datasets weekly
```bash
# Weekly cron job
Profile: week_01.csv → Export: week_01_profile.json
Profile: week_02.csv → Export: week_02_profile.json
...
```

**Step 3**: Compare against baseline
```python
def compare_schemas(baseline_path, new_path):
    baseline = json.load(open(baseline_path))
    new = json.load(open(new_path))
    
    # Schema drift check
    baseline_schema = {c['name']: c['type'] for c in baseline['columns']}
    new_schema = {c['name']: c['type'] for c in new['columns']}
    
    for col, typ in new_schema.items():
        if col not in baseline_schema:
            print(f"⚠️  NEW COLUMN: {col} ({typ})")
        elif baseline_schema[col] != typ:
            print(f"🔴 TYPE CHANGED: {col} from {baseline_schema[col]} to {typ}")
```

---

## N-Way Comparison *(Advanced)*

Compare **3+ datasets** to track trends:

```python
import pandas as pd

profiles = ['jan.json', 'feb.json', 'mar.json', 'apr.json']

# Extract health scores
scores = []
for p in profiles:
    data = json.load(open(p))
    scores.append({
        'month': p.split('.')[0],
        'health_score': calculate_health_score(data),
        'column_count': len(data['columns']),
        'avg_completeness': avg([c['completeness'] for c in data['columns']])
    })

df = pd.DataFrame(scores)
print(df)

# Visualize trends
import matplotlib.pyplot as plt
df.plot(x='month', y='health_score', kind='line')
plt.show()
```

---

## Automation Ideas

### Daily Quality Monitoring

```bash
#!/bin/bash
# daily_profile.sh

DATE=$(date +%Y-%m-%d)
FILE="/data/daily_batch_${DATE}.csv"

# Profile file (headless browser automation)
npx playwright run profile.js --file $FILE --output "profile_${DATE}.json"

# Compare against baseline
python compare_schemas.py baseline.json "profile_${DATE}.json"

# Alert if drift detected
if [ $? -ne 0 ]; then
  echo "Schema drift detected on $DATE!" | mail -s "Alert" ops@company.com
fi
```

### CI/CD Integration

**Pre-deploy check**:
```yaml
# .github/workflows/data-quality.yml
name: Data Quality Check

on: [pull_request]

jobs:
  profile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Profile new data
        run: npx playwright test profile-data.spec.ts
      - name: Compare with production baseline
        run: python scripts/compare_schemas.py prod_baseline.json new_profile.json
      - name: Fail if drift
        run: exit $?
```

---

## Multi-File Best Practices

### Naming Convention
Use consistent naming for easy tracking:
```
profiles/
├── 2024-01-01_sales_profile.json
├── 2024-01-02_sales_profile.json
├── 2024-01-03_sales_profile.json
...
```

### Metadata Tagging
Add custom metadata to exports:
```json
{
  "metadata": {
    "filename": "sales_2024-01-15.csv",
    "environment": "production",
    "pipeline_version": "v2.3.1",
    "generated_at": "2024-01-15T10:00:00Z"
  }
}
```

### Retention Policy
- Keep daily profiles for **30 days**
- Keep weekly snapshots for **1 year**
- Keep monthly baselines **indefinitely**

---

## Roadmap

**Planned Features** (v2):
- ✅ Native multi-file upload
- ✅ Side-by-side diff view UI
- ✅ Automated drift alerts
- ✅ Column presence heatmap
- ✅ Trend charts (health score over time)
- ✅ Export comparison report (HTML/PDF)

---

## Workarounds (Current)

Until native comparison mode ships:

### Quick Diff Script

```python
# quick_diff.py
import sys, json

def diff(file1, file2):
    p1 = json.load(open(file1))
    p2 = json.load(open(file2))
    
    cols1 = {c['name']: c for c in p1['columns']}
    cols2 = {c['name']: c for c in p2['columns']}
    
    print(f"File 1: {p1['metadata']['filename']} ({len(cols1)} columns)")
    print(f"File 2: {p2['metadata']['filename']} ({len(cols2)} columns)")
    print()
    
    # New columns
    new = set(cols2.keys()) - set(cols1.keys())
    if new:
        print(f"🟢 NEW COLUMNS: {', '.join(new)}")
    
    # Removed columns
    removed = set(cols1.keys()) - set(cols2.keys())
    if removed:
        print(f"🔴 REMOVED: {', '.join(removed)}")
    
    # Type changes
    for col in set(cols1.keys()) & set(cols2.keys()):
        if cols1[col]['type'] != cols2[col]['type']:
            print(f"⚠️  {col}: {cols1[col]['type']} → {cols2[col]['type']}")

if __name__ == '__main__':
    diff(sys.argv[1], sys.argv[2])
```

**Usage:**
```bash
python quick_diff.py jan_profile.json feb_profile.json
```

---

## Next Steps

- **[Validation Guide](./validation.md)** – Automate quality checks on batches
- **[Export Guide](./exports.md)** – Generate comparison-ready JSON profiles
