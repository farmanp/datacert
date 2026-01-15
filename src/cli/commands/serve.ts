import path from 'path';
import { fileURLToPath } from 'url';
import sirv from 'sirv';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServeOptions {
    port: number;
    open: boolean;
}

export async function serveCommand(options: ServeOptions) {
    // Web dist is at dist/cli/web
    // After compilation, this file is at dist/cli/cli/commands/serve.js
    // So we go ../.. to get to dist/cli, then /web
    const distPath = path.resolve(__dirname, '../../web');

    const serve = sirv(distPath, {
        dev: true,
        single: true, // SPA mode - serve index.html for all routes
    });

    // Wrap handler to add COOP/COEP headers required for SharedArrayBuffer
    const handler = (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        serve(req, res);
    };

    const server = createServer(handler);

    server.listen(options.port, () => {
        const url = `http://localhost:${options.port}`;
        console.log(pc.green(`\nDataCert is running at ${pc.bold(url)}\n`));
        console.log(pc.dim('Press Ctrl+C to stop the server\n'));

        // Open browser if requested
        if (options.open) {
            import('open').then(open => open.default(url)).catch(() => {
                // Silently fail if browser can't be opened
            });
        }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            console.error(pc.red(`Port ${options.port} is already in use. Try a different port with --port`));
            process.exit(1);
        }
        throw err;
    });
}
