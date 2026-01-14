import { describe, it, expect } from 'vitest';
import { validateJsonSchema, JsonSchema } from '../../../../src/app/utils/importJsonSchema';
import { ProfileResult, ColumnProfile } from '../../../../src/app/stores/profileStore';

describe('JSON Schema Validation', () => {
    // Mock Profile Result
    const mockProfile: ProfileResult = {
        total_rows: 100,
        column_profiles: [
            {
                name: 'id',
                base_stats: { count: 100, missing: 0, distinct_estimate: 100, inferred_type: 'Integer' },
                numeric_stats: { min: 1, max: 100, mean: 50.5, sum: 5050, count: 100, std_dev: 28, variance: 784, skewness: 0, kurtosis: 0, median: 50, p25: 25, p75: 75, p90: 90, p95: 95, p99: 99 },
                categorical_stats: null,
                histogram: null,
                min_length: null,
                max_length: null,
                notes: [],
                sample_values: [],
                missing_rows: [],
                pii_rows: [],
                outlier_rows: []
            },
            {
                name: 'name',
                base_stats: { count: 100, missing: 0, distinct_estimate: 90, inferred_type: 'String' },
                numeric_stats: null,
                categorical_stats: { top_values: [{value: 'Alice', count: 10, percentage: 10}], unique_count: 90 },
                histogram: null,
                min_length: 3,
                max_length: 20,
                notes: [],
                sample_values: ['Alice', 'Bob'],
                missing_rows: [],
                pii_rows: [],
                outlier_rows: []
            },
            {
                name: 'age',
                base_stats: { count: 95, missing: 5, distinct_estimate: 50, inferred_type: 'Integer' },
                numeric_stats: { min: 18, max: 99, mean: 40, sum: 3800, count: 95, std_dev: 15, variance: 225, skewness: 0, kurtosis: 0, median: 35, p25: 25, p75: 55, p90: 70, p95: 80, p99: 90 },
                categorical_stats: null,
                histogram: null,
                min_length: null,
                max_length: null,
                notes: [],
                sample_values: [],
                missing_rows: [],
                pii_rows: [],
                outlier_rows: []
            },
            {
                name: 'category',
                base_stats: { count: 100, missing: 0, distinct_estimate: 3, inferred_type: 'String' },
                numeric_stats: null,
                categorical_stats: { top_values: [{value: 'A', count: 50, percentage: 50}, {value: 'B', count: 30, percentage: 30}, {value: 'C', count: 20, percentage: 20}], unique_count: 3 },
                histogram: null,
                min_length: 1,
                max_length: 1,
                notes: [],
                sample_values: ['A', 'B', 'C'],
                missing_rows: [],
                pii_rows: [],
                outlier_rows: []
            }
        ]
    };

    it('should pass type validation for correct types', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                name: { type: 'string' }
            }
        };

        const results = validateJsonSchema(mockProfile, schema);
        const idResult = results.find(r => r.column === 'id');
        const nameResult = results.find(r => r.column === 'name');

        expect(idResult?.status).toBe('pass');
        expect(nameResult?.status).toBe('pass');
    });

    it('should fail type validation for incorrect types', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                id: { type: 'string' }, // Expect fail
                name: { type: 'integer' } // Expect fail
            }
        };

        const results = validateJsonSchema(mockProfile, schema);
        const idResult = results.find(r => r.column === 'id');
        const nameResult = results.find(r => r.column === 'name');

        expect(idResult?.status).toBe('fail');
        expect(idResult?.reason).toContain('Observed integer');
        
        expect(nameResult?.status).toBe('fail');
        expect(nameResult?.reason).toContain('Observed string');
    });

    it('should validate required fields', () => {
        const schema: JsonSchema = {
            type: 'object',
            required: ['id', 'missing_column'],
            properties: {
                id: { type: 'integer' }
            }
        };

        const results = validateJsonSchema(mockProfile, schema);
        
        const idReq = results.find(r => r.column === 'id' && r.expectationType === 'required');
        expect(idReq?.status).toBe('pass');

        const missingReq = results.find(r => r.column === 'missing_column' && r.expectationType === 'required');
        expect(missingReq?.status).toBe('fail');
        expect(missingReq?.reason).toBe('Required column not found');
    });

    it('should validate numeric minimum', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                age: { type: 'integer', minimum: 18 } // Pass (min is 18)
            }
        };

        const results = validateJsonSchema(mockProfile, schema);
        const ageMin = results.find(r => r.column === 'age' && r.expectationType === 'minimum');
        expect(ageMin?.status).toBe('pass');
        
        // Fail case
        const schemaFail: JsonSchema = {
            type: 'object',
            properties: {
                age: { type: 'integer', minimum: 20 } // Fail (min is 18)
            }
        };
        const resultsFail = validateJsonSchema(mockProfile, schemaFail);
        const ageMinFail = resultsFail.find(r => r.column === 'age' && r.expectationType === 'minimum');
        expect(ageMinFail?.status).toBe('fail');
    });

    it('should validate numeric maximum', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                age: { type: 'integer', maximum: 100 } // Pass (max is 99)
            }
        };

        const results = validateJsonSchema(mockProfile, schema);
        const ageMax = results.find(r => r.column === 'age' && r.expectationType === 'maximum');
        expect(ageMax?.status).toBe('pass');

        // Fail case
        const schemaFail: JsonSchema = {
            type: 'object',
            properties: {
                age: { type: 'integer', maximum: 90 } // Fail (max is 99)
            }
        };
        const resultsFail = validateJsonSchema(mockProfile, schemaFail);
        const ageMaxFail = resultsFail.find(r => r.column === 'age' && r.expectationType === 'maximum');
        expect(ageMaxFail?.status).toBe('fail');
    });

    it('should validate enum values (categorical)', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                category: { enum: ['A', 'B', 'C'] }
            }
        };

        const results = validateJsonSchema(mockProfile, schema);
        const catEnum = results.find(r => r.column === 'category' && r.expectationType === 'enum');
        expect(catEnum?.status).toBe('pass');

        // Fail case
        const schemaFail: JsonSchema = {
            type: 'object',
            properties: {
                category: { enum: ['A', 'B'] } // Fail, 'C' is present
            }
        };
        const resultsFail = validateJsonSchema(mockProfile, schemaFail);
        const catEnumFail = resultsFail.find(r => r.column === 'category' && r.expectationType === 'enum');
        expect(catEnumFail?.status).toBe('fail');
    });
    
    it('should handle array schema wrapper', () => {
        const schema: JsonSchema = {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        };
        
        const results = validateJsonSchema(mockProfile, schema);
        expect(results).toHaveLength(1);
        expect(results[0].status).toBe('pass');
    });
});
