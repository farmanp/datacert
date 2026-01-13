import { describe, it, expect } from 'vitest';
import { generateCSVReport, generateJSONReport } from '../../../../src/app/utils/exportReport';
import { ProfileResult } from '../../../../src/app/stores/profileStore';

describe('exportReport Utils', () => {
    const mockProfileResult: ProfileResult = {
        total_rows: 100,
        column_profiles: [
            {
                name: 'age',
                base_stats: {
                    count: 100,
                    missing: 0,
                    distinct_estimate: 50,
                    inferred_type: 'number',
                },
                numeric_stats: {
                    min: 18,
                    max: 80,
                    mean: 45.5,
                    median: 45,
                    std_dev: 10.5,
                    variance: 110.25,
                    skewness: 0.1,
                    kurtosis: -0.5,
                    sum: 4550,
                    p25: 30,
                    p75: 60,
                    p90: 70,
                    p95: 75,
                    p99: 79,
                },
                notes: [],
            },
            {
                name: 'city',
                base_stats: {
                    count: 100,
                    missing: 5,
                    distinct_estimate: 10,
                    inferred_type: 'string',
                },
                notes: ['Some missing values'],
            },
        ],
    };

    describe('generateCSVReport', () => {
        it('should generate correct CSV headers and data', () => {
            const csv = generateCSVReport(mockProfileResult);
            const lines = csv.split('\n');

            // check headers
            expect(lines[0]).toContain('Column,Type,Count,Missing,Distinct,Mean');

            // check numeric row
            expect(lines[1]).toContain('age,number,100,0,50,45.5,45,18,80,10.5');

            // check string row
            expect(lines[2]).toContain('city,string,100,5,10,,,,,,,');
        });
    });

    describe('generateJSONReport', () => {
        it('should generate valid JSON with metadata', () => {
            const jsonStr = generateJSONReport(mockProfileResult, 'test.csv', {
                fileSize: 1024,
                processingTimeMs: 500,
            });
            const json = JSON.parse(jsonStr);

            expect(json.meta.fileName).toBe('test.csv');
            expect(json.meta.fileSize).toBe(1024);
            expect(json.summary.totalRows).toBe(100);
            expect(json.columns).toHaveLength(2);
            expect(json.columns[0].name).toBe('age');
            expect(json.columns[0].stats.numeric.mean).toBe(45.5);
            expect(json.columns[1].name).toBe('city');
            expect(json.columns[1].quality.isPotentialPII).toBe(false);
        });
    });
});
