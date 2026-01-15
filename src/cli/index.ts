#!/usr/bin/env node
import { Command } from 'commander';
import { profileCommand } from './commands/profile.js';
import { serveCommand } from './commands/serve.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'));

const program = new Command();

program
    .name('datacert')
    .description('High-performance local-first data profiling toolkit')
    .version(packageJson.version);

// Default command: open UI in browser
program
    .command('serve', { isDefault: true })
    .description('Start DataCert UI in browser')
    .option('-p, --port <number>', 'Port to serve on', '3000')
    .option('--no-open', 'Do not open browser automatically')
    .action(async (options) => {
        await serveCommand({
            port: parseInt(options.port),
            open: options.open
        });
    });

program
    .command('profile')
    .description('Profile one or more CSV files')
    .argument('<files...>', 'CSV files or glob patterns to profile')
    .option('-o, --output <path>', 'Output file or directory')
    .option('-f, --format <type>', 'Output format: json|html|markdown', 'json')
    .option('-q, --quiet', 'Suppress progress output', false)
    .option('--fail-on-missing <pct>', 'Exit 1 if any column > pct% missing', parseFloat)
    .option('--fail-on-duplicates', 'Exit 1 if any column has duplicates', false)
    .option('--tolerance <pct>', 'Tolerance for quality gates', parseFloat, 10)
    .action(async (files, options) => {
        try {
            await profileCommand(files, options);
        } catch (error) {
            console.error('Fatal error:', (error as Error).message);
            process.exit(2);
        }
    });

program.parse();
