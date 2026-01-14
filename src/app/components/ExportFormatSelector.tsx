import { Component, createSignal, For, Show } from 'solid-js';
import { ProfileResult } from '../stores/profileStore';
import {
    generateHTMLReport,
    generateJSONReport,
    generateCSVReport,
    generateMarkdownSummary,
    generateGXSuiteJSON,
    generateSodaChecksYAML,
    generateJsonSchemaReport,
    downloadFile,
} from '../utils/exportReport';
import { copyToClipboard } from '../utils/clipboard';

export type ExportFormat =
    | 'html'
    | 'json'
    | 'csv'
    | 'markdown'
    | 'great-expectations'
    | 'soda-checks'
    | 'json-schema';

interface ExportFormatSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    profileResult: ProfileResult;
    fileName: string;
    fileSize: number;
}

interface FormatOption {
    id: ExportFormat;
    label: string;
    description: string;
    extension: string;
    requiresTolerance: boolean;
    requiresTableName: boolean;
    icon: string;
    iconClass: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
    {
        id: 'html',
        label: 'Interactive HTML',
        description: 'Complete visual report for sharing with stakeholders',
        extension: 'html',
        requiresTolerance: false,
        requiresTableName: false,
        icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
        iconClass: 'text-blue-400',
    },
    {
        id: 'markdown',
        label: 'Markdown Summary',
        description: 'Copy formatted summary to paste in GitHub PRs, Jira, Slack',
        extension: 'md',
        requiresTolerance: false,
        requiresTableName: false,
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        iconClass: 'text-emerald-400',
    },
    {
        id: 'json',
        label: 'Data Profile (JSON)',
        description: 'Raw profiling data for programmatic consumption',
        extension: 'json',
        requiresTolerance: false,
        requiresTableName: false,
        icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        iconClass: 'text-purple-400',
    },
    {
        id: 'csv',
        label: 'Column Stats (CSV)',
        description: 'Tabular statistics for use in spreadsheet applications',
        extension: 'csv',
        requiresTolerance: false,
        requiresTableName: false,
        icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        iconClass: 'text-orange-400',
    },
    {
        id: 'great-expectations',
        label: 'Great Expectations Suite',
        description: 'Validation rules for Python-based data quality pipelines',
        extension: 'json',
        requiresTolerance: true,
        requiresTableName: false,
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
        iconClass: 'text-yellow-400',
    },
    {
        id: 'soda-checks',
        label: 'Soda Checks (YAML)',
        description: 'Quality checks for SodaCL monitoring scripts',
        extension: 'yaml',
        requiresTolerance: true,
        requiresTableName: true,
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        iconClass: 'text-cyan-400',
    },
    {
        id: 'json-schema',
        label: 'JSON Schema',
        description: 'Structural validation schema inferred from data',
        extension: 'json',
        requiresTolerance: false,
        requiresTableName: false,
        icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
        iconClass: 'text-pink-400',
    }
];

