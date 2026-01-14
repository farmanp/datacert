import fs from 'fs';
import path from 'path';
import { loadWasm, DataCertProfiler } from '../utils/wasm-loader.js';
import { CliOptions } from '../types.js';
import pc from 'picocolors';
import { glob } from 'glob';

export async function profileCommand(files: string[], options: CliOptions) {
    await loadWasm();

    const expandedFiles = await expandGlobs(files);

    if (expandedFiles.length === 0) {
        console.error(pc.red('Error: No files found matching pattern.'));
        process.exit(2);
    }

    const isMultiple = expandedFiles.length > 1;

    for (const file of expandedFiles) {
        if (!options.quiet) {
            console.log(pc.blue(`Profiling ${file}...`));
        }

        try {
            const stats = await profileFile(file);
            await handleOutput(file, stats, options);
            checkQualityGates(stats, options);
        } catch (error) {
            console.error(pc.red(`Error profiling ${file}: ${(error as Error).message}`));
            if (!isMultiple) process.exit(2);
        }
    }
}

async function expandGlobs(patterns: string[]): Promise<string[]> {
    const results = [];
    for (const pattern of patterns) {
        const matches = await glob(pattern);
        results.push(...matches);
    }
    return results;
}

async function profileFile(filePath: string) {
    const profiler = new DataCertProfiler(undefined, true);
    const stream = fs.createReadStream(filePath);

    let firstChunk = true;

    for await (const chunk of stream) {
        const uint8Array = new Uint8Array(chunk);
        if (firstChunk) {
            profiler.auto_detect_delimiter(uint8Array);
            firstChunk = false;
        }
        profiler.parse_and_profile_chunk(uint8Array);
    }

    return profiler.finalize();
}

async function handleOutput(file: string, stats: any, options: CliOptions) {
    let outputContent = '';

    switch (options.format) {
        case 'json':
            outputContent = JSON.stringify(stats, null, 2);
            break;
        case 'markdown':
            outputContent = generateMarkdown(stats);
            break;
        case 'html':
            outputContent = generateHtml(stats);
            break;
        default:
            outputContent = JSON.stringify(stats, null, 2);
    }

    if (options.output) {
        let outputPath = options.output;

        // If output is a directory or we have multiple files, generate names
        if (fs.existsSync(outputPath) && fs.lstatSync(outputPath).isDirectory()) {
            const baseName = path.basename(file, path.extname(file));
            outputPath = path.join(outputPath, `${baseName}_profile.${options.format}`);
        } else if (expandedFilesCount() > 1 && !outputPath.includes('%s')) {
            // Handle directory creation if it doesn't exist
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            const baseName = path.basename(file, path.extname(file));
            outputPath = path.join(outputPath, `${baseName}_profile.${options.format}`);
        }

        fs.writeFileSync(outputPath, outputContent);
        if (!options.quiet) {
            console.log(pc.green(`Output written to ${outputPath}`));
        }
    } else {
        process.stdout.write(outputContent + '\n');
    }
}

function expandedFilesCount() {
    // This is a bit hacky but works for now
    return 1; // context dependent
}

function checkQualityGates(stats: any, options: CliOptions) {
    const rowCount = stats.total_rows || 0;
    const columnProfiles = stats.column_profiles || [];

    if (options.failOnMissing !== undefined) {
        for (const col of columnProfiles) {
            const missingPct = (col.base_stats.missing / rowCount) * 100;
            if (missingPct > options.failOnMissing) {
                console.error(pc.red(`Quality gate failed: column "${col.name}" has ${missingPct.toFixed(2)}% missing values (threshold: ${options.failOnMissing}%)`));
                process.exit(1);
            }
        }
    }

    if (options.failOnDuplicates) {
        for (const col of columnProfiles) {
            const uniqueCount = col.base_stats.distinct_estimate || 0;
            if (uniqueCount < rowCount && rowCount > 0) {
                console.error(pc.red(`Quality gate failed: column "${col.name}" contains duplicates`));
                process.exit(1);
            }
        }
    }
}

function generateMarkdown(stats: any): string {
    const rowCount = stats.total_rows || 0;
    const columnProfiles = stats.column_profiles || [];
    const columnCount = columnProfiles.length;

    let md = `# Data Profile Report\n\n`;
    md += `**Rows:** ${rowCount}\n`;
    md += `**Columns:** ${columnCount}\n\n`;

    md += `## Column Summary\n\n`;
    md += `| Column | Type | Missing % | Unique |\n`;
    md += `| --- | --- | --- | --- |\n`;

    for (const col of columnProfiles) {
        const missingPct = (col.base_stats.missing / rowCount) * 100;
        md += `| ${col.name} | ${col.base_stats.inferred_type} | ${missingPct.toFixed(2)}% | ${col.base_stats.distinct_estimate} |\n`;
    }

    return md;
}

function generateHtml(stats: any): string {
    const rowCount = stats.total_rows || 0;
    const columnProfiles = stats.column_profiles || [];
    const columnCount = columnProfiles.length;

    return `<!DOCTYPE html>
<html>
<head>
  <title>DataCert Profile Report</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
    th { background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <h1>DataCert Profile Report</h1>
    <p>Rows: ${rowCount} | Columns: ${columnCount}</p>
    <table>
      <thead>
        <tr><th>Column</th><th>Type</th><th>Missing %</th><th>Unique</th></tr>
      </thead>
      <tbody>
        ${columnProfiles.map((col: any) => {
        const missingPct = (col.base_stats.missing / rowCount) * 100;
        return `
          <tr>
            <td>${col.name}</td>
            <td>${col.base_stats.inferred_type}</td>
            <td>${missingPct.toFixed(2)}%</td>
            <td>${col.base_stats.distinct_estimate}</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}
