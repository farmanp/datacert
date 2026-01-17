import { Component, createSignal, createMemo, For, Show } from 'solid-js';

export interface CorrelationMatrixData {
  columns: string[];
  matrix: number[][];
}

interface CorrelationMatrixProps {
  data: CorrelationMatrixData;
}

/**
 * Get color for correlation value on scale from -1 (red) to 0 (white) to +1 (green)
 */
function getCorrelationColor(value: number): string {
  // Clamp value to [-1, 1]
  const v = Math.max(-1, Math.min(1, value));

  if (v >= 0) {
    // Positive correlation: white to green
    // 0 -> white (255, 255, 255)
    // 1 -> green (34, 197, 94) - Tailwind emerald-500
    const intensity = v;
    const r = Math.round(255 - (255 - 34) * intensity);
    const g = Math.round(255 - (255 - 197) * intensity);
    const b = Math.round(255 - (255 - 94) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Negative correlation: white to red
    // 0 -> white (255, 255, 255)
    // -1 -> red (239, 68, 68) - Tailwind red-500
    const intensity = -v;
    const r = Math.round(255 - (255 - 239) * intensity);
    const g = Math.round(255 - (255 - 68) * intensity);
    const b = Math.round(255 - (255 - 68) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Get text color (dark or light) based on background color for contrast
 */
function getTextColor(value: number): string {
  const absValue = Math.abs(value);
  // Use dark text for light backgrounds (values close to 0)
  // Use light text for dark backgrounds (values close to +/-1)
  return absValue > 0.5 ? 'text-white' : 'text-slate-800';
}

const CorrelationMatrix: Component<CorrelationMatrixProps> = (props) => {
  const [hoveredCell, setHoveredCell] = createSignal<{
    row: number;
    col: number;
    value: number;
    rowName: string;
    colName: string;
  } | null>(null);

  const cellSize = createMemo(() => {
    const n = props.data.columns.length;
    // Adjust cell size based on number of columns
    if (n <= 5) return 'min-w-[60px] h-[60px]';
    if (n <= 10) return 'min-w-[50px] h-[50px]';
    if (n <= 15) return 'min-w-[40px] h-[40px]';
    return 'min-w-[32px] h-[32px]';
  });

  const fontSize = createMemo(() => {
    const n = props.data.columns.length;
    if (n <= 5) return 'text-sm';
    if (n <= 10) return 'text-xs';
    return 'text-[10px]';
  });

  const headerFontSize = createMemo(() => {
    const n = props.data.columns.length;
    if (n <= 5) return 'text-xs';
    if (n <= 10) return 'text-[10px]';
    return 'text-[8px]';
  });

  // Truncate column name for display
  const truncateName = (name: string, maxLen: number = 10) => {
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen - 1) + '...';
  };

  return (
    <div class="relative">
      {/* Legend */}
      <div class="flex items-center justify-end gap-4 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">-1</span>
          <div
            class="w-32 h-3 rounded"
            style={{
              background:
                'linear-gradient(to right, rgb(239, 68, 68), rgb(255, 255, 255), rgb(34, 197, 94))',
            }}
          />
          <span class="text-xs text-slate-400">+1</span>
        </div>
      </div>

      {/* Matrix */}
      <div class="overflow-x-auto">
        <table class="border-collapse">
          {/* Header row */}
          <thead>
            <tr>
              <th class="p-1" /> {/* Empty corner cell */}
              <For each={props.data.columns}>
                {(colName) => (
                  <th
                    class={`p-1 ${headerFontSize()} text-slate-300 font-medium text-center`}
                    style={{ 'writing-mode': 'vertical-rl', 'text-orientation': 'mixed' }}
                    title={colName}
                  >
                    {truncateName(colName, 15)}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={props.data.matrix}>
              {(row, rowIndex) => (
                <tr>
                  {/* Row header */}
                  <td
                    class={`p-1 ${headerFontSize()} text-slate-300 font-medium text-right pr-2`}
                    title={props.data.columns[rowIndex()]}
                  >
                    {truncateName(props.data.columns[rowIndex()], 15)}
                  </td>
                  {/* Cells */}
                  <For each={row}>
                    {(value, colIndex) => (
                      <td
                        class={`${cellSize()} ${fontSize()} ${getTextColor(value)} text-center font-mono cursor-pointer transition-all border border-slate-700/30 hover:border-slate-500 hover:z-10 relative`}
                        style={{ 'background-color': getCorrelationColor(value) }}
                        onMouseEnter={() =>
                          setHoveredCell({
                            row: rowIndex(),
                            col: colIndex(),
                            value,
                            rowName: props.data.columns[rowIndex()],
                            colName: props.data.columns[colIndex()],
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${props.data.columns[rowIndex()]} vs ${props.data.columns[colIndex()]}: ${value.toFixed(3)}`}
                      >
                        {value.toFixed(2)}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      <Show when={hoveredCell()}>
        {(cell) => (
          <div
            class="fixed z-50 pointer-events-none bg-slate-900/95 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div class="font-semibold text-blue-400 mb-1">
              {cell().rowName} vs {cell().colName}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">Correlation:</span>
              <span
                class={`font-mono font-bold ${
                  cell().value > 0.5
                    ? 'text-emerald-400'
                    : cell().value < -0.5
                      ? 'text-red-400'
                      : 'text-slate-200'
                }`}
              >
                {cell().value.toFixed(4)}
              </span>
            </div>
            <div class="text-xs text-slate-500 mt-1">
              {cell().value > 0.7
                ? 'Strong positive'
                : cell().value > 0.3
                  ? 'Moderate positive'
                  : cell().value > 0
                    ? 'Weak positive'
                    : cell().value > -0.3
                      ? 'Weak negative'
                      : cell().value > -0.7
                        ? 'Moderate negative'
                        : 'Strong negative'}
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default CorrelationMatrix;
