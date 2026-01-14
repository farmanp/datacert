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

### Sprint 6 (Data Quality Export)
20. SPIKE-006 - Research Great Expectations Suite Format
21. SPIKE-007 - Research Soda Checks YAML Format
22. FEAT-021 - Export to Great Expectations Suite
23. FEAT-022 - Export to JSON Schema
24. FEAT-023 - Export to Soda Checks YAML
25. FEAT-024 - Export Format Selector UI

### Sprint 7 (Data Quality Validation)
26. FEAT-025 - Import Great Expectations Suite for Validation
27. FEAT-026 - Import Soda Checks for Validation
28. FEAT-027 - Import JSON Schema for Validation

### Phase 4: Cloud & Database Integration Research

| ID | Type | Title | Priority | Dependencies |
|----|------|-------|----------|--------------|
| SPIKE-002 | Spike | Cloud Storage Feasibility | P2 | None |
| SPIKE-003 | Spike | GCS Integration Design | P2 | SPIKE-002 |
| FEAT-015 | Story | GCS Integration | P2 | SPIKE-002, SPIKE-003 |
| SPIKE-004 | Spike | Database Warehouse Feasibility | P2 | None |
| SPIKE-005 | Spike | DuckDB-WASM Feasibility | P2 | None |

### Phase 5: User Experience & Format Expansion

| ID | Type | Title | Priority | Dependencies |
|----|------|-------|----------|--------------|
| FEAT-016 | Story | Anomaly Drill-Down | P1 | FEAT-006 |
| FEAT-017 | Story | Excel (.xlsx/.xls) Support | P1 | FEAT-001 |
| FEAT-018 | Story | Apache Avro Support | P1 | FEAT-001 |
| FEAT-019 | Story | Markdown Export (Copy to Clipboard) | P1 | FEAT-010 |
| FEAT-020 | Story | DuckDB SQL Mode | P1 | SPIKE-005 |

### Phase 6: Data Quality Framework Integration

| ID | Type | Title | Priority | Dependencies |
|----|------|-------|----------|--------------|
| SPIKE-006 | Spike | Research Great Expectations Suite Format | P0 | None |
| SPIKE-007 | Spike | Research Soda Checks YAML Format | P0 | None |
| FEAT-021 | Story | Export to Great Expectations Suite | P1 | SPIKE-006 |
| FEAT-022 | Story | Export to JSON Schema | P1 | None |
| FEAT-023 | Story | Export to Soda Checks YAML | P1 | SPIKE-007 |
| FEAT-024 | Story | Export Format Selector UI | P1 | FEAT-021, FEAT-022, FEAT-023 |
| FEAT-025 | Story | Import Great Expectations Suite for Validation | P2 | SPIKE-006 |
| FEAT-026 | Story | Import Soda Checks for Validation | P2 | SPIKE-007, FEAT-025 |
| FEAT-027 | Story | Import JSON Schema for Validation | P2 | FEAT-025 |

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
