import { Component, For, Show } from 'solid-js';
import { treeStore } from '../stores/treeStore';

/**
 * Detail panel showing information about selected tree node
 */
export const TreeNodeDetail: Component = () => {
  const node = () => treeStore.state.selectedNodeForDetail;

  const handleSelectThis = () => {
    const n = node();
    if (n) {
      treeStore.togglePath(n.path);
    }
  };

  const handleSelectChildren = () => {
    const n = node();
    if (n && n.children) {
      // Select all children up to limit
      const childPaths = n.children.map((c) => c.path);
      for (const path of childPaths) {
        if (!treeStore.isPathSelected(path) && treeStore.canSelectMore()) {
          treeStore.togglePath(path);
        }
      }
    }
  };

  return (
    <Show when={node()}>
      {(n) => (
        <div class="tree-node-detail bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 sticky top-6">
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Path Details</h3>
            <code class="block text-sm text-blue-600 dark:text-blue-400 font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded">
              {n().path}
            </code>
          </div>

          <div class="space-y-3 mb-6">
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600 dark:text-slate-400">Type:</span>
              <span class="text-sm font-medium text-slate-900 dark:text-white capitalize">
                {n().data_type}
              </span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600 dark:text-slate-400">Population:</span>
              <span class="text-sm font-medium text-slate-900 dark:text-white">
                {n().population.toFixed(1)}%
              </span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600 dark:text-slate-400">Depth:</span>
              <span class="text-sm font-medium text-slate-900 dark:text-white">{n().depth}</span>
            </div>

            <Show when={n().child_count > 0}>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Children:</span>
                <span class="text-sm font-medium text-slate-900 dark:text-white">
                  {n().child_count} fields
                </span>
              </div>
            </Show>
          </div>

          <Show when={n().examples && n().examples!.length > 0}>
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Example Values
              </h4>
              <ul class="space-y-1">
                <For each={n().examples!}>
                  {(example) => (
                    <li class="text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 p-1 rounded truncate">
                      {example}
                    </li>
                  )}
                </For>
              </ul>
            </div>
          </Show>

          <div class="space-y-2">
            <button
              onClick={handleSelectThis}
              class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {treeStore.isPathSelected(n().path) ? 'Deselect This Path' : 'Select This Path'}
            </button>

            <Show when={n().children && n().children!.length > 0}>
              <button
                onClick={handleSelectChildren}
                disabled={!treeStore.canSelectMore()}
                class="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                Select All Children ({n().child_count})
              </button>
            </Show>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => treeStore.selectNodeForDetail(null)}
              class="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </Show>
  );
};
