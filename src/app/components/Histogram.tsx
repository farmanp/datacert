import { Component, createSignal, onMount, onCleanup, createEffect, Show } from 'solid-js';
import { Histogram as HistogramData } from '../stores/profileStore';

interface HistogramProps {
  data: HistogramData;
  height?: number;
}

const Histogram: Component<HistogramProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  const [tooltip, setTooltip] = createSignal<{
    x: number;
    y: number;
    text: string;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    text: '',
    visible: false,
  });

  const draw = () => {
    if (!canvasRef || !containerRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const width = containerRef.clientWidth;
    const height = props.height || 200;
    const dpr = window.devicePixelRatio || 1;

    canvasRef.width = width * dpr;
    canvasRef.height = height * dpr;
    canvasRef.style.width = `${width}px`;
    canvasRef.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const { bins } = props.data;
    if (bins.length === 0) return;

    const maxCount = Math.max(...bins.map((b) => b.count));
    const padding = { top: 20, bottom: 30, left: 10, right: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const binWidth = chartWidth / bins.length;
    const gap = 2;

    ctx.clearRect(0, 0, width, height);

    // Draw bars
    bins.forEach((bin, i) => {
      const barHeight = maxCount > 0 ? (bin.count / maxCount) * chartHeight : 0;
      const x = padding.left + i * binWidth;
      const y = height - padding.bottom - barHeight;

      const grad = ctx.createLinearGradient(x, y, x, height - padding.bottom);
      grad.addColorStop(0, '#60a5fa');
      grad.addColorStop(1, '#3b82f6');

      ctx.fillStyle = grad;
      ctx.beginPath();
      if ('roundRect' in ctx && typeof ctx.roundRect === 'function') {
        ctx.roundRect(x + gap, y, binWidth - gap * 2, barHeight, [4, 4, 0, 0]);
      } else {
        ctx.rect(x + gap, y, binWidth - gap * 2, barHeight);
      }
      ctx.fill();
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(new Intl.NumberFormat().format(props.data.min), padding.left, height - 10);
    ctx.textAlign = 'right';
    ctx.fillText(
      new Intl.NumberFormat().format(props.data.max),
      width - padding.right,
      height - 10,
    );
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { bins } = props.data;
    const padding = { left: 10, right: 10 };
    const chartWidth = rect.width - padding.left - padding.right;
    const binWidth = chartWidth / bins.length;

    const binIdx = Math.floor((x - padding.left) / binWidth);

    if (binIdx >= 0 && binIdx < bins.length) {
      const bin = bins[binIdx];
      setTooltip({
        x: e.clientX,
        y: e.clientY - 40,
        text: `Value: [${bin.start.toFixed(2)}, ${bin.end.toFixed(2)}] | Count: ${bin.count.toLocaleString()}`,
        visible: true,
      });
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  onMount(() => {
    window.addEventListener('resize', draw);
    draw();
  });

  onCleanup(() => {
    window.removeEventListener('resize', draw);
  });

  createEffect(() => {
    props.data;
    draw();
  });

  return (
    <div ref={containerRef} class="relative w-full">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
        class="cursor-crosshair"
      />
      <Show when={tooltip().visible}>
        <div
          class="fixed z-50 pointer-events-none bg-slate-900/95 text-white text-[10px] px-2 py-1 rounded border border-slate-700 shadow-xl backdrop-blur-md"
          style={{
            left: `${tooltip().x + 10}px`,
            top: `${tooltip().y}px`,
          }}
        >
          {tooltip().text}
        </div>
      </Show>
    </div>
  );
};

export default Histogram;
