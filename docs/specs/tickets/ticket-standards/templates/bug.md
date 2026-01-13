# AI-Ready Bug Ticket Template

## 1. Bug Summary (Required)
[Component]: [Observed behavior] instead of [Expected behavior]

## 2. Expected vs Actual (Required)
**Expected:**
[What should happen]

**Actual:**
[What actually happens]

## 3. Reproduction Steps (Required)
*Format: Gherkin*

**Scenario: [Bug Scenario]**
Given [initial state]
When [action]
Then [unexpected behavior occurs]

## 4. Impact & Severity (Required)
**Severity:** [Blocker / High / Medium / Low]
**Impact:** [Who is affected?]

## 5. AI Execution Instructions (Required)
**May Change:**
- [Validation logic / Error handling / UI messaging]

**Must NOT Change:**
- [Existing behavior outside bug scope]

## 6. Planned Git Commit Message (Required)
*Example: fix(checkout): return validation error for expired card*

- [commit message]

## 7. Verification / Definition of Done (Required)
- [ ] Bug is no longer reproducible
- [ ] New test covers failure case
- [ ] No regression in related flows
