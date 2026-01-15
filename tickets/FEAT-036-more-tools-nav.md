# FEAT-036: "More Tools" Navigation Pattern

## 1. Intent (Required)
**User Story:**
As a **new user**
I want **a simplified navigation with core features prominent**
So that **I can quickly understand and use DataCert without being overwhelmed by options**

**Success Looks Like:**
Primary navigation shows only Home and SQL Mode, with power-user features accessible via a "More Tools" dropdown or secondary navigation.

## 2. Context & Constraints (Required)
**Background:**
Current navigation shows 5 modes equally (Home, SQL, Tree, Compare, Batch). This creates cognitive load for new users who just want to drop a file and see results. Profile + SQL Mode are the core features; others are power-user tools.

**Scope:**
- **In Scope:**
  - Restructure navigation to highlight core features
  - Create "More Tools" dropdown or collapsible section
  - Move Compare, Batch, Tree Mode to secondary prominence
- **Out of Scope:**
  - Removing any features
  - Changing feature functionality
  - Mobile-specific navigation (follow-up ticket)

**Constraints:**
- Must not break existing URLs/routes
- Power-user features must still be accessible (not hidden completely)
- Should respect feature flags (INFRA-005) if implemented

## 3. Acceptance Criteria (Required)
**Scenario: New user visits DataCert**
Given I am on the home page
And I am a first-time visitor
When I look at the navigation
Then I see "Home" and "SQL Mode" prominently
And I see a "More Tools" option that reveals Compare, Batch, Tree Mode

**Scenario: Power user accesses advanced features**
Given I am on any page
When I click "More Tools"
Then I see Compare, Batch, and Tree Mode options
And I can navigate to any of them

**Scenario: Direct URL access still works**
Given I have a bookmark to /compare
When I navigate to that URL directly
Then Compare mode loads normally
And the navigation reflects my current location

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/App.tsx` - navigation structure
- `src/app/components/` - create Navigation component if needed
- `src/app/pages/Home.tsx` - navigation rendering
- Tailwind styles for dropdown/menu

**Must NOT Change:**
- Route paths (keep /compare, /batch, /tree-mode)
- Feature functionality
- Store interfaces

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- `feat(ui): add More Tools navigation pattern`
- `refactor(nav): restructure navigation hierarchy`

## 6. Verification & Definition of Done (Required)
- [ ] Primary nav shows Home + SQL Mode prominently
- [ ] "More Tools" reveals Compare, Batch, Tree Mode
- [ ] All routes still work via direct URL
- [ ] Acceptance criteria pass
- [ ] Tests written and passing
- [ ] No breaking changes
- [ ] Responsive on desktop (mobile follow-up)

## 7. Resources
- [Simplification Notes](../docs/SIMPLIFICATION_NOTES.md)
- Depends on: INFRA-005 (Feature Flags) - optional integration
