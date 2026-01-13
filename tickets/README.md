# DataLens Profiler - Development Tickets

This directory contains the implementation tickets for DataLens Profiler, a browser-based data profiling PWA.

## Ticket Index

### Phase 1: Foundation (MVP Core)

| ID | Type | Title | Priority | Dependencies |
|----|------|-------|----------|--------------|
| INFRA-001 | Infra | Project Scaffold | P0 | None |
| SPIKE-001 | Spike | Streaming Architecture Research | P0 | INFRA-001 |
| FEAT-001 | Story | CSV Streaming Parser | P0 | INFRA-001, SPIKE-001 |
| FEAT-002 | Story | Basic Statistics Engine | P0 | FEAT-001 |
| FEAT-003 | Story | File Dropzone UI | P0 | INFRA-001 |
| FEAT-004 | Story | Results Table UI | P0 | FEAT-002, FEAT-003 |
| INFRA-002 | Infra | PWA Setup | P0 | INFRA-001 |
| INFRA-003 | Infra | Web Worker Pool | P1 | INFRA-001 |

### Phase 2: Core Features

| ID | Type | Title | Priority | Dependencies |
|----|------|-------|----------|--------------|
| FEAT-005 | Story | Complete Statistics Suite | P0 | FEAT-002 |
| FEAT-006 | Story | Quality Metrics Engine | P0 | FEAT-002 |
| FEAT-007 | Story | Column Cards UI | P1 | FEAT-005, FEAT-006 |
| FEAT-008 | Story | Histogram Visualization | P1 | FEAT-005 |
| FEAT-009 | Story | JSON Parser | P1 | FEAT-001 |
| FEAT-010 | Story | HTML Report Export | P0 | FEAT-005, FEAT-006, FEAT-008 |
| FEAT-011 | Story | JSON Export | P1 | FEAT-005, FEAT-006 |

### Phase 3: Polish & Extend

| ID | Type | Title | Priority | Dependencies |
|----|------|-------|----------|--------------|
| FEAT-012 | Story | Parquet Support | P1 | FEAT-001 |
| FEAT-013 | Story | Comparison Mode | P1 | FEAT-005, FEAT-006 |
| FEAT-014 | Story | Correlation Matrix | P2 | FEAT-005 |
| INFRA-004 | Infra | Test Suite | P1 | All FEAT tickets |

## Recommended Implementation Order

### Sprint 1 (Foundation)
1. INFRA-001 - Project Scaffold
2. SPIKE-001 - Streaming Architecture Research
3. FEAT-001 - CSV Streaming Parser
4. FEAT-003 - File Dropzone UI

### Sprint 2 (Basic Profiling)
5. FEAT-002 - Basic Statistics Engine
6. FEAT-004 - Results Table UI
7. INFRA-002 - PWA Setup
8. INFRA-003 - Web Worker Pool

### Sprint 3 (Advanced Stats)
9. FEAT-005 - Complete Statistics Suite
10. FEAT-006 - Quality Metrics Engine
11. FEAT-008 - Histogram Visualization

### Sprint 4 (UI Polish)
12. FEAT-007 - Column Cards UI
13. FEAT-009 - JSON Parser
14. FEAT-010 - HTML Report Export
15. FEAT-011 - JSON Export

### Sprint 5 (Extended Features)
16. FEAT-012 - Parquet Support
17. FEAT-013 - Comparison Mode
18. FEAT-014 - Correlation Matrix
19. INFRA-004 - Test Suite

## Priority Legend

- **P0**: Must have for MVP launch
- **P1**: Should have, high value
- **P2**: Nice to have, lower priority

## Ticket Format

All tickets follow AI-ready templates:
- **Story**: Feature work with acceptance criteria in Gherkin format
- **Infra**: Infrastructure and tooling work
- **Spike**: Research tasks with timeboxed investigation
- **Bug**: Bug fixes (none currently)

Each ticket includes:
- Clear intent and success criteria
- Scope boundaries (in/out of scope)
- Files allowed to change
- Planned commit messages
- Verification checklist