export const ExportFormatSelector: Component<ExportFormatSelectorProps> = (props) => {
    const [selectedFormat, setSelectedFormat] = createSignal<ExportFormat>('html');
    const [tolerance, setTolerance] = createSignal(10);
    const [tableName, setTableName] = createSignal('');
    const [isExporting, setIsExporting] = createSignal(false);
    const [showToast, setShowToast] = createSignal(false);

    const getBaseFilename = () => props.fileName.split('.')[0];

    createSignal(() => {
        if (props.isOpen && !tableName()) {
            setTableName(getBaseFilename().replace(/[^a-zA-Z0-9_]/g, '_'));
        }
    });

    const currentOption = () => FORMAT_OPTIONS.find(o => o.id === selectedFormat())!;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const results = props.profileResult;
            const filename = props.fileName;
            const baseDir = getBaseFilename();
            const format = selectedFormat();

            switch (format) {
                case 'html': {
                    const html = await generateHTMLReport(results, filename);
                    downloadFile(html, `${baseDir}_profile.html`, 'text/html');
                    break;
                }
                case 'json': {
                    const json = generateJSONReport(results, filename, {
                        fileSize: props.fileSize,
                        processingTimeMs: 0
                    });
                    downloadFile(json, `${baseDir}_profile.json`, 'application/json');
                    break;
                }
                case 'csv': {
                    const csv = generateCSVReport(results);
                    downloadFile(csv, `${baseDir}_stats.csv`, 'text/csv');
                    break;
                }
                case 'markdown': {
                    const md = generateMarkdownSummary(results, filename);
                    await copyToClipboard(md);
                    setShowToast(true);
                    setTimeout(() => {
                        setShowToast(false);
                        props.onClose();
                    }, 1500);
                    break;
                }
                case 'great-expectations': {
                    const gx = generateGXSuiteJSON(results, filename, {
                        suiteName: `${baseDir}_quality_suite`,
                        tolerance: tolerance() / 100
                    });
                    downloadFile(gx, `${baseDir}_expectations.json`, 'application/json');
                    break;
                }
                case 'soda-checks': {
                    const soda = generateSodaChecksYAML(results, {
                        tableName: tableName() || 'data_table',
                        tolerancePct: tolerance(),
                        includeWarnings: true
                    });
                    downloadFile(soda, `soda_checks_${tableName() || 'data'}.yaml`, 'application/x-yaml');
                    break;
                }
                case 'json-schema': {
                    const schema = generateJsonSchemaReport(results, filename);
                    downloadFile(schema, `${baseDir}_schema.json`, 'application/json');
                    break;
                }
            }
            props.onClose();
        } catch (err) {
            console.error('Export failed', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Show when={props.isOpen}>
            <div
                class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={props.onClose}
            >
                <div
                    class="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div class="px-8 py-6 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                        <div>
                            <h3 class="text-xl font-black text-white tracking-tight">Export Profile</h3>
                            <p class="text-slate-400 text-xs mt-1 uppercase tracking-widest font-bold">Choose your adventure</p>
                        </div>
                        <button
                            onClick={props.onClose}
                            class="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                        >
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2">
                        {/* Format List */}
                        <div class="p-6 border-r border-slate-700 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <For each={FORMAT_OPTIONS}>
                                {(option) => (
                                    <button
                                        onClick={() => setSelectedFormat(option.id)}
                                        class={`w-full text-left p-4 rounded-2xl transition-all group flex items-start gap-4 border ${selectedFormat() === option.id
                                            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40 translate-x-1'
                                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-700'
                                            }`}
                                    >
                                        <div class={`mt-1 p-2 rounded-xl bg-slate-900/50 ${option.iconClass}`}>
                                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d={option.icon} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p class={`text-sm font-bold ${selectedFormat() === option.id ? 'text-white' : 'text-slate-200'}`}>
                                                {option.label}
                                            </p>
                                            <p class={`text-[11px] leading-relaxed mt-1 ${selectedFormat() === option.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                                {option.description}
                                            </p>
                                        </div>
                                    </button>
                                )}
                            </For>
                        </div>

                        {/* Configuration */}
                        <div class="p-8 bg-slate-900/30 flex flex-col justify-between">
                            <div class="space-y-8">
                                <Show when={currentOption().requiresTableName}>
                                    <div class="space-y-3">
                                        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Dataset Name</label>
                                        <input
                                            type="text"
                                            value={tableName()}
                                            onInput={(e) => setTableName(e.currentTarget.value)}
                                            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-sm"
                                            placeholder="e.g. users_table"
                                        />
                                    </div>
                                </Show>

                                <Show when={currentOption().requiresTolerance}>
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between">
                                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tolerance Threshold</label>
                                            <span class="text-sm font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">{tolerance()}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="50"
                                            step="1"
                                            value={tolerance()}
                                            onInput={(e) => setTolerance(parseInt(e.currentTarget.value))}
                                            class="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                        <div class="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                            <p class="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-2">Preview Logic</p>
                                            <p class="text-[11px] text-slate-300 italic leading-relaxed">
                                                {selectedFormat() === 'great-expectations'
                                                    ? `Expect values to be between ${100 - tolerance()}% and ${100 + tolerance()}% of current boundaries.`
                                                    : `Soda checks will warn/fail if metrics deviate by more than ${tolerance()}% from profiled baseline.`}
                                            </p>
                                        </div>
                                    </div>
                                </Show>

                                <Show when={!currentOption().requiresTolerance && !currentOption().requiresTableName}>
                                    <div class="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
                                        <div class={`p-4 rounded-3xl bg-slate-800 border border-slate-700/50 ${currentOption().iconClass}`}>
                                            <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d={currentOption().icon} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p class="text-slate-200 font-bold">{currentOption().label}</p>
                                            <p class="text-[11px] text-slate-500 mt-2 max-w-[200px]">No additional configuration required for this format.</p>
                                        </div>
                                    </div>
                                </Show>
                            </div>

                            <div class="mt-8 space-y-4">
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting()}
                                    class="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-widest hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-900/20 disabled:opacity-50 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    <Show when={isExporting()}>
                                        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    </Show>
                                    {isExporting() ? 'Extracting...' : selectedFormat() === 'markdown' ? 'Copy to Clipboard' : `Download .${currentOption().extension}`}
                                </button>
                                <p class="text-center text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                                    Files are generated locally in your browser
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            <Show when={showToast()}>
                <div class="fixed bottom-8 right-8 z-[10001] animate-fade-in">
                    <div class="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-sm">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="font-bold text-sm">Copied to clipboard!</span>
                    </div>
                </div>
            </Show>
        </Show>
    );
};
