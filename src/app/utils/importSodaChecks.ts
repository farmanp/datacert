import yaml from 'js-yaml';

export interface SodaCheck {
    metric?: string;
    column?: string;
    operator?: string;
    threshold?: number | [number, number];
    raw: string;
    isUnsupported?: boolean;
    reason?: string;
}

/**
 * Parses SodaCL YAML string into structured checks.
 * Simplified for current DataCert capabilities.
 */
export function parseSodaYaml(yamlContent: string): SodaCheck[] {
    try {
        const doc = yaml.load(yamlContent) as any;
        if (!doc) return [];

        const checks: SodaCheck[] = [];

        // SodaCL typically has "checks for <table_name>:" top-level keys
        for (const key in doc) {
            if (key.startsWith('checks for')) {
                const tableChecks = doc[key];
                if (Array.isArray(tableChecks)) {
                    for (const checkRaw of tableChecks) {
                        checks.push(parseCheckString(checkRaw));
                    }
                }
            }
        }

        return checks;
    } catch (err) {
        console.error('Failed to parse Soda YAML', err);
        throw new Error('Invalid Soda YAML format');
    }
}

function parseCheckString(check: any): SodaCheck {
    const raw = typeof check === 'string' ? check : JSON.stringify(check);

    // If it's an object with fail/warn thresholds
    if (typeof check === 'object' && !Array.isArray(check)) {
        const metricName = Object.keys(check)[0];
        const column = extractColumn(metricName);
        const metric = extractMetric(metricName);

        return {
            metric,
            column,
            raw,
            isUnsupported: true,
            reason: 'Complex threshold objects not yet supported'
        };
    }

    if (typeof check !== 'string') {
        return { raw, isUnsupported: true, reason: 'Unsupported check format' };
    }

    // Basic regex for metric(col) operator threshold
    // Examples:
    // - missing_count(id) = 0
    // - min(amount) >= 100
    // - row_count > 100

    const metricRegex = /^([a-zA-Z0-9_]+)(?:\(([^)]+)\))?\s*([<>=!]+)\s*(-?\d+(?:\.\d+)?)$/;
    const match = check.match(metricRegex);

    if (match) {
        return {
            metric: match[1],
            column: match[2],
            operator: match[3],
            threshold: parseFloat(match[4]),
            raw
        };
    }

    // Handle "between" operator
    const betweenRegex = /^([a-zA-Z0-9_]+)(?:\(([^)]+)\))?\s*between\s*(-?\d+(?:\.\d+)?)\s*and\s*(-?\d+(?:\.\d+)?)$/;
    const betweenMatch = check.match(betweenRegex);
    if (betweenMatch) {
        return {
            metric: betweenMatch[1],
            column: betweenMatch[2],
            operator: 'between',
            threshold: [parseFloat(betweenMatch[3]), parseFloat(betweenMatch[4])],
            raw
        };
    }

    // Check for known unsupported types
    if (raw.toLowerCase().includes('freshness') || raw.toLowerCase().includes('sql')) {
        return {
            raw,
            isUnsupported: true,
            reason: raw.toLowerCase().includes('sql')
                ? 'Cannot validate: requires database execution'
                : 'Cannot validate: requires timestamp comparison'
        };
    }

    return {
        raw,
        isUnsupported: true,
        reason: 'Complex SodaCL syntax not yet supported'
    };
}

function extractColumn(metricName: string): string | undefined {
    const match = metricName.match(/\(([^)]+)\)/);
    return match ? match[1].trim() : undefined;
}

function extractMetric(metricName: string): string {
    const match = metricName.match(/^([a-zA-Z0-9_]+)/);
    return match ? match[1].trim() : metricName;
}
