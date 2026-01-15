import { ProfileResult, ColumnProfile, ValidationResult } from '../stores/profileStore';
import { SodaCheck } from './importSodaChecks';
import { GXExpectation } from './exportGreatExpectations';
import { isExpectationSupported } from './importGreatExpectations';

/**
 * Validates Soda checks against a profile result.
 */
export function validateSodaChecks(
    results: ProfileResult,
    checks: SodaCheck[]
): ValidationResult[] {
    return checks.map((check) => {
        if (check.isUnsupported) {
            return {
                expectationType: check.metric || 'unknown',
                column: check.column,
                status: 'skipped',
                reason: check.reason,
                raw: check.raw,
            };
        }

        const column = check.column
            ? results.column_profiles.find((p) => p.name === check.column)
            : undefined;

        // Table-level checks
        if (!check.column) {
            if (check.metric === 'row_count') {
                const observed = results.total_rows;
                const pass = evaluateNumeric(observed, check.operator!, check.threshold!);
                return {
                    expectationType: 'row_count',
                    status: pass ? 'pass' : 'fail',
                    observed: observed.toString(),
                    expected: formatExpected(check.operator!, check.threshold!),
                    raw: check.raw,
                };
            }
            return {
                expectationType: check.metric || 'unknown',
                status: 'skipped',
                reason: 'Unsupported table-level check',
                raw: check.raw,
            };
        }

        if (!column) {
            return {
                expectationType: check.metric || 'unknown',
                column: check.column,
                status: 'fail',
                reason: 'Column not found in profile',
                raw: check.raw,
            };
        }

        const metricValue = getMetricValue(column, check.metric!);
        if (metricValue === undefined) {
            return {
                expectationType: check.metric!,
                column: check.column,
                status: 'skipped',
                reason: `Metric ${check.metric} not available in profile`,
                raw: check.raw,
            };
        }

        const pass = evaluateNumeric(metricValue, check.operator!, check.threshold!);
        return {
            expectationType: check.metric!,
            column: check.column,
            status: pass ? 'pass' : 'fail',
            observed: formatValue(metricValue, check.metric!),
            expected: formatExpected(check.operator!, check.threshold!),
            raw: check.raw,
        };
    });
}

function getMetricValue(column: ColumnProfile, metric: string): number | undefined {
    const { base_stats, numeric_stats } = column;

    switch (metric) {
        case 'missing_count':
            return base_stats.missing;
        case 'missing_percent':
            return (base_stats.missing / base_stats.count) * 100;
        case 'duplicate_count':
            return base_stats.count - base_stats.distinct_estimate;
        case 'duplicate_percent':
            return ((base_stats.count - base_stats.distinct_estimate) / base_stats.count) * 100;
        case 'min':
            return numeric_stats?.min ?? undefined;
        case 'max':
            return numeric_stats?.max ?? undefined;
        case 'avg':
        case 'mean':
            return numeric_stats?.mean ?? undefined;
        case 'stddev':
            return numeric_stats?.std_dev ?? undefined;
        default:
            return undefined;
    }
}

function evaluateNumeric(
    value: number,
    operator: string,
    threshold: number | [number, number]
): boolean {
    if (operator === 'between' && Array.isArray(threshold)) {
        return value >= threshold[0] && value <= threshold[1];
    }

    if (typeof threshold !== 'number') return false;

    switch (operator) {
        case '=':
        case '==':
            return value === threshold;
        case '>':
            return value > threshold;
        case '<':
            return value < threshold;
        case '>=':
            return value >= threshold;
        case '<=':
            return value <= threshold;
        case '!=':
            return value !== threshold;
        default:
            return false;
    }
}

