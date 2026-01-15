# INFRA-006: Store Consolidation

## 1. Technical Intent (Required)
We need to improve **store architecture simplicity**
In order to **reduce maintenance burden, simplify data flow, and decrease cognitive load for contributors**

## 2. Problem Statement (Required)
**Current State:**
- 8 separate SolidJS stores managing application state
- Some stores have overlapping responsibilities
- `drilldownStore` is essentially a view into `profileStore` results
- `validationStore` operates on profile results
- Data flows between stores can be hard to trace

**Pain Points:**
- New contributors must understand 8 different state containers
- Some stores are only used by 1-2 components
- `profileStore.ts` is already 950+ lines; related functionality split elsewhere
- Testing requires mocking multiple stores

**Current stores (8):**
1. `fileStore` - File selection, validation
2. `profileStore` - Profiling state, results (950 lines)
3. `sqlStore` - DuckDB, SQL queries
4. `treeStore` - Tree Mode analysis
5. `comparisonStore` - Dual-file comparison
6. `batchStore` - Multi-file processing
7. `validationStore` - Schema validation
8. `drilldownStore` - Anomaly row inspection

## 3. Acceptance Criteria (Outcome-Focused) (Required)
- [ ] `drilldownStore` merged into `profileStore`
- [ ] `validationStore` merged into `profileStore`
- [ ] Store count reduced from 8 to 6 (or fewer based on SPIKE-008 findings)
- [ ] All existing functionality preserved
- [ ] All tests pass
- [ ] No change in user-visible behavior
- [ ] Type exports maintained for backwards compatibility

## 4. Scope & Safety Boundaries (Required)
**In Scope:**
- `src/app/stores/profileStore.ts`
- `src/app/stores/drilldownStore.ts` (merge and delete)
- `src/app/stores/validationStore.ts` (merge and delete)
- Components that import merged stores (update imports)
- Type exports

**Out of Scope:**
- `fileStore`, `sqlStore` - core and independent
- `treeStore` - depends on Tree Mode decision
- `comparisonStore`, `batchStore` - depends on feature decisions
- UI changes
- New functionality

**Risk Level:** Medium
- Risk of breaking existing functionality
- Risk of introducing subtle state bugs
- Mitigation: Comprehensive testing, staged rollout

## 5. AI Execution Instructions (Required)
**Allowed to Change:**
- Store files listed in scope
- Component imports
- Test files

**Must NOT Change:**
- Public API of profileStore (additive only)
- Component behavior
- Route structure

**Ambiguity Rule:**
Preserve existing behavior over elegance. When in doubt, keep separate.

## 6. Planned Git Commit Message(s) (Required)
- `refactor(stores): merge drilldownStore into profileStore`
- `refactor(stores): merge validationStore into profileStore`
- `chore(stores): remove deprecated store files`

## 7. Verification / Definition of Done (Required)
- [ ] Acceptance outcomes met
- [ ] No behavior change verified (manual testing)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript compiles without errors
- [ ] Drilldown functionality works
- [ ] Validation functionality works
- [ ] Store count reduced as specified

## Dependencies
- **Blocked by:** SPIKE-008 (Store Usage Audit) - need findings first
- **Related:** FEAT-036 (More Tools Navigation)

## References
- [Simplification Notes](../docs/SIMPLIFICATION_NOTES.md)
