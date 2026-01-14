import { Component, createMemo } from 'solid-js';

interface QualityBadgeProps {
  missingPercentage: number;
  onClick?: () => void;
}

const QualityBadge: Component<QualityBadgeProps> = (props) => {
  const status = createMemo(() => {
    const p = props.missingPercentage;
    if (p < 10) return 'excellent';
    if (p <= 25) return 'warning';
    return 'critical';
  });

  const statusLabel = createMemo(() => {
    const s = status();
    if (s === 'excellent') return 'Excellent';
    if (s === 'warning') return 'Warning';
    return 'Critical';
  });

  const styles = {
    excellent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <button
      onClick={() => props.onClick?.()}
      disabled={!props.onClick}
      class={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status()]} ${props.onClick ? 'cursor-pointer hover:bg-opacity-20 transition-colors' : 'cursor-default'}`}
    >
      {statusLabel()} - {props.missingPercentage.toFixed(1)}% missing
    </button>
  );
};

export default QualityBadge;
