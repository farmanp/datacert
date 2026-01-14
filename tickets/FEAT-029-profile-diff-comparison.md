# FEAT-029: Profile Diff / Schema Drift Detection

## 1. Intent (Required)

**User Story:**
As a data engineer
I want to compare two profiles side-by-side
So that I can detect schema drift, data quality changes, and distribution shifts between dataset versions

**Success Looks Like:**
Upload two files (or two profiles), see a clear diff showing what changed: new/removed columns, type changes, statistical shifts, quality degradation.

## 2. Context & Constraints (Required)

**Background:**
Schema drift is a top pain point in data pipelines. When upstream data changes unexpectedly, pipelines break. DataCert already has comparison mode for two files, but a dedicated "diff" view would:
- Highlight only changes (not full profiles)
- Detect statistical drift (mean shifted >20%)
- Alert on schema changes (new columns, type changes)
- Export diff report for documentation

**Scope:**
- **In Scope:**
  - Compare two profiles (from files or saved profiles)
  - Schema diff: added/removed/renamed columns, type changes
  - Statistical diff: highlight significant changes (>threshold)
  - Quality diff: completeness, uniqueness changes
  - Export diff report (Markdown, JSON)
  - Visual indicators: green (improved), red (degraded), yellow (changed)

- **Out of Scope:**
  - Row-level diff (different problem)
  - Automatic drift alerting/notifications
  - Historical profile storage (separate ticket)
  - Three-way diff

**Constraints:**
- Must work with any two compatible profiles
- Diff computation should be <1s
- Column matching by name (case-sensitive)

## 3. Acceptance Criteria (Required)

**Scenario: Schema drift - new column**
Given profile A has columns [id, name, email]
And profile B has columns [id, name, email, phone]
When I view the diff
Then "phone" is shown as "Added" with green indicator
And schema diff summary shows "+1 column"

**Scenario: Schema drift - removed column**
Given profile A has columns [id, name, email, legacy_field]
And profile B has columns [id, name, email]
When I view the diff
Then "legacy_field" is shown as "Removed" with red indicator

**Scenario: Type change**
Given profile A has column "price" with type "String"
And profile B has column "price" with type "Numeric"
When I view the diff
Then "price" shows type change "String → Numeric"

**Scenario: Statistical drift**
Given profile A has column "amount" with mean=100
And profile B has column "amount" with mean=150
When I view the diff with drift threshold 20%
Then "amount" is flagged with "Mean shifted +50%"

**Scenario: Quality degradation**
Given profile A has column "email" with 99% completeness
And profile B has column "email" with 85% completeness
When I view the diff
Then "email" shows "Completeness: 99% → 85% (-14%)" in red

**Scenario: Export diff**
Given a computed diff between two profiles
When I click "Export Diff"
Then a Markdown report is generated with all changes listed

## 4. AI Execution Instructions (Required)

**Allowed to Change:**
- Create `src/app/components/ProfileDiff.tsx`
- Create `src/app/utils/computeDiff.ts`
- Add diff route to `src/app/App.tsx`
- Modify ProfileReport to add "Compare" button

**Must NOT Change:**
- Existing profile computation logic
- Profile data structures (additive only)
- Other export formats

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- feat(diff): add profile comparison utility
- feat(diff): add schema drift detection
- feat(diff): add statistical drift thresholds
- feat(diff): add ProfileDiff component
- feat(diff): add diff export to Markdown

## 6. Verification & Definition of Done (Required)

- [ ] Can upload two files and see diff
- [ ] New/removed columns clearly indicated
- [ ] Type changes highlighted
- [ ] Statistical drift flagged with threshold
- [ ] Quality changes shown (completeness, uniqueness)
- [ ] Diff exportable to Markdown
- [ ] Works with profiles from different file formats
- [ ] UI is responsive and clear

## 7. Technical Design

### Diff Data Structure

```typescript
interface ProfileDiff {
  summary: {
    columnsAdded: number;
    columnsRemoved: number;
    columnsChanged: number;
    schemaCompatible: boolean;
  };
  columns: ColumnDiff[];
}

interface ColumnDiff {
  name: string;
  status: 'added' | 'removed' | 'unchanged' | 'changed';
  changes: {
    type?: { from: string; to: string };
    completeness?: { from: number; to: number; delta: number };
    distinctCount?: { from: number; to: number; delta: number };
    mean?: { from: number; to: number; deltaPct: number };
    min?: { from: number; to: number };
    max?: { from: number; to: number };
  };
  driftFlags: string[]; // ["Mean shifted +50%", "Type changed"]
}
```

### Drift Thresholds (Configurable)

```typescript
const DEFAULT_THRESHOLDS = {
  meanDriftPct: 20,        // Flag if mean changes >20%
  stdDevDriftPct: 30,      // Flag if std dev changes >30%
  completenessDrop: 5,     // Flag if completeness drops >5%
  distinctCountDriftPct: 20 // Flag if cardinality changes >20%
};
```

## 8. Resources

- [Data Drift Detection](https://docs.evidentlyai.com/reference/data-drift-algorithm)
- [Schema Evolution Best Practices](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
