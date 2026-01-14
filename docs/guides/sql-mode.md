# SQL Mode Guide

*Audience: Power users*

## What is SQL Mode?

SQL Mode embeds **DuckDB-Wasm** directly in your browser, allowing you to query uploaded files with full SQL before profiling. This enables:

- **Filtering**: `WHERE amount > 100`
- **Aggregation**: `GROUP BY category`
- **Joins**: Combine multiple uploaded files *(coming soon)*
- **Transforms**: Calculate derived columns

**Performance**: 1M row aggregations run in **~12ms** on modern hardware.

---

## Getting Started

### 1. Enter SQL Mode

After uploading a file:
1. Click **"SQL Mode"** button (top right)
2. DuckDB-Wasm loads lazily (~2 seconds first time)
3. Your file is registered as a table named `data`

### 2. Write a Query

The SQL editor supports standard DuckDB syntax:

```sql
-- Example: Filter high-value orders
SELECT * 
FROM data 
WHERE order_value > 500;
```

**Syntax highlighting** and basic error detection included.

### 3. Run & Profile

1. Click **"Run Query"** or press `Ctrl/Cmd + Enter`
2. Results preview appears (first 1,000 rows shown)
3. Click **"Profile Results"** to analyze the query output

---

## Supported SQL Features

### SELECT Queries

```sql
SELECT 
  product_category,
  COUNT(*) as order_count,
  AVG(price) as avg_price
FROM data
GROUP BY product_category
HAVING COUNT(*) > 100
ORDER BY order_count DESC;
```

### WHERE Clauses

Filter rows before profiling:

```sql
-- Clean data only
SELECT * FROM data 
WHERE email IS NOT NULL 
  AND created_at >= '2024-01-01';
```

### Aggregations

```sql
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(revenue) as total_revenue
FROM data
GROUP BY month;
```

### Window Functions

```sql
SELECT 
  *,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as visit_number
FROM data;
```

### Type Casting

```sql
-- Fix inferred types
SELECT 
  CAST(id AS INTEGER) as id,
  CAST(price AS DECIMAL(10,2)) as price,
  STR

PTIME(created_at, '%Y-%m-%d') as created_date
FROM data;
```

---

## File Format Support

SQL Mode works with all uploaded formats:

| Format | Table Name | Notes |
|--------|------------|-------|
| CSV | `data` | Auto-detects delimiter |
| JSON/JSONL | `data` | Flattens nested objects |
| Parquet | `data` | Native DuckDB support |
| Excel | `data` | First sheet only |
| Avro | `data` | Schema preserved |

---

## Query Execution

### Memory Management

- **In-memory processing**: All data loaded into DuckDB heap
- **Recommended limit**: <100MB files for responsive queries
- **If file >100MB**: Use filters to reduce result set size

### Timeout

Queries automatically timeout after **30 seconds** to prevent browser freezing.

### Error Handling

SQL errors display with:
- **Error message** from DuckDB
- **Line number** (when available)
- Previous results remain visible

---

## BigInt Handling

DuckDB returns large integers as `BigInt` objects. DataCert automatically converts these to strings for display:

```sql
SELECT COUNT(*) FROM data;
-- Result: "1000000" (string, not JavaScript number)
```

---

## Use Cases

### 1. Pre-Filter Large Files

```sql
-- Profile only recent records
SELECT * FROM data 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
```

### 2. Outlier Investigation

```sql
-- Check extreme values identified in profile
SELECT * FROM data 
WHERE price > 10000;
```

### 3. Sampling

```sql
-- Random sample for quick inspection
SELECT * FROM data 
USING SAMPLE 1000 ROWS;
```

### 4. Data Cleaning

```sql
-- Remove invalid records
SELECT * FROM data
WHERE email LIKE '%@%.%'
  AND age BETWEEN 18 AND 120;
```

### 5. Derived Columns

```sql
-- Calculate profit margin before profiling
SELECT 
  *,
  (revenue - cost) / revenue * 100 as profit_margin_pct
FROM data;
```

---

## Limitations

### Not Supported (v1)
- ❌ Multiple file joins (single file only)
- ❌ INSERT/UPDATE/DELETE (read-only)
- ❌ CREATE TABLE/VIEW (ephemeral session)
- ❌ Query persistence (resets on page reload)
- ❌ Remote file access via `httpfs` (local files only)

### Coming Soon
- Multi-file joins
- Query history saved to localStorage
- SQL autocomplete

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Run query |
| `Ctrl/Cmd + /` | Toggle comment |
| `Tab` | Indent selection |
| `Shift + Tab` | Outdent selection |

---

## Performance Tips

1. **Use LIMIT** for large result sets:
   ```sql
   SELECT * FROM data LIMIT 10000;
   ```

2. **Filter early**:
   ```sql
   -- Good: Filter first
   SELECT AVG(price) FROM data WHERE category = 'Electronics';
   
   -- Slower: Filter after
   SELECT * FROM data; -- then filter in SQL Mode
   ```

3. **Avoid SELECT ***:
   ```sql
   -- Better: Select only needed columns
   SELECT id, email, created_at FROM data;
   ```

---

## Troubleshooting

### "Query timeout after 30 seconds"
- **Cause**: Query too complex or dataset too large
- **Fix**: Add filters, use `LIMIT`, or profile full dataset without SQL Mode

### "Cannot read property of undefined"
- **Cause**: Column name typo or doesn't exist
- **Fix**: Check column names in original profile

### "BigInt can't be serialized to JSON"
- **Cause**: Internal serialization issue (rare)
- **Fix**: Cast to INTEGER or VARCHAR in query

---

## Next Steps

- **[Data Profiling Guide](./profiling.md)** – Interpret profile results
- **[Export Formats](./exports.md)** – Export query results
- **DuckDB Docs**: [https://duckdb.org/docs/sql/introduction](https://duckdb.org/docs/sql/introduction)
