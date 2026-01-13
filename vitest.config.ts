import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [solidPlugin()],
    test: {
        environment: 'jsdom',
        globals: true,
        transformMode: {
            web: [/.[jt]sx?$/],
        },
        setupFiles: ['./src/app/setupTests.ts'],
    },
    resolve: {
        conditions: ['development', 'browser'],
        alias: {
            'virtual:pwa-register': path.resolve(__dirname, './src/app/test-mocks/pwa-register.ts'),
        },
    },
});
