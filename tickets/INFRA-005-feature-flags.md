# INFRA-005: Feature Flags Infrastructure

## 1. Technical Intent (Required)
We need to improve **feature visibility control**
In order to **gradually roll out features, A/B test, and hide power-user features from the core UX**

## 2. Problem Statement (Required)
**Current State:**
- All features are always visible to all users
- No way to hide experimental or power-user features
- Can't do gradual rollouts or A/B testing
- Feature sprawl makes the UI feel complex for new users

**Pain Points:**
- Compare, Batch, Tree Mode visible in nav even though Profile + SQL Mode are core
- Export formats all shown equally (GE, Soda, JSON Schema)
- No way to test new features with subset of users

## 3. Acceptance Criteria (Outcome-Focused) (Required)
- [ ] Feature flag system implemented with simple API: `isFeatureEnabled('tree-mode')`
- [ ] Flags can be configured via localStorage (for dev/testing)
- [ ] Flags can be configured via URL params (for demos/sharing)
- [ ] Default flag values defined in config file
- [ ] At least 3 features gated behind flags: Tree Mode, Batch Mode, Compare Mode
- [ ] No change in user-visible behavior for users with default flags

## 4. Scope & Safety Boundaries (Required)
**In Scope:**
- `src/app/utils/featureFlags.ts` - new file
- `src/app/App.tsx` - conditional routing
- `src/app/components/` - conditional rendering where needed
- Configuration file for default flags

**Out of Scope:**
- Server-side flag management
- User accounts / persistent preferences
- Analytics integration
- A/B testing framework (just the flag infrastructure)

**Risk Level:** Low

## 5. AI Execution Instructions (Required)
**Allowed to Change:**
- Create new utility file for feature flags
- Modify App.tsx routing
- Modify navigation components
- Add feature flag checks to pages

**Must NOT Change:**
- Core profiling functionality
- Store interfaces
- WASM module

**Ambiguity Rule:**
Preserve existing behavior over elegance. All features should remain accessible via flags.

## 6. Planned Git Commit Message(s) (Required)
- `feat(infra): add feature flags infrastructure`
- `feat(ui): gate Tree/Batch/Compare modes behind feature flags`

## 7. Verification / Definition of Done (Required)
- [ ] Feature flag utility created and exported
- [ ] Tree Mode, Batch Mode, Compare Mode gated
- [ ] Default behavior unchanged (flags default to enabled for backwards compat)
- [ ] localStorage override works: `localStorage.setItem('ff_tree-mode', 'false')`
- [ ] URL param override works: `?ff_tree-mode=false`
- [ ] Tests still pass
- [ ] No TypeScript errors

## References
- [Simplification Notes](../docs/SIMPLIFICATION_NOTES.md)
- Related: FEAT-036 (More Tools Navigation)
