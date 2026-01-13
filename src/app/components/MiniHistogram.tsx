import { Component, createEffect } from 'solid-js';
import { Histogram } from '../stores/profileStore';

interface MiniHistogramProps {
  histogram: Histogram;
  width?: number;
  height?: number;
  color?: string;
}

const MiniHistogram: Component<MiniHistogramProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;

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

  createEffect(() => draw());

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${props.width || 120}px`,
        height: `${props.height || 32}px`,
      }}
      class="opacity-80 hover:opacity-100 transition-opacity"
    />
  );
};

export default MiniHistogram;
