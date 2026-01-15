import { ProfileResult, ValidationResult } from '../stores/profileStore';

/**
 * Minimal interface for JSON Schema (Draft 7/2020-12 subset)
 * We only care about validation keywords
 */
export interface JsonSchema {
    $schema?: string;
    type?: string | string[];
    required?: string[];
    properties?: Record<string, JsonSchemaProperty>;
    // Allow other properties
    [key: string]: any;
}

export interface JsonSchemaProperty {
    type?: string | string[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    enum?: any[];
    // Allow other properties
    [key: string]: any;
}

/**
 * Parses a JSON string into a JsonSchema object.
 * Throws if invalid JSON.
 */
export function parseJsonSchema(content: string): JsonSchema {
    const schema = JSON.parse(content);
    // Simple structural check
    if (typeof schema !== 'object' || schema === null) {
        throw new Error('Invalid JSON Schema: Root must be an object');
    }
    return schema;
}

/**
 * Validates a profile against a JSON Schema.
 * 
 * Logic:
 * 1. Check if root type is "array" (since we profile datasets which are arrays of rows).
 *    Some schemas describe the row object directly. We will try to detect this.
 *    If schema has "items" and type="array", we validate against "items".
 *    Otherwise, we assume the schema describes a single row object.
 * 
 * 2. Validate "required" columns.
 * 
 * 3. Validate each property (column) against constraints:
 *    - type
 *    - minimum/maximum (for numbers)
 *    - enum (check if top values are in enum)
 */
export function validateJsonSchema(results: ProfileResult, schema: JsonSchema): ValidationResult[] {
    const validationResults: ValidationResult[] = [];
    
    // Determine the row schema
    let rowSchema: JsonSchema = schema;
    
    // If schema describes the array, extract items
    if (schema.type === 'array' && schema.items) {
        rowSchema = schema.items as JsonSchema;
    }

    // 1. Validate Required Fields
    if (rowSchema.required && Array.isArray(rowSchema.required)) {
        for (const reqField of rowSchema.required) {
            const column = results.column_profiles.find(c => c.name === reqField);
            if (!column) {
                validationResults.push({
                    expectationType: 'required',
                    column: reqField,
                    status: 'fail',
                    observed: 'missing',
                    expected: 'present',
                    reason: 'Required column not found'
                });
            } else {
                validationResults.push({
                    expectationType: 'required',
                    column: reqField,
                    status: 'pass',
                    observed: 'present',
                    expected: 'present'
                });
            }
        }
    }

    // 2. Validate Property Constraints
    if (rowSchema.properties) {
        for (const [colName, rules] of Object.entries(rowSchema.properties)) {
            const column = results.column_profiles.find(c => c.name === colName);
            
            // If column is missing, skip property validation (handled by 'required' check if applicable)
            if (!column) continue;

            // 2a. Validate Type
            if (rules.type) {
                const typeResult = validateType(column, rules.type);
                validationResults.push({
                    expectationType: 'type',
                    column: colName,
                    ...typeResult
                });
            }

            // 2b. Validate Numeric Bounds (minimum)
            if (rules.minimum !== undefined && column.numeric_stats) {
                const observedMin = column.numeric_stats.min;
                const pass = observedMin >= rules.minimum;
                validationResults.push({
                    expectationType: 'minimum',
                    column: colName,
                    status: pass ? 'pass' : 'fail',
                    observed: observedMin.toString(),
                    expected: `>= ${rules.minimum}`,
                    reason: pass ? undefined : `Observed min (${observedMin}) is less than schema minimum`
                });
            }

            // 2c. Validate Numeric Bounds (maximum)
            if (rules.maximum !== undefined && column.numeric_stats) {
                const observedMax = column.numeric_stats.max;
                const pass = observedMax <= rules.maximum;
                validationResults.push({
                    expectationType: 'maximum',
                    column: colName,
                    status: pass ? 'pass' : 'fail',
                    observed: observedMax.toString(),
                    expected: `<= ${rules.maximum}`,
                    reason: pass ? undefined : `Observed max (${observedMax}) is greater than schema maximum`
                });
            }

            // 2d. Validate Enum
            // We can check if all sample values or top values are in the enum list
            if (rules.enum && Array.isArray(rules.enum) && column.categorical_stats) {
                // Check top values
                const unknownValues = column.categorical_stats.top_values
                    .map(v => v.value)
                    .filter(v => !rules.enum!.includes(v) && !rules.enum!.includes(Number(v))); // Handle number/string coercion loosely
                
                if (unknownValues.length > 0) {
                     validationResults.push({
                        expectationType: 'enum',
                        column: colName,
                        status: 'fail',
                        observed: `Found: ${unknownValues.slice(0, 3).join(', ')}...`,
                        expected: `One of: ${rules.enum.join(', ')}`,
                        reason: `Column contains values not in enum list`
                    });
                } else {
                    validationResults.push({
                        expectationType: 'enum',
                        column: colName,
                        status: 'pass',
                        expected: `One of: ${rules.enum.join(', ')}`
                    });
                }
            }
        }
    }

    return validationResults;
}

/**
 * Maps DataCert inferred types to JSON Schema types
 */
function validateType(column: any, schemaType: string | string[]): { status: 'pass' | 'fail', observed?: string, expected?: string, reason?: string } {
    const inferredType = column.base_stats.inferred_type.toLowerCase(); // e.g., 'integer', 'string', 'float'

    const allowedTypes = Array.isArray(schemaType) ? schemaType : [schemaType];

    // DataCert Types: String, Integer, Float, Boolean, Date
    // JSON Schema Types: string, number, integer, boolean, object, array, null
    
    let isMatch = false;

    for (const type of allowedTypes) {
        if (type === 'string') {
            if (inferredType === 'string' || inferredType === 'date' || inferredType === 'datetime') isMatch = true;
        } else if (type === 'integer') {
            if (inferredType === 'integer') isMatch = true;
        } else if (type === 'number') {
            if (inferredType === 'integer' || inferredType === 'float' || inferredType === 'numeric') isMatch = true;
        } else if (type === 'boolean') {
            if (inferredType === 'boolean') isMatch = true;
        } else if (type === 'null') {
            if (inferredType === 'empty') isMatch = true; // "Empty" usually means all null
        }
    }

    if (isMatch) {
        return { status: 'pass', observed: inferredType, expected: allowedTypes.join(' or ') };
    }

    return {
        status: 'fail',
        observed: inferredType,
        expected: allowedTypes.join(' or '),
        reason: `Type mismatch: Observed ${inferredType}, expected ${allowedTypes.join(' or ')}`
    };
}
