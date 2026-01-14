import { Component, createSignal, onMount, For } from 'solid-js';
import * as duckdb from '@duckdb/duckdb-wasm';

const DuckDBSpike: Component = () => {
    const [status, setStatus] = createSignal<string>('Initializing...');
    const [log, setLog] = createSignal<string[]>([]);
    const [result, setResult] = createSignal<Record<string, unknown>[] | null>(null);

    let db: duckdb.AsyncDuckDB | null = null;

    const addLog = (msg: string) => {
        setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    onMount(async () => {
        try {
            addLog('Selecting bundle...');
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

            addLog('Fetching worker script to avoid CORS issues...');
            const workerResponse = await fetch(bundle.mainWorker!);
            const workerScript = await workerResponse.text();
            const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(workerBlob);

            const worker = new Worker(workerUrl);
            const logger = new duckdb.ConsoleLogger();
            db = new duckdb.AsyncDuckDB(logger, worker);

            addLog('Instantiating DB...');
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

            setStatus('Ready');
            addLog('DuckDB-Wasm Ready');
        } catch (err) {
            console.error(err);
            setStatus('Error: ' + (err as Error).message);
        }
    });

    const runTestQuery = async () => {
        if (!db) return;
        try {
            addLog('Running test query...');
            const conn = await db.connect();
            const res = await conn.query(`SELECT 42 as answer`);
            setResult(res.toArray().map((r) => r.toJSON()));
            await conn.close();
            addLog('Query successful');
        } catch (err) {
            console.error(err);
            addLog('Query failed: ' + (err as Error).message);
        }
    };

    const testHttpfs = async () => {
        if (!db) return;
        try {
            addLog('Testing httpfs extension...');
            const conn = await db.connect();

            // Load the extension
            await conn.query(`INSTALL httpfs; LOAD httpfs;`);
            addLog('httpfs extension loaded');

            const url = 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/penguins.csv';
            addLog(`Querying remote CSV: ${url}`);

            const startTime = performance.now();
            const res = await conn.query(`SELECT * FROM read_csv_auto('${url}') LIMIT 5`);
            const endTime = performance.now();

            setResult(res.toArray().map((r) => r.toJSON()));
            addLog(`Remote query successful in ${(endTime - startTime).toFixed(2)}ms`);

            await conn.close();
        } catch (err) {
            console.error(err);
            addLog('httpfs test failed: ' + (err as Error).message);
        }
    };

    const testLargeParquet = async () => {
        if (!db) return;
        try {
            addLog('Testing 1M row Parquet (synthetic if possible)...');
            const conn = await db.connect();

            // We can generate synthetic data in DuckDB
            addLog('Generating 1M rows in memory...');
            const startTime = performance.now();
            await conn.query(`CREATE TABLE large_table AS SELECT range as id, random() as val FROM range(1000000)`);
            const endTime = performance.now();
            addLog(`Generated 1M rows in ${(endTime - startTime).toFixed(2)}ms`);

            addLog('Running aggregation on 1M rows...');
            const aggStart = performance.now();
            const res = await conn.query(`SELECT avg(val) as average, count(*) as count FROM large_table`);
            const aggEnd = performance.now();

            setResult(res.toArray().map((r) => r.toJSON()));
            addLog(`Aggregation completed in ${(aggEnd - aggStart).toFixed(2)}ms`);

            // Check memory usage if possible (browser API)
            const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number } };
            if (perfWithMemory.memory) {
                const used = (perfWithMemory.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
                addLog(`Heap size: ${used} MB`);
            }

            await conn.close();
        } catch (err) {
            console.error(err);
            addLog('Large data test failed: ' + (err as Error).message);
        }
    };

    return (
        <div class="p-8 bg-zinc-950 text-zinc-100 min-h-screen font-sans">
            <h1 class="text-3xl font-bold mb-4 text-sky-400">DuckDB-Wasm Feasibility Spike</h1>
            <div class="mb-4">
                Status: <span class={status() === 'Ready' ? 'text-green-400' : 'text-yellow-400'}>{status()}</span>
            </div>

            <div class="flex gap-4 mb-8">
                <button
                    onClick={runTestQuery}
                    class="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded transition-colors"
                >
                    Run Test Query
                </button>
                <button
                    onClick={testHttpfs}
                    class="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded transition-colors"
                >
                    Test httpfs (Remote CSV)
                </button>
                <button
                    onClick={testLargeParquet}
                    class="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded transition-colors"
                >
                    Test 1M Rows
                </button>
            </div>

            <div class="grid grid-cols-2 gap-8">
                <div>
                    <h2 class="text-xl font-semibold mb-2 text-zinc-400">Logs</h2>
                    <div class="bg-zinc-900 p-4 rounded h-64 overflow-y-auto font-mono text-sm border border-zinc-800">
                        <For each={log()}>{(l) => <div class="mb-1">{l}</div>}</For>
                    </div>
                </div>
                <div>
                    <h2 class="text-xl font-semibold mb-2 text-zinc-400">Result</h2>
                    <pre class="bg-zinc-900 p-4 rounded h-64 overflow-y-auto font-mono text-sm border border-zinc-800 text-sky-200">
                        {JSON.stringify(
                            result(),
                            (_, v) => (typeof v === 'bigint' ? v.toString() : v),
                            2
                        )}
                    </pre>
                </div>
            </div>

            <div class="mt-8 text-sm text-zinc-500">
                <p>Bundle Info: Using JSDelivr CDN for Wasm/Worker assets to avoid Vite setup hurdles for spike.</p>
                <p>CORS Note: Remote files must have open CORS to work with read_csv_auto.</p>
            </div>
        </div>
    );
};

export default DuckDBSpike;
