# SPIKE-007: Research Soda Checks YAML Format

## 1. Research Question (Required)

**Question:**
What is the SodaCL YAML syntax, and which checks can we generate from DataLens ProfileResult data?

**Context:**
DataLens users want to export their profiling results as Soda Checks YAML to integrate with existing Soda Core validation pipelines. We need to understand the SodaCL syntax to generate valid, runnable checks.

## 2. Scope & Timebox

**Timebox:** 2-4 hours

**In Scope:**
- SodaCL YAML syntax and structure
- Built-in metrics and check types
- Mapping DataLens metrics to Soda checks
- Example checks.yml generation

**Out of Scope:**
- Custom SQL checks
- Soda Cloud integration
- Soda Agent configuration
- Programmatic check generation via Python

## 3. Success Criteria (Required)

**Deliverables:**
- [ ] Document SodaCL YAML structure
- [ ] Create mapping table: DataLens metrics → Soda checks
- [ ] Identify checks we cannot support and why
- [ ] Produce example checks.yml file
- [ ] Document threshold/warn/fail configuration

## 4. Research Plan

1. Review Soda SodaCL documentation
2. Understand check syntax for common validations:
   - `missing_count` / `missing_percent`
   - `duplicate_count` / `duplicate_percent`
   - `invalid_count` for type validation
   - `min` / `max` / `avg` for numeric columns
   - `distinct` for cardinality checks
3. Map DataLens ProfileResult fields to SodaCL checks
4. Draft example YAML output
5. Document warn vs fail threshold patterns

## 5. Findings

[To be filled after research]

**DataLens → Soda Check Mapping:**

| DataLens Metric | Soda Check | Notes |
|-----------------|------------|-------|
| nullPercentage | `missing_percent < X` | Direct percentage comparison |
| distinctCount | `duplicate_count = 0` | If distinctCount == totalRows |
| min / max | `min >= X`, `max <= X` | With tolerance applied |
| mean | `avg between (X, Y)` | With tolerance applied |
| inferredType | `invalid_count = 0` | Using valid_format |
| topValues | N/A | No direct equivalent |

**SodaCL Structure Example:**

```yaml
checks for dataset_name:
  - missing_count(column_name) = 0
  - duplicate_count(id_column) = 0
  - min(amount) >= 0
  - max(amount) <= 10000
  - avg(amount) between 100 and 500
```

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A: Fail-only thresholds | Simple, binary pass/fail | No warning before failure |
| B: Warn + Fail thresholds | Gradual alerting | More complex config |
| C: Percentage-based | Handles partial failures | May be too permissive |

**Recommendation:**
[To be filled after research]

## 6. Next Steps

- [ ] Create FEAT-023 with detailed implementation spec
- [ ] Define warn/fail threshold UI configuration
- [ ] Decide on dataset naming strategy

## 7. Resources

- [Soda SodaCL Documentation](https://docs.soda.io/soda-cl/soda-cl-overview.html)
- [SodaCL Metrics Reference](https://docs.soda.io/soda-cl/metrics-and-checks.html)
- [Soda Checks YAML Examples](https://docs.soda.io/soda-cl/check-types.html)
