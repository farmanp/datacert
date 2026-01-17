import { Component, Show, createSignal } from 'solid-js';

interface AvroSchemaViewerProps {
  schema: string;
}

const AvroSchemaViewer: Component<AvroSchemaViewerProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);

  return (
    <div class="w-full bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-500/20 rounded-lg">
            <svg
              class="w-6 h-6 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Avro Schema</h3>
            <p class="text-sm text-slate-400">Extracted from file header</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded())}
          class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold transition-colors"
        >
          {isExpanded() ? 'Hide Schema' : 'View Schema'}
        </button>
      </div>

      <Show when={isExpanded()}>
        <div class="bg-slate-900 rounded-xl border border-slate-700 p-4 overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <pre class="text-xs text-indigo-200 font-mono leading-relaxed">{props.schema}</pre>
        </div>
      </Show>
    </div>
  );
};

export default AvroSchemaViewer;
