# SPIKE-006: Research Great Expectations Suite Format

## 1. Research Question (Required)

**Question:**
What is the exact JSON structure of a Great Expectations Expectation Suite, and which expectations can we reliably generate from DataLens ProfileResult data?

**Context:**
DataLens users want to export their profiling results as Great Expectations suites to integrate with existing GX validation pipelines. We need to understand the exact format to generate valid, importable suites.

## 2. Scope & Timebox

**Timebox:** 2-4 hours

**In Scope:**
- GX Suite JSON schema structure (GX 1.x)
- Common expectation types and their kwargs
- Mapping DataLens metrics to GX expectations
- Example suite generation

**Out of Scope:**
- Custom expectation development
- GX Cloud integration
- GX Data Docs generation
- Python GX runtime integration

## 3. Success Criteria (Required)

**Deliverables:**
- [ ] Document GX Suite JSON structure with all required fields
- [ ] Create mapping table: DataLens metrics → GX expectations
- [ ] Identify expectations we cannot support and why
- [ ] Produce example output JSON file
- [ ] Document tolerance/threshold configuration approach

## 4. Research Plan

1. Review GX 1.x documentation for Expectation Suite JSON format
2. Create sample suite manually using GX Python to understand structure
3. Document all relevant expectation types for profiling:
   - `expect_column_values_to_not_be_null`
   - `expect_column_values_to_be_of_type`
   - `expect_column_values_to_be_between`
   - `expect_column_values_to_be_unique`
   - `expect_column_value_lengths_to_be_between`
   - `expect_column_distinct_values_to_be_in_set`
4. Map DataLens ProfileResult fields to expectation kwargs
5. Draft example export function signature

## 5. Findings

[To be filled after research]

**DataLens → GX Expectation Mapping:**

| DataLens Metric | GX Expectation | Notes |
|-----------------|----------------|-------|
| nullCount / totalRows | `expect_column_values_to_not_be_null` | Use `mostly` param with tolerance |
| inferredType | `expect_column_values_to_be_of_type` | Map DataLens types to GX types |
| min / max | `expect_column_values_to_be_between` | Apply tolerance to bounds |
| distinctCount == totalRows | `expect_column_values_to_be_unique` | Only if 100% unique |
| mean / stdDev | N/A | GX doesn't have direct mean expectations |
| topValues | `expect_column_distinct_values_to_be_in_set` | Use top N values |

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A: Strict bounds | Exact replication of profile | May fail on normal variance |
| B: Tolerance-based | Allows for expected variance | User must configure tolerance |
| C: Statistical bounds | Uses stdDev for natural bounds | Complex, may be too permissive |

**Recommendation:**
[To be filled after research]

## 6. Next Steps

- [ ] Create FEAT-021 with detailed implementation spec
- [ ] Define tolerance configuration UI requirements
- [ ] Decide on default tolerance values

## 7. Resources

- [Great Expectations Docs - Expectation Suites](https://docs.greatexpectations.io/docs/0.18/reference/learn/terms/expectation_suite/)
- [GX Core Expectations Reference](https://greatexpectations.io/expectations/)
- [GX Suite JSON Schema](https://github.com/great-expectations/great_expectations)
