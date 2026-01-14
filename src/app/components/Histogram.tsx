import { Component, createSignal, createMemo, onMount, onCleanup, createEffect, Show } from 'solid-js';
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
  const [touchActive, setTouchActive] = createSignal(false);

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

  const getBinAtPosition = (clientX: number, clientY: number) => {
    if (!canvasRef) return null;
    const rect = canvasRef.getBoundingClientRect();
    const x = clientX - rect.left;
    const { bins } = props.data;
    const padding = { left: 10, right: 10 };
    const chartWidth = rect.width - padding.left - padding.right;
    const binWidth = chartWidth / bins.length;

    const binIdx = Math.floor((x - padding.left) / binWidth);

    if (binIdx >= 0 && binIdx < bins.length) {
      return { bin: bins[binIdx], clientX, clientY };
    }
    return null;
  };

  const handleMouseMove = (e: MouseEvent) => {
    // Don't update tooltip on mouse move if touch is active
    if (touchActive()) return;

    const result = getBinAtPosition(e.clientX, e.clientY);
    if (result) {
      setTooltip({
        x: result.clientX,
        y: result.clientY - 40,
        text: `Value: [${result.bin.start.toFixed(2)}, ${result.bin.end.toFixed(2)}] | Count: ${result.bin.count.toLocaleString()}`,
        visible: true,
      });
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const result = getBinAtPosition(touch.clientX, touch.clientY);

    if (result) {
      setTouchActive(true);
      setTooltip({
        x: result.clientX,
        y: result.clientY - 40,
        text: `Value: [${result.bin.start.toFixed(2)}, ${result.bin.end.toFixed(2)}] | Count: ${result.bin.count.toLocaleString()}`,
        visible: true,
      });
    }
  };

  const handleDocumentTouchStart = (e: TouchEvent) => {
    if (!canvasRef) return;
    const touch = e.touches[0];
    const rect = canvasRef.getBoundingClientRect();

    // Check if touch is outside the canvas
    const isOutside =
      touch.clientX < rect.left ||
      touch.clientX > rect.right ||
      touch.clientY < rect.top ||
      touch.clientY > rect.bottom;

    if (isOutside) {
      setTouchActive(false);
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  onMount(() => {
    window.addEventListener('resize', draw);
    draw();
  });

  onCleanup(() => {
    window.removeEventListener('resize', draw);
    document.removeEventListener('touchstart', handleDocumentTouchStart);
  });

  // Add/remove document touch listener when touch tooltip is active
  createEffect(() => {
    if (touchActive() && tooltip().visible) {
      document.addEventListener('touchstart', handleDocumentTouchStart);
    } else {
      document.removeEventListener('touchstart', handleDocumentTouchStart);
    }
  });

  createEffect(() => {
    props.data;
    draw();
  });

  // Generate accessible aria-label for the histogram
  const ariaLabel = createMemo(() => {
    const { bins, min, max } = props.data;
    if (bins.length === 0) return 'Empty distribution chart';

    // Find the peak bin (highest count)
    let peakBin = bins[0];
    for (const bin of bins) {
      if (bin.count > peakBin.count) {
        peakBin = bin;
      }
    }

    const formatNum = (n: number) => new Intl.NumberFormat().format(Math.round(n * 100) / 100);

    return `Distribution chart with ${bins.length} bins, range ${formatNum(min)} to ${formatNum(max)}, peak at ${formatNum(peakBin.start)}-${formatNum(peakBin.end)}`;
  });

  return (
    <div ref={containerRef} class="relative w-full">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
        onTouchStart={handleTouchStart}
        class="cursor-crosshair"
        aria-label={ariaLabel()}
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
