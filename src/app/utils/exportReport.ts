import { ProfileResult, Histogram } from '../stores/profileStore';

/**
 * Generates a standalone HTML report for the profiling results.
 */
export async function generateHTMLReport(
    results: ProfileResult,
    filename: string,
): Promise<string> {
    const date = new Date().toLocaleString();
    const version = 'v1.0.0';

    // Render histograms to data URLs
    const histogramsMap = new Map<string, string>();
    for (const profile of results.column_profiles) {
        if (profile.histogram) {
            histogramsMap.set(profile.name, renderHistogramToDataURL(profile.histogram));
        }
    }

    const styles = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; background: #f8fafc; margin: 0; padding: 40px; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { margin: 0; color: #0f172a; font-size: 24px; }
    .meta { font-size: 14px; color: #64748b; margin-top: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .kpi-card { background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; }
    .kpi-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 4px; }
    .kpi-value { font-size: 24px; font-weight: 800; color: #0f172a; }
    h2 { font-size: 20px; border-left: 4px solid #3b82f6; padding-left: 12px; margin: 40px 0 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
    th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #475569; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .badge-type { background: #e2e8f0; color: #475569; }
    .badge-excellent { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef9c3; color: #854d0e; }
    .badge-critical { background: #fee2e2; color: #b91c1c; }
    .column-section { page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .stats-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .stats-table td { padding: 4px 0; border: none; }
    .histogram-container img { width: 100%; border-radius: 8px; background: #f8fafc; }
    @media print {
      body { background: white; padding: 0; }
      .container { shadow: none; width: 100%; max-width: none; }
      .column-section { break-inside: avoid; }
    }
  `;

    const formatNum = (n: number | undefined | null) => {
        if (n === undefined || n === null) return '-';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
    };

    // Calculate overall health score
    const calculateHealthScore = () => {
        let totalCount = 0;
        let totalMissing = 0;
        for (const p of results.column_profiles) {
            totalCount += p.base_stats.count;
            totalMissing += p.base_stats.missing;
        }
        if (totalCount === 0) return { value: 0, color: '#f43f5e' };
        const score = ((totalCount - totalMissing) / totalCount) * 100;
        const rounded = Math.round(score * 10) / 10;
        let color = '#10b981'; // emerald-500
        if (rounded < 70) color = '#f43f5e'; // rose-500
        else if (rounded < 90) color = '#f59e0b'; // amber-500
        return { value: rounded, color };
    };

    const health = calculateHealthScore();

    const getQualityBadge = (missing: number, count: number) => {
        const p = (missing / count) * 100;
        if (p < 5) return `<span class="badge badge-excellent">${p.toFixed(1)}% missing</span>`;
        if (p < 20) return `<span class="badge badge-warning">${p.toFixed(1)}% missing</span>`;
        return `<span class="badge badge-critical">${p.toFixed(1)}% missing</span>`;
    };

    const htmlSections = results.column_profiles
        .map(
            (col) => `
    <div class="column-section">
      <div class="column-header">
        <div>
          <h3 style="margin:0; font-size:18px;">${col.name}</h3>
          <span class="badge badge-type">${col.base_stats.inferred_type}</span>
        </div>
        ${getQualityBadge(col.base_stats.missing, col.base_stats.count)}
      </div>
      
      <div class="stats-layout">
        <div>
          <table class="stats-table">
            <tr><td>Count</td><td style="text-align:right;">${formatNum(col.base_stats.count)}</td></tr>
            <tr><td>Unique</td><td style="text-align:right;">${formatNum(col.base_stats.distinct_estimate)}</td></tr>
            ${col.numeric_stats
                    ? `
              <tr><td>Mean</td><td style="text-align:right;">${formatNum(col.numeric_stats.mean)}</td></tr>
              <tr><td>Median</td><td style="text-align:right;">${formatNum(col.numeric_stats.median)}</td></tr>
              <tr><td>Min</td><td style="text-align:right;">${formatNum(col.numeric_stats.min)}</td></tr>
              <tr><td>Max</td><td style="text-align:right;">${formatNum(col.numeric_stats.max)}</td></tr>
              <tr><td>Std Dev</td><td style="text-align:right;">${formatNum(col.numeric_stats.std_dev)}</td></tr>
            `
                    : ''
                }
          </table>
        </div>
        <div class="histogram-container">
           ${histogramsMap.has(col.name) ? `<img src="${histogramsMap.get(col.name)}" alt="Distribution" />` : ''}
        </div>
      </div>
    </div>
  `,
        )
        .join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Data Profile - ${filename}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>DataLens Profiler Report</h1>
          <div class="meta">
            Source: <strong>${filename}</strong><br>
            Generated on: ${date} | DataLens ${version}
          </div>
        </header>

        <div class="summary-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Rows</div>
            <div class="kpi-value">${formatNum(results.total_rows)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Columns</div>
            <div class="kpi-value">${results.column_profiles.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Quality Score</div>
            <div class="kpi-value" style="color: ${health.color};">${health.value}%</div>
          </div>
        </div>

        <h2>Column Profiles</h2>
        ${htmlSections}
        
        <footer style="margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px;">
          Generated by DataLens Profiler - All processing performed locally.
        </footer>
      </div>
    </body>
    </html>
  `;
}

function renderHistogramToDataURL(histogram: Histogram): string {
    const canvas = document.createElement('canvas');
    const width = 400;
    const height = 150;
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.scale(2, 2);
    ctx.clearRect(0, 0, width, height);

    const { bins } = histogram;
    if (bins.length === 0) return '';

    const maxCount = Math.max(...bins.map((b) => b.count));
    const padding = { top: 10, bottom: 5, left: 5, right: 5 };
    const chartHeight = height - padding.top - padding.bottom;
    const binWidth = (width - padding.left - padding.right) / bins.length;
    const gap = 1;

    ctx.fillStyle = '#3b82f6';
    bins.forEach((bin, i: number) => {
        const barHeight = maxCount > 0 ? (bin.count / maxCount) * chartHeight : 0;
        const x = padding.left + i * binWidth;
        const y = height - padding.bottom - barHeight;

        ctx.beginPath();
        // Simplified rect for export
        ctx.roundRect(x + gap, y, binWidth - gap * 2, barHeight, [2, 2, 0, 0]);
        ctx.fill();
    });

    return canvas.toDataURL('image/png');
}

/**
 * Round a number to specified decimal places (max 6)
 */
function roundToPrecision(value: number | undefined | null, decimals: number = 6): number | null {
    if (value === undefined || value === null || !isFinite(value)) return null;
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}

/**
 * Check if a column name suggests PII
 */
function isPotentialPII(name: string): boolean {
    const lower = name.toLowerCase();
    const piiKeywords = [
        'email',
        'phone',
        'ssn',
        'social_security',
        'address',
        'name',
        'first_name',
        'last_name',
        'firstname',
        'lastname',
        'dob',
        'date_of_birth',
        'birth',
        'passport',
        'license',
        'credit_card',
        'card_number',
        'zip',
        'postal',
        'ip_address',
        'ip',
    ];
    return piiKeywords.some((kw) => lower.includes(kw));
}

/**
 * Export metadata options
 */
export interface JSONExportOptions {
    fileSize?: number;
    processingTimeMs?: number;
}

interface ColumnExport {
    name: string;
    stats: {
        count: number;
        missing: number;
        distinct: number;
        inferredType: string;
        minLength?: number;
        maxLength?: number;
        numeric?: {
            min: number | null;
            max: number | null;
            mean: number | null;
            median: number | null;
            stdDev: number | null;
            variance: number | null;
            skewness: number | null;
            kurtosis: number | null;
            sum: number | null;
            p25: number | null;
            p75: number | null;
            p90: number | null;
            p95: number | null;
            p99: number | null;
        };
        categorical?: {
            topValues: { value: string; count: number; percentage: number | null }[];
            uniqueCount: number;
        };
        histogram?: {
            bins: { start: number | null; end: number | null; count: number }[];
            min: number | null;
            max: number | null;
            binWidth: number | null;
        };
    };
    quality: {
        completeness: number | null;
        uniqueness: number | null;
        isPotentialPII: boolean;
    };
    notes?: string[];
}

/**
 * Generates a JSON string of the profiling results with metadata.
 * Follows PRD Appendix C schema with 2-space indentation and 6 decimal precision.
 */
export function generateJSONReport(
    results: ProfileResult,
    filename: string,
    options: JSONExportOptions = {},
): string {
    const { fileSize = 0, processingTimeMs = 0 } = options;

    const report = {
        meta: {
            generatedAt: new Date().toISOString(),
            datalensVersion: '0.1.0',
            fileName: filename,
            fileSize: fileSize,
            processingTimeMs: processingTimeMs,
        },
        summary: {
            totalRows: results.total_rows,
            totalColumns: results.column_profiles.length,
        },
        columns: results.column_profiles.map((col) => {
            const count = col.base_stats.count;
            const missing = col.base_stats.missing;
            const distinct = col.base_stats.distinct_estimate;
            const validCount = count - missing;

            // Calculate quality metrics
            const completeness = count > 0 ? roundToPrecision((count - missing) / count, 6) : 0;
            const uniqueness =
                validCount > 0 ? roundToPrecision(Math.min(distinct / validCount, 1), 6) : 0;

            const columnExport: ColumnExport = {
                name: col.name,
                stats: {
                    count: count,
                    missing: missing,
                    distinct: distinct,
                    inferredType: col.base_stats.inferred_type,
                    minLength: col.min_length ?? undefined,
                    maxLength: col.max_length ?? undefined,
                },
                quality: {
                    completeness: completeness,
                    uniqueness: uniqueness,
                    isPotentialPII: isPotentialPII(col.name),
                },
            };

            // Add numeric stats if present
            if (col.numeric_stats) {
                columnExport.stats.numeric = {
                    min: roundToPrecision(col.numeric_stats.min),
                    max: roundToPrecision(col.numeric_stats.max),
                    mean: roundToPrecision(col.numeric_stats.mean),
                    median: roundToPrecision(col.numeric_stats.median),
                    stdDev: roundToPrecision(col.numeric_stats.std_dev),
                    variance: roundToPrecision(col.numeric_stats.variance),
                    skewness: roundToPrecision(col.numeric_stats.skewness),
                    kurtosis: roundToPrecision(col.numeric_stats.kurtosis),
                    sum: roundToPrecision(col.numeric_stats.sum),
                    p25: roundToPrecision(col.numeric_stats.p25),
                    p75: roundToPrecision(col.numeric_stats.p75),
                    p90: roundToPrecision(col.numeric_stats.p90),
                    p95: roundToPrecision(col.numeric_stats.p95),
                    p99: roundToPrecision(col.numeric_stats.p99),
                };
            }

            // Add categorical stats if present
            if (col.categorical_stats) {
                columnExport.stats.categorical = {
                    topValues: col.categorical_stats.top_values.map((tv) => ({
                        value: tv.value,
                        count: tv.count,
                        percentage: roundToPrecision(tv.percentage),
                    })),
                    uniqueCount: col.categorical_stats.unique_count,
                };
            }

            // Add histogram if present
            if (col.histogram) {
                columnExport.stats.histogram = {
                    bins: col.histogram.bins.map((bin) => ({
                        start: roundToPrecision(bin.start),
                        end: roundToPrecision(bin.end),
                        count: bin.count,
                    })),
                    min: roundToPrecision(col.histogram.min),
                    max: roundToPrecision(col.histogram.max),
                    binWidth: roundToPrecision(col.histogram.bin_width),
                };
            }

            // Add notes if present
            if (col.notes && col.notes.length > 0) {
                columnExport.notes = col.notes;
            }

            return columnExport;
        }),
    };

    return JSON.stringify(
        report,
        (_, v) => (typeof v === 'bigint' ? v.toString() : v),
        2
    );
}

/**
 * Generates a CSV string of the column-level profiling results.
 */
export function generateCSVReport(results: ProfileResult): string {
    const headers = [
        'Column',
        'Type',
        'Count',
        'Missing',
        'Distinct',
        'Mean',
        'Median',
        'Min',
        'Max',
        'StdDev',
        'Variance',
        'Skewness',
        'Kurtosis',
    ];

    const rows = results.column_profiles.map((col) => {
        const s = col.numeric_stats;
        return [
            col.name,
            col.base_stats.inferred_type,
            col.base_stats.count,
            col.base_stats.missing,
            col.base_stats.distinct_estimate,
            s?.mean ?? '',
            s?.median ?? '',
            s?.min ?? '',
            s?.max ?? '',
            s?.std_dev ?? '',
            s?.variance ?? '',
            s?.skewness ?? '',
            s?.kurtosis ?? '',
        ]
            .map((val) => {
                const str = String(val);
                return str.includes(',') ? `"${str}"` : str;
            })
            .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates a formatted Markdown summary of the profiling results.
 */
export function generateMarkdownReport(results: ProfileResult, filename: string): string {
    const date = new Date().toLocaleString();
    const formatNum = (n: number | undefined | null) => {
        if (n === undefined || n === null) return '-';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
    };

    // Calculate health score
    let totalCount = 0;
    let totalMissing = 0;
    for (const p of results.column_profiles) {
        totalCount += p.base_stats.count;
        totalMissing += p.base_stats.missing;
    }
    const score = totalCount > 0 ? ((totalCount - totalMissing) / totalCount) * 100 : 0;

    let md = `# DataLens Profile: ${filename}\n\n`;
    md += `*Generated on ${date}*\n\n`;

    md += `### 📊 Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Total Rows** | ${formatNum(results.total_rows)} |\n`;
    md += `| **Total Columns** | ${results.column_profiles.length} |\n`;
    md += `| **Health Score** | ${score.toFixed(1)}% |\n\n`;

    md += `### 📋 Column Statistics\n\n`;
    md += `| Column | Type | Count | Missing % | Distinct | Mean | Median |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const col of results.column_profiles) {
        const missingPct = (col.base_stats.missing / col.base_stats.count) * 100;
        const s = col.numeric_stats;
        md += `| **${col.name}** | \`${col.base_stats.inferred_type}\` | ${formatNum(col.base_stats.count)} | ${missingPct.toFixed(1)}% | ${formatNum(col.base_stats.distinct_estimate)} | ${formatNum(s?.mean)} | ${formatNum(s?.median)} |\n`;
    }

    md += `\n---\n*Generated by DataLens Profiler - Local-first data intelligence.*`;

    return md;
}

/**
 * Initiates a file download.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
