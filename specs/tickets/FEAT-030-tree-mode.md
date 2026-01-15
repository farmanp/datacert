# FEAT-030: Tree Mode for Deeply Nested JSON

**Type**: Feature  
**Priority**: Medium  
**Status**: Proposed  
**Effort**: L (3-5 days)

---

## Problem Statement

DataCert's current profiling approach **flattens nested JSON** into tabular format using dot-notation (e.g., `user.preferences.notifications.email`). This works well for shallow JSON (depth ≤ 3) but fails catastrophically for deeply nested structures:

**Current Limitations:**
- Hard limit: `max_nested_depth: 3` (line 78 in `json.rs`)
- Max columns: 500
- **OOM crashes** on deeply nested JSON (e.g., 5.7MB file with 10 levels)
- Unusable for real-world data (Etsy: 500 levels, BigQuery: 10,000 columns)

**Example Failure:**
```json
// 10-level nested JSON (5.7MB)
{
  "level1": {
    "level2": {
      // ... 8 more levels
    }
  }
}
```

Result: OOM error when opened in SQL Mode.

---

## Proposed Solution: Tree Mode Profiling

Add a **second profiling paradigm** optimized for tree-structured data instead of forcing everything into tabular format.

### Key Insight

There's a natural transition point:
- **Tabular territory**: Depth ≤ 5, columns < 1000 → flatten to CSV
- **Tree territory**: Depth > 5, columns > 1000 → analyze as tree

---

## Feature Design

### 1. Auto-Detection

On file upload, detect structure:

```rust
pub struct StructureAnalysis {
    max_depth: usize,
    estimated_columns: usize,
    branching_factor: f64,
    recommended_mode: ProfilingMode,
}

pub enum ProfilingMode {
    Tabular,  // Traditional flattening
    Tree,     // New hierarchical mode
    Hybrid,   // Tabular + tree for different sections
}
```

**Decision logic:**
```
if max_depth <= 5 && estimated_columns < 1000 {
    ProfilingMode::Tabular
} else if max_depth > 10 || estimated_columns > 5000 {
    ProfilingMode::Tree
} else {
    ProfilingMode::Hybrid  // User chooses
}
```

### 2. Tree Profiling Output

Instead of flattened columns, produce hierarchical statistics:

```rust
pub struct TreeNode {
    pub path: String,              // JSONPath: $.user.preferences
    pub depth: usize,              // Nesting level
    pub data_type: DataType,       // object, array, string, etc.
    pub population: f64,           // % of rows where this path exists
    pub child_count: usize,        // Number of direct children
    pub stats: Option<BasicStats>, // Only for leaf nodes
    pub children: Vec<TreeNode>,   // Recursive structure
}

pub struct BasicStats {
    pub count: u64,
    pub null_count: u64,
    pub distinct_approx: usize,    // HyperLogLog estimate
    pub example_values: Vec<String>, // Sample values
}
```

**Example output:**
```json
{
  "path": "$",
  "depth": 0,
  "type": "object",
  "population": 100.0,
  "children": [
    {
      "path": "$.user",
      "depth": 1,
      "type": "object",
      "population": 100.0,
      "child_count": 234,
      "children": [
        {
          "path": "$.user.preferences",
          "depth": 2,
          "type": "object",
          "population": 85.3,
          "child_count": 45,
          "children": [...]
        }
      ]
    }
  ]
}
```

### 3. UI Design

#### Landing Page Changes

Add mode selector:

```
┌─────────────────────────────────────┐
│  📊 Profile Mode                     │
├─────────────────────────────────────┤
│  ○ Tabular (CSV-like)               │
│     Best for: Flat data, < 500 cols │
│                                      │
│  ● Tree (Hierarchical) ← Recommended │
│     Best for: Nested JSON, depth >5 │
│                                      │
│  Detection: 10 levels deep,          │
│  ~2,345 estimated columns            │
└─────────────────────────────────────┘
```

#### Tree View UI

**Expandable tree visualization:**

