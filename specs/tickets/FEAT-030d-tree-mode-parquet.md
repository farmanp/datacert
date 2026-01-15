# FEAT-030d: Tree Mode for Parquet Files

## 1. Intent (Required)
**User Story:**
As a data engineer working with wide Parquet files
I want to select specific columns before profiling
So that I can efficiently analyze datasets with 500+ columns without profiling everything

**Success Looks Like:**
User uploads a 544-column Parquet file with nested structs. Tree Mode auto-detects the wide schema, shows hierarchical column structure (e.g., `user.preferences.email.address`), user selects 20 columns, and profiling runs on just those columns via DuckDB.

## 2. Context & Constraints (Required)

### Problem
- Wide Parquet files (500+ columns) cause slow profiling and UI overwhelm
- Nested structs flatten to many columns (e.g., `user.preferences.*` → 100+ columns)
- No way to select subset before profiling
- Profiling all 544 columns when you only need 20 is wasteful

### Existing Infrastructure
- ✅ Tree Mode UI already built (FEAT-030b)
- ✅ TreeNode structure defined in Rust
- ✅ DuckDB integration exists for large files
- ✅ Backend can convert schema to tree

### Constraints
- Must work with DuckDB (already used for large Parquet)
- Parquet schema might be deeply nested (4-5 levels)
- Need to preserve hierarchical structure
- Must integrate with existing auto-detection flow

### Dependencies
- DuckDB-WASM for schema reading and column selection
- Existing Tree Mode UI (FEAT-030b)
- Parquet file handling infrastructure

## 3. Acceptance Criteria (Required)

**Scenario: Wide Parquet with nested columns**
```gherkin
Given I upload a Parquet file with 544 columns and 4 levels of nesting
When the file is analyzed
Then I see a modal: "This Parquet has 544 columns. Use Tree Mode?"
And if I click OK, I navigate to /tree-mode
And I see hierarchical column structure (user.preferences.email.address)
And I can select up to 500 columns
And when I click "Profile Selected"
Then DuckDB profiles only selected columns
And I see results for just those columns
```

**Scenario: Flat wide Parquet (no nesting)**
```gherkin
Given I upload a Parquet with 600 flat columns
When analyzed
Then Tree Mode is recommended (total_paths > 500)
And tree shows all columns at depth 1
And selection works the same
```

**Performance Requirements:**
- Schema read: < 1 second for 1000-column Parquet
- Tree display: smooth scrolling for 1000 nodes
- Profiling: only selected columns processed by DuckDB

## 4. AI Execution Instructions (Required)

### Phase 1: Schema Reading & Conversion

**File:** `src/app/utils/parquet-schema.ts`
```typescript
import { initDuckDB, executeQuery } from './duckdb';

interface ParquetColumn {
  name: string;
  type: string;
  path: string[];
}

export async function readParquetSchema(file: File): Promise<TreeNode> {
  await initDuckDB();
  
  // Register Parquet file
  await registerParquet('schema_file.parquet', file);
  
  // Get schema using DESCRIBE
  const result = await executeQuery<{ column_name: string; column_type: string }>(
    `DESCRIBE SELECT * FROM read_parquet('schema_file.parquet')`
  );
  
  // Build tree from flat column list
  // Columns like "user_preferences_email" or "user.preferences.email"
  const root: TreeNode = {
    path: '$',
    depth: 0,
    data_type: 'object',
    population: 100,
    child_count: 0,
    children: [],
  };
  
  // Parse nested structure from column names
  for (const col of result.rows) {
    const parts = col.column_name.split(/[._]/); // Split on . or _
    addToTree(root, parts, col.column_type);
  }
  
  return root;
}
```

**Key Logic:**
- Use DuckDB `DESCRIBE` to get schema without reading data
- Parse column names for nesting (`.` or `_` separators)
- Build TreeNode hierarchy
- Infer data_type from Parquet type (BIGINT → number, VARCHAR → string)

### Phase 2: Auto-Detection

