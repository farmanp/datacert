import { Component, createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { Histogram } from '../stores/profileStore';

interface MiniHistogramProps {
  histogram: Histogram;
  width?: number;
  height?: number;
  color?: string;
}

const MiniHistogram: Component<MiniHistogramProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
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
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const { bins } = props.histogram;
    const width = props.width || 120;
    const height = props.height || 32;
    const color = props.color || '#60a5fa';

    const dpr = window.devicePixelRatio || 1;
    canvasRef.width = width * dpr;
    canvasRef.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (bins.length === 0) return;

    const maxCount = Math.max(...bins.map((b) => b.count));
    const binWidth = width / bins.length;
    const gap = 1;

    bins.forEach((bin, i) => {
      const barHeight = maxCount > 0 ? (bin.count / maxCount) * height : 0;
      const x = i * binWidth;
      const y = height - barHeight;

      ctx.fillStyle = color;
      ctx.fillRect(x + gap, y, binWidth - gap * 2, barHeight);
    });
  };

  const getBinAtPosition = (clientX: number, clientY: number) => {
    if (!canvasRef) return null;
    const rect = canvasRef.getBoundingClientRect();
    const x = clientX - rect.left;
    const { bins } = props.histogram;
    const width = props.width || 120;
    const binWidth = width / bins.length;

    const binIdx = Math.floor(x / binWidth);

    if (binIdx >= 0 && binIdx < bins.length) {
      return { bin: bins[binIdx], clientX, clientY };
    }
    return null;
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
        text: `[${result.bin.start.toFixed(2)}, ${result.bin.end.toFixed(2)}]: ${result.bin.count.toLocaleString()}`,
        visible: true,
      });
    }
  };

  const handleDocumentTouchStart = (e: TouchEvent) => {
    if (!canvasRef) return;
    const touch = e.touches[0];
    const rect = canvasRef.getBoundingClientRect();

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

  onCleanup(() => {
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

  createEffect(() => draw());

  return (
    <div class="relative">
      <canvas
        ref={canvasRef}
        style={{
          width: `${props.width || 120}px`,
          height: `${props.height || 32}px`,
        }}
        onTouchStart={handleTouchStart}
        class="opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Distribution preview"
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

export default MiniHistogram;
