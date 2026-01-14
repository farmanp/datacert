import { describe, it, expect } from 'vitest';
import {
  generateGXSuite,
  generateGXSuiteJSON,
  getExpectationSummary,
  GXSuite,
} from './exportGreatExpectations';
import { ProfileResult, ColumnProfile } from '../stores/profileStore';

// Helper to create a minimal column profile
function createColumnProfile(overrides: Partial<ColumnProfile> = {}): ColumnProfile {
  return {
    name: 'test_column',
    base_stats: {
      count: 100,
      missing: 0,
      distinct_estimate: 100,
      inferred_type: 'String',
    },
    numeric_stats: null,
    categorical_stats: null,
    histogram: null,
    min_length: null,
    max_length: null,
    notes: [],
    sample_values: [],
    missing_rows: [],
    pii_rows: [],
    outlier_rows: [],
    ...overrides,
  };
}

// Helper to create a minimal profile result
function createProfileResult(columns: Partial<ColumnProfile>[] = []): ProfileResult {
  return {
    total_rows: 100,
    column_profiles: columns.map((col, idx) =>
      createColumnProfile({ name: `column_${idx}`, ...col })
    ),
  };
}

describe('exportGreatExpectations', () => {
  describe('generateGXSuite', () => {
    it('should generate a valid GX suite structure', () => {
      const results = createProfileResult([{}]);
      const suite = generateGXSuite(results, 'test.csv');

      expect(suite.expectation_suite_name).toBe('datalens_generated_suite');
      expect(suite.meta.generated_by).toBe('DataLens Profiler');
      expect(suite.meta.source_file).toBe('test.csv');
      expect(suite.meta.tolerance).toBe(0.1);
      expect(suite.expectations).toBeInstanceOf(Array);
      expect(suite.ge_cloud_id).toBeNull();
    });

    it('should include column existence expectations', () => {
      const results = createProfileResult([{ name: 'user_id' }]);
      const suite = generateGXSuite(results, 'test.csv');

      const existExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_to_exist' &&
             e.kwargs.column === 'user_id'
      );
      expect(existExp).toBeDefined();
    });

    it('should include type expectations for typed columns', () => {
      const results = createProfileResult([
        { name: 'int_col', base_stats: { count: 100, missing: 0, distinct_estimate: 50, inferred_type: 'Integer' } },
        { name: 'num_col', base_stats: { count: 100, missing: 0, distinct_estimate: 90, inferred_type: 'Numeric' } },
        { name: 'str_col', base_stats: { count: 100, missing: 0, distinct_estimate: 80, inferred_type: 'String' } },
        { name: 'bool_col', base_stats: { count: 100, missing: 0, distinct_estimate: 2, inferred_type: 'Boolean' } },
      ]);
      const suite = generateGXSuite(results, 'test.csv');

      const typeExps = suite.expectations.filter(
        e => e.expectation_type === 'expect_column_values_to_be_of_type'
      );

      expect(typeExps.find(e => e.kwargs.column === 'int_col' && e.kwargs.type_ === 'INTEGER')).toBeDefined();
      expect(typeExps.find(e => e.kwargs.column === 'num_col' && e.kwargs.type_ === 'FLOAT')).toBeDefined();
      expect(typeExps.find(e => e.kwargs.column === 'str_col' && e.kwargs.type_ === 'STRING')).toBeDefined();
      expect(typeExps.find(e => e.kwargs.column === 'bool_col' && e.kwargs.type_ === 'BOOLEAN')).toBeDefined();
    });

    it('should skip type expectations for Mixed type', () => {
      const results = createProfileResult([
        { name: 'mixed_col', base_stats: { count: 100, missing: 0, distinct_estimate: 50, inferred_type: 'Mixed' } },
      ]);
      const suite = generateGXSuite(results, 'test.csv');

      const typeExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_values_to_be_of_type' &&
             e.kwargs.column === 'mixed_col'
      );
      expect(typeExp).toBeUndefined();
    });

    it('should skip Empty columns entirely', () => {
      const results = createProfileResult([
        { name: 'empty_col', base_stats: { count: 100, missing: 100, distinct_estimate: 0, inferred_type: 'Empty' } },
      ]);
      const suite = generateGXSuite(results, 'test.csv');

      const colExps = suite.expectations.filter(e => e.kwargs.column === 'empty_col');
      expect(colExps.length).toBe(0);
    });

    it('should include null expectations with mostly parameter', () => {
      const results = createProfileResult([
        { name: 'col_with_nulls', base_stats: { count: 100, missing: 5, distinct_estimate: 90, inferred_type: 'String' } },
      ]);
      const suite = generateGXSuite(results, 'test.csv');

      const nullExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_values_to_not_be_null' &&
             e.kwargs.column === 'col_with_nulls'
      );
      expect(nullExp).toBeDefined();
      // 5% nulls + 10% tolerance = 5.5% allowed nulls, so mostly = 0.945
      expect(nullExp?.kwargs.mostly).toBeLessThan(1);
      expect(nullExp?.kwargs.mostly).toBeGreaterThan(0.9);
    });

    it('should apply tolerance to numeric bounds', () => {
      const results = createProfileResult([
        {
          name: 'amount',
          base_stats: { count: 100, missing: 0, distinct_estimate: 100, inferred_type: 'Numeric' },
          numeric_stats: {
            min: 100,
            max: 1000,
            mean: 500,
            sum: 50000,
            count: 100,
            std_dev: 100,
            variance: 10000,
            skewness: 0,
            kurtosis: 0,
            median: 500,
            p25: 300,
            p75: 700,
            p90: 800,
            p95: 900,
            p99: 950,
          },
        },
      ]);

      // 10% tolerance (default)
      const suite = generateGXSuite(results, 'test.csv');

      const rangeExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_values_to_be_between' &&
             e.kwargs.column === 'amount'
      );
      expect(rangeExp).toBeDefined();
      // min=100 with 10% tolerance = 90
      expect(rangeExp?.kwargs.min_value).toBe(90);
      // max=1000 with 10% tolerance = 1100
      expect(rangeExp?.kwargs.max_value).toBe(1100);
    });

    it('should include uniqueness expectation for 100% unique columns', () => {
      const results = createProfileResult([
        {
          name: 'id',
          base_stats: { count: 100, missing: 0, distinct_estimate: 100, inferred_type: 'Integer' },
        },
      ]);
      const suite = generateGXSuite(results, 'test.csv');

      const uniqueExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_values_to_be_unique' &&
             e.kwargs.column === 'id'
      );
      expect(uniqueExp).toBeDefined();
    });

    it('should not include uniqueness expectation for non-unique columns', () => {
      const results = createProfileResult([
        {
          name: 'status',
          base_stats: { count: 100, missing: 0, distinct_estimate: 5, inferred_type: 'String' },
        },
      ]);
      const suite = generateGXSuite(results, 'test.csv');

      const uniqueExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_values_to_be_unique' &&
             e.kwargs.column === 'status'
      );
      expect(uniqueExp).toBeUndefined();
    });

    it('should include boolean value set expectation', () => {
      const results = createProfileResult([
        {
          name: 'is_active',
          base_stats: { count: 100, missing: 0, distinct_estimate: 2, inferred_type: 'Boolean' },
        },
      ]);
      const suite = generateGXSuite(results, 'test.csv');

      const boolExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_values_to_be_in_set' &&
             e.kwargs.column === 'is_active'
      );
      expect(boolExp).toBeDefined();
      expect(boolExp?.kwargs.value_set).toContain(true);
      expect(boolExp?.kwargs.value_set).toContain(false);
    });

    it('should include table-level row count expectation', () => {
      const results = createProfileResult([{}]);
      results.total_rows = 1000;

      const suite = generateGXSuite(results, 'test.csv');

      const rowCountExp = suite.expectations.find(
        e => e.expectation_type === 'expect_table_row_count_to_be_between'
      );
      expect(rowCountExp).toBeDefined();
      // 1000 rows with 10% tolerance = 900-1100
      expect(rowCountExp?.kwargs.min_value).toBe(900);
      expect(rowCountExp?.kwargs.max_value).toBe(1100);
    });

    it('should include column count expectation', () => {
      const results = createProfileResult([{}, {}, {}]);

      const suite = generateGXSuite(results, 'test.csv');

      const colCountExp = suite.expectations.find(
        e => e.expectation_type === 'expect_table_column_count_to_equal'
      );
      expect(colCountExp).toBeDefined();
      expect(colCountExp?.kwargs.value).toBe(3);
    });

    it('should respect custom suite name option', () => {
      const results = createProfileResult([{}]);
      const suite = generateGXSuite(results, 'test.csv', {
        suiteName: 'my_custom_suite',
      });

      expect(suite.expectation_suite_name).toBe('my_custom_suite');
    });

    it('should respect custom tolerance option', () => {
      const results = createProfileResult([
        {
          name: 'amount',
          base_stats: { count: 100, missing: 0, distinct_estimate: 100, inferred_type: 'Numeric' },
          numeric_stats: {
            min: 100,
            max: 1000,
            mean: 500,
            sum: 50000,
            count: 100,
            std_dev: 100,
            variance: 10000,
            skewness: 0,
            kurtosis: 0,
            median: 500,
            p25: 300,
            p75: 700,
            p90: 800,
            p95: 900,
            p99: 950,
          },
        },
      ]);

      const suite = generateGXSuite(results, 'test.csv', { tolerance: 0.05 });

      expect(suite.meta.tolerance).toBe(0.05);

      const rangeExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_values_to_be_between'
      );
      // min=100 with 5% tolerance = 95
      expect(rangeExp?.kwargs.min_value).toBe(95);
      // max=1000 with 5% tolerance = 1050
      expect(rangeExp?.kwargs.max_value).toBe(1050);
    });

    it('should include distinct values expectation for low-cardinality string columns', () => {
      const results = createProfileResult([
        {
          name: 'status',
          base_stats: { count: 100, missing: 0, distinct_estimate: 3, inferred_type: 'String' },
          categorical_stats: {
            top_values: [
              { value: 'active', count: 60, percentage: 60 },
              { value: 'pending', count: 30, percentage: 30 },
              { value: 'inactive', count: 10, percentage: 10 },
            ],
            unique_count: 3,
          },
        },
      ]);

      const suite = generateGXSuite(results, 'test.csv');

      const distinctExp = suite.expectations.find(
        e => e.expectation_type === 'expect_column_distinct_values_to_be_in_set' &&
             e.kwargs.column === 'status'
      );
      expect(distinctExp).toBeDefined();
      expect(distinctExp?.kwargs.value_set).toContain('active');
      expect(distinctExp?.kwargs.value_set).toContain('pending');
      expect(distinctExp?.kwargs.value_set).toContain('inactive');
    });
  });

  describe('generateGXSuiteJSON', () => {
    it('should return valid JSON string', () => {
      const results = createProfileResult([{}]);
      const json = generateGXSuiteJSON(results, 'test.csv');

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should be properly formatted with indentation', () => {
      const results = createProfileResult([{}]);
      const json = generateGXSuiteJSON(results, 'test.csv');

      expect(json).toContain('\n');
      expect(json).toContain('  '); // 2-space indentation
    });

    it('should produce the same structure as generateGXSuite', () => {
      const results = createProfileResult([{}]);
      const suite = generateGXSuite(results, 'test.csv');
      const jsonSuite: GXSuite = JSON.parse(generateGXSuiteJSON(results, 'test.csv'));

      expect(jsonSuite.expectation_suite_name).toBe(suite.expectation_suite_name);
      expect(jsonSuite.expectations.length).toBe(suite.expectations.length);
    });
  });

  describe('getExpectationSummary', () => {
    it('should return correct total expectation count', () => {
      const results = createProfileResult([
        { name: 'col1' },
        { name: 'col2' },
      ]);

      const summary = getExpectationSummary(results);

      expect(summary.totalExpectations).toBeGreaterThan(0);
    });

    it('should count expectations by type', () => {
      const results = createProfileResult([
        { name: 'col1' },
        { name: 'col2' },
      ]);

      const summary = getExpectationSummary(results);

      expect(summary.byType['expect_column_to_exist']).toBe(2);
      expect(summary.byType['expect_table_column_count_to_equal']).toBe(1);
    });

    it('should track columns included vs skipped', () => {
      const results = createProfileResult([
        { name: 'valid_col', base_stats: { count: 100, missing: 0, distinct_estimate: 50, inferred_type: 'String' } },
        { name: 'empty_col', base_stats: { count: 100, missing: 100, distinct_estimate: 0, inferred_type: 'Empty' } },
      ]);

      const summary = getExpectationSummary(results);

      expect(summary.columnsIncluded).toBe(1);
      expect(summary.columnsSkipped).toContain('empty_col');
    });
  });
});