**File:** `src/app/components/FileDropzone.tsx`
Add Parquet detection:
```typescript
const isParquet = file.name.toLowerCase().endsWith('.parquet');

if (isParquet) {
  const { readParquetSchema } = await import('../utils/parquet-schema');
  const tree = await readParquetSchema(file);
  
  const totalColumns = countLeafNodes(tree);
  
  if (totalColumns > 500 || tree.depth > 3) {
    const useTreeMode = window.confirm(
      `This Parquet has ${totalColumns} columns at ${tree.depth} levels deep.\n\n` +
      `Tree Mode is recommended for column selection.\n\n` +
      `Click OK to use Tree Mode, or Cancel to profile all columns.`
    );
    
    if (useTreeMode) {
      window.location.href = '/tree-mode';
      return;
    }
  }
}
```

### Phase 3: Column-Filtered Profiling

**File:** `src/app/components/TreeProfileView.tsx`
Update `handleProfileSelected`:
```typescript
const handleProfileSelected = async () => {
  const file = fileStore.store.file?.file;
  const isParquet = file?.name.toLowerCase().endsWith('.parquet');
  
  if (isParquet) {
    // DuckDB path for Parquet
    await initDuckDB();
    await registerParquet('data.parquet', file);
    
    // Build SELECT with only chosen columns
    const selectedCols = selectedPaths.map(p => `"${p}"`).join(', ');
    const query = `SELECT ${selectedCols} FROM read_parquet('data.parquet')`;
    
    const result = await executeQuery(query);
    
    // Profile the subset
    profileStore.profileFromRows(result.rows, selectedPaths);
  } else {
    // Existing JSON logic...
  }
};
```

### Phase 4: Testing

**Test Cases:**
1. ✅ Flat 600-column Parquet → Tree shows all at depth 1
2. ✅ Nested 544-column Parquet → Tree shows hierarchy
3. ✅ Select 20 columns → Only those profiled
4. ✅ Large file (>100MB) → No OOM
5. ✅ Auto-detection triggers at 500+ columns

## 5. Git Commit Messages (Required)

```
feat(parquet): add Tree Mode support for wide Parquet files

- Read Parquet schema via DuckDB DESCRIBE
- Convert flat columns to hierarchical tree structure
- Auto-detect wide Parquet (>500 columns or depth >3)
- Profile only selected columns using DuckDB SELECT
- Reuse existing Tree Mode UI (FEAT-030b)
- Supports both nested structs and flat wide schemas

Fixes: Profiling 544-column Parquet files
Related: FEAT-030, FEAT-030b
```

## 6. Verification & DoD (Required)

### Manual Testing
```bash
# 1. Create test Parquet with nested columns
# Use your 544-column, 4-level deep file

# 2. Upload to DataCert
npx datacert serve
# Upload file → should see Tree Mode modal

# 3. Verify tree structure
# Check hierarchical display of user.preferences.email.*

# 4. Select 20 columns → Profile Selected
# Verify only 20 columns in results

# 5. Check performance
# Large Parquet should not OOM
```

### Automated Tests (if applicable)
- Unit test: `readParquetSchema()` with mock DuckDB
- Integration test: End-to-end with sample Parquet

### Success Criteria
- [ ] Wide Parquet (>500 cols) triggers Tree Mode
- [ ] Nested structure displays correctly
- [ ] Select subset → profile works
- [ ] No OOM on large files
- [ ] DuckDB handles column filtering

## 7. Resources (Optional)

### Reference Files
- `src/app/utils/structure-scanner.ts` - JSON structure analysis (template)
- `src/app/components/TreeProfileView.tsx` - Existing UI
- `src/app/utils/duckdb.ts` - DuckDB utilities

### DuckDB Schema Query
```sql
-- Get Parquet schema
DESCRIBE SELECT * FROM read_parquet('file.parquet');

-- Column names, types
SELECT column_name, column_type FROM ...

-- Select subset
SELECT "user.preferences.email", "user.id" FROM read_parquet('file.parquet');
```

### Parquet Column Naming
- Nested: `user.preferences.email.address`
- Flattened: `user_preferences_email_address`
- Both patterns supported

---

**Estimated Effort:** 2-3 hours
**Priority:** High (user requested)
**Depends on:** FEAT-030b (complete ✅)
