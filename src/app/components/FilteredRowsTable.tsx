import { Component, For, Show } from 'solid-js';
import { drilldownStore } from '../stores/drilldownStore';

export const FilteredRowsTable: Component = () => {
    const { store } = drilldownStore;

    const highlightIndex = () => store.headers.indexOf(store.columnName);

    return (
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
            <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead class="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400 sticky top-0">
                    <tr>
                        <th class="px-3 py-2 border-b border-r dark:border-slate-700 text-right w-16 sticky left-0 bg-slate-50 dark:bg-slate-800">
                            #
                        </th>
                        <For each={store.headers}>
                            {(header) => (
                                <th
                                    class={`px-3 py-2 border-b dark:border-slate-700 whitespace-nowrap ${header === store.columnName ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : ''
                                        }`}
                                >
                                    {header}
                                </th>
                            )}
                        </For>
                    </tr>
                </thead>
                <tbody>
                    <For each={store.currentRows}>
                        {(item) => (
                            <tr class="bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td class="px-3 py-2 border-r dark:border-slate-700 font-mono text-xs text-right sticky left-0 bg-white dark:bg-slate-900">
                                    {item.index}
                                </td>
                                <For each={item.row}>
                                    {(cell, i) => (
                                        <td
                                            class={`px-3 py-2 whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis ${i() === highlightIndex()
                                                ? store.anomalyType === 'outlier'
                                                    ? 'bg-rose-500/10 dark:bg-rose-900/20 font-medium text-slate-900 dark:text-slate-200 ring-1 ring-inset ring-rose-500/20'
                                                    : 'bg-amber-50/50 dark:bg-amber-900/10 font-medium text-slate-900 dark:text-slate-200'
                                                : ''
                                                }`}
                                            title={cell}
                                        >
                                            {cell === '' ? (
                                                <span class="text-slate-400 italic font-light">null</span>
                                            ) : (
                                                <Show
                                                    when={store.anomalyType === 'pii' && i() === highlightIndex()}
                                                    fallback={cell}
                                                >
                                                    {/* Simple PII highlighting for common patterns */}
                                                    <span class="text-amber-600 dark:text-amber-400 font-semibold">{cell}</span>
                                                </Show>
                                            )}
                                        </td>
                                    )}
                                </For>
                            </tr>
                        )}
                    </For>
                    {store.currentRows.length === 0 && !store.isLoading && (
                        <tr>
                            <td colspan={store.headers.length + 1} class="px-6 py-8 text-center text-slate-500">
                                No rows to display
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