function formatValue(value: number, metric: string): string {
    if (metric.includes('percent')) {
        return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString();
}

function formatExpected(operator: string, threshold: number | [number, number]): string {
    if (operator === 'between' && Array.isArray(threshold)) {
        return `between ${threshold[0]} and ${threshold[1]}`;
    }
    return `${operator} ${threshold}`;
}

/**
 * Format number for GX display
 */
function formatGXNum(n: number | null | undefined, decimals: number = 2): string {
    if (n === null || n === undefined) return 'N/A';
    return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Evaluate a single GX expectation against the profile
 */
function evaluateGXExpectation(
    expectation: GXExpectation,
    profile: ProfileResult
): ValidationResult {
    const { expectation_type, kwargs } = expectation;
    const columnName = kwargs.column as string | undefined;

    // Check if expectation type is supported
    if (!isExpectationSupported(expectation_type)) {
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'skipped',
            reason: 'Cannot validate: requires raw data evaluation',
        };
    }

    // Handle table-level expectations
    if (expectation_type === 'expect_table_row_count_to_be_between') {
        const minValue = kwargs.min_value as number;
        const maxValue = kwargs.max_value as number;
        const rowCount = profile.total_rows;

        if (rowCount >= minValue && rowCount <= maxValue) {
            return {
                expectationType: expectation_type,
                status: 'pass',
                observed: `${formatGXNum(rowCount, 0)} rows`,
                expected: `${formatGXNum(minValue, 0)} - ${formatGXNum(maxValue, 0)} rows`,
            };
        }
        return {
            expectationType: expectation_type,
            status: 'fail',
            observed: `${formatGXNum(rowCount, 0)} rows`,
            expected: `${formatGXNum(minValue, 0)} - ${formatGXNum(maxValue, 0)} rows`,
        };
    }

    if (expectation_type === 'expect_table_column_count_to_equal') {
        const expectedCount = kwargs.value as number;
        const actualCount = profile.column_profiles.length;

        if (actualCount === expectedCount) {
            return {
                expectationType: expectation_type,
                status: 'pass',
                observed: `${actualCount} columns`,
                expected: `${expectedCount} columns`,
            };
        }
        return {
            expectationType: expectation_type,
            status: 'fail',
            observed: `${actualCount} columns`,
            expected: `${expectedCount} columns`,
        };
    }

    // Column-level expectations require column name
    if (!columnName) {
        return {
            expectationType: expectation_type,
            status: 'skipped',
            reason: 'No column specified in expectation',
        };
    }

    const column = profile.column_profiles.find((c) => c.name === columnName);

    // Check if column exists
    if (expectation_type === 'expect_column_to_exist') {
        if (column) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'pass',
                observed: 'Column exists',
            };
        }
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'fail',
            observed: 'Column not found',
            reason: 'Column not found in profile',
        };
    }

    // All other expectations need the column to exist
    if (!column) {
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'fail',
            reason: 'Column not found in profile',
        };
    }

    const { base_stats, numeric_stats, categorical_stats } = column;

    // Null expectation
    if (expectation_type === 'expect_column_values_to_not_be_null') {
        const mostly = (kwargs.mostly as number) ?? 1.0;
        const totalCount = base_stats.count;
        const validCount = totalCount - base_stats.missing;
        const actualCompleteness = totalCount > 0 ? validCount / totalCount : 0;

        if (actualCompleteness >= mostly) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'pass',
                observed: `${(actualCompleteness * 100).toFixed(1)}% non-null`,
                expected: `>= ${(mostly * 100).toFixed(1)}% non-null`,
            };
        }
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'fail',
            observed: `${(actualCompleteness * 100).toFixed(1)}% non-null`,
            expected: `>= ${(mostly * 100).toFixed(1)}% non-null`,
        };
    }

    // Type expectation
    if (expectation_type === 'expect_column_values_to_be_of_type') {
        const expectedType = kwargs.type_ as string;
        const actualType = base_stats.inferred_type;

        // Map DataCert types to GX types for comparison
        const typeMap: Record<string, string[]> = {
            INTEGER: ['Integer'],
            FLOAT: ['Numeric', 'Integer'],
            STRING: ['String'],
            BOOLEAN: ['Boolean'],
            DATE: ['Date'],
            DATETIME: ['DateTime'],
        };

        const acceptableTypes = typeMap[expectedType] || [];
        if (acceptableTypes.includes(actualType)) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'pass',
                observed: actualType,
                expected: expectedType,
            };
        }
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'fail',
            observed: actualType,
            expected: expectedType,
        };
    }

    // Range expectation
    if (expectation_type === 'expect_column_values_to_be_between') {
        if (!numeric_stats) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'skipped',
                reason: 'Column is not numeric',
            };
        }

        const minValue = kwargs.min_value as number;
        const maxValue = kwargs.max_value as number;
        const actualMin = numeric_stats.min;
        const actualMax = numeric_stats.max;

        if (actualMin >= minValue && actualMax <= maxValue) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'pass',
                observed: `min=${formatGXNum(actualMin)}, max=${formatGXNum(actualMax)}`,
                expected: `min>=${formatGXNum(minValue)}, max<=${formatGXNum(maxValue)}`,
            };
        }
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'fail',
            observed: `min=${formatGXNum(actualMin)}, max=${formatGXNum(actualMax)}`,
            expected: `min>=${formatGXNum(minValue)}, max<=${formatGXNum(maxValue)}`,
        };
    }

    // Mean expectation
    if (expectation_type === 'expect_column_mean_to_be_between') {
        if (!numeric_stats || numeric_stats.mean === null) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'skipped',
                reason: 'Column is not numeric or has no mean',
            };
        }

        const minValue = kwargs.min_value as number;
        const maxValue = kwargs.max_value as number;
        const actualMean = numeric_stats.mean;

        if (actualMean >= minValue && actualMean <= maxValue) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'pass',
                observed: `mean=${formatGXNum(actualMean)}`,
                expected: `${formatGXNum(minValue)} <= mean <= ${formatGXNum(maxValue)}`,
            };
        }
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'fail',
            observed: `mean=${formatGXNum(actualMean)}`,
            expected: `${formatGXNum(minValue)} <= mean <= ${formatGXNum(maxValue)}`,
        };
    }

    // Uniqueness expectation
    if (expectation_type === 'expect_column_values_to_be_unique') {
        const validCount = base_stats.count - base_stats.missing;
        const distinctCount = base_stats.distinct_estimate;

        // Allow for HLL estimation error (within 5%)
        const isUnique = validCount > 0 && distinctCount >= validCount * 0.95;

        if (isUnique) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'pass',
                observed: `${formatGXNum(distinctCount, 0)} distinct / ${formatGXNum(validCount, 0)} values`,
            };
        }
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'fail',
            observed: `${formatGXNum(distinctCount, 0)} distinct / ${formatGXNum(validCount, 0)} values`,
            expected: 'All values unique',
        };
    }

    // Value set expectations (partial support)
    if (
        expectation_type === 'expect_column_distinct_values_to_be_in_set' ||
        expectation_type === 'expect_column_values_to_be_in_set'
    ) {
        if (!categorical_stats) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'skipped',
                reason: 'No categorical statistics available',
            };
        }

        const valueSet = kwargs.value_set as unknown[];
        const topValues = categorical_stats.top_values.map((tv) => tv.value);

        // Check if all observed top values are in the expected set
        const valueSetStrings = valueSet.map(String);
        const allInSet = topValues.every((v) => valueSetStrings.includes(String(v)));

        if (allInSet) {
            return {
                expectationType: expectation_type,
                column: columnName,
                status: 'pass',
                observed: `Top values: ${topValues.slice(0, 5).join(', ')}${topValues.length > 5 ? '...' : ''}`,
                expected: `Values in set: ${valueSetStrings.slice(0, 5).join(', ')}${valueSetStrings.length > 5 ? '...' : ''}`,
            };
        }
        return {
            expectationType: expectation_type,
            column: columnName,
            status: 'fail',
            observed: `Top values: ${topValues.slice(0, 5).join(', ')}`,
            expected: `Values in set: ${valueSetStrings.slice(0, 5).join(', ')}${valueSetStrings.length > 5 ? '...' : ''}`,
        };
    }

    // Default fallback for unknown supported types
    return {
        expectationType: expectation_type,
        column: columnName,
        status: 'skipped',
        reason: 'Evaluation not implemented',
    };
}

/**
 * Validates Great Expectations expectations against a profile result.
 */
export function validateGXExpectations(
    results: ProfileResult,
    expectations: GXExpectation[]
): ValidationResult[] {
    return expectations.map((expectation) => evaluateGXExpectation(expectation, results));
}