```
📊 Structure Profile: user_data.json

Search: [_______________] 🔍

📂 $ (root)                              1,000 rows
├─ 📦 user (object)                      100% populated
│  ├─ 📝 id (integer)                    100% | min: 1, max: 1000
│  ├─ 📝 name (string)                   95% | avg len: 12
│  └─ 📂 preferences (object)            80% | 234 nested fields
│     ├─ 📂 notifications (object)       75% | 45 nested fields
│     │  ├─ 📝 email_frequency (string)  50% | 3 distinct
│     │  └─ 📂 channels (object)         40% | [+] Expand (200 more)
│     └─ [+] Expand (189 more fields)
│
└─ 📂 metadata (object)                  100% populated
   └─ [+] Expand (500 nested levels)

💡 Tip: Click any node to see detailed stats
```

**Detail panel (on click):**

```
┌──────────────────────────────────────────┐
│ $.user.preferences.notifications         │
├──────────────────────────────────────────┤
│ Type: object                              │
│ Population: 75% (750 of 1,000 rows)      │
│ Depth: 3                                  │
│ Children: 45 fields                       │
│                                           │
│ Most Common Fields:                       │
│  • email_frequency (50% populated)        │
│  • push_enabled (45% populated)           │
│  • channels (40% populated, object)       │
│                                           │
│ [Export This Subtree as CSV]              │
│ [Profile This Subtree Only]               │
└──────────────────────────────────────────┘
```

### 4. Export Options

**Export entire tree:**
- JSON Schema format
- Tree structure as CSV (path, depth, type, population)
- Interactive HTML report

**Export subtree:**
- Select a node → export just that branch as tabular data
- Example: Export `$.user.preferences` as flat CSV

---

## Implementation Plan

### Phase 1: Core Tree Profiler (Backend)

**Files to modify:**
- `src/wasm/src/parser/json.rs`
  - Add `TreeProfilingMode`
  - Collect hierarchical stats instead of flattening
- `src/wasm/src/stats/tree.rs` ← NEW
  - `TreeNode` data structure
  - Recursive statistics collection

**Rust changes:**
```rust
// New in json.rs
pub fn profile_as_tree(
    data: &[u8], 
    config: TreeProfilingConfig
) -> TreeProfileResult {
    // Don't flatten - build tree structure
    // For each path, track: type, population, depth
    // Use sampling to avoid memory explosion
}

pub struct TreeProfilingConfig {
    max_sample_rows: usize,      // Default 10,000
    max_depth_to_analyze: usize, // Default 100 (no limit in practice)
    track_examples: bool,        // Store example values
}
```

### Phase 2: UI Components (Frontend)

**New components:**
- `src/app/components/TreeProfileView.tsx`
  - Expandable tree visualization
  - Search/filter by path
  - Click to see details
- `src/app/components/TreeNodeDetail.tsx`
  - Detail panel for selected node
  - Export subtree options

**Libraries to use:**
- `react-arborist` or similar for tree rendering
- Virtual scrolling for 10k+ nodes

### Phase 3: Mode Selection

**Landing page:**
- Auto-detect structure
- Show recommendation
- Let user override

---

## Success Criteria

✅ Can profile 500-level nested JSON without OOM  
✅ Can handle 10,000 column JSON (BQ scale)  
✅ Tree view renders < 1 second for typical JSON  
✅ Can export tree as JSON Schema  
✅ Can export any subtree as tabular CSV  

---

## Open Questions

1. **Should tabular mode still be default?**
   - Proposal: Yes, but show modal if structure exceeds limits

2. **How to handle mixed structures?**
   - Example: Array of objects where objects have different schemas
   - Proposal: Show schema union (all possible paths)

3. **Performance targets?**
   - How many nodes can we render before virtualizing?
   - Proposal: Virtualize at 1,000+ nodes

4. **Export format for tree stats?**
   - JSON? CSV? Custom format?
   - Proposal: Support JSON Schema, CSV (path list), and HTML

---

## Related

- **ADR-021**: DuckDB Single-Threaded Mode
- **FEAT-020**: SQL Mode (incompatible with deep JSON)
- Issue: 5.7MB JSON OOM error

---

## Mockups Needed

- [ ] Auto-detection modal UI
- [ ] Tree view component design
- [ ] Detail panel layout
- [ ] Export options UI

---

## Notes

This is a **fundamental enhancement** that changes DataCert from "CSV profiler with JSON support" to "polyglot data profiler" that handles different data paradigms appropriately.

**User quote:** *"At Etsy, we have 500 levels of nested fields... we sample size it"*

This feature would enable DataCert to handle real-world enterprise JSON at scale.
