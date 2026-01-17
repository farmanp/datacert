import { Component, For, createSignal, Show } from 'solid-js';

interface SheetSelectorProps {
  sheets: string[];
  selectedSheet: string | null;
  onSelect: (sheetName: string) => void;
}

const SheetSelector: Component<SheetSelectorProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <div class="relative w-full max-w-xs">
      <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        Select Sheet
      </label>
      <div class="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen())}
          class="w-full bg-slate-800 border border-slate-700 text-slate-200 py-2.5 px-4 rounded-xl text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <span class="truncate block font-medium">
            {props.selectedSheet || 'Select a sheet...'}
          </span>
          <svg
            class={`w-4 h-4 text-slate-400 transition-transform ${isOpen() ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <Show when={isOpen()}>
          <div class="absolute z-50 mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in duration-150">
            <For each={props.sheets}>
              {(sheet) => (
                <button
                  type="button"
                  onClick={() => {
                    props.onSelect(sheet);
                    setIsOpen(false);
                  }}
                  class={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-slate-700/50 last:border-0 flex items-center gap-2
                    ${
                      props.selectedSheet === sheet
                        ? 'bg-blue-500/10 text-blue-400 font-bold'
                        : 'text-slate-300 hover:bg-slate-700'
                    }
                  `}
                >
                  <svg
                    class="w-4 h-4 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {sheet}
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default SheetSelector;
