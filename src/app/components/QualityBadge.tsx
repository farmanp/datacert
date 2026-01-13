import { Component, createMemo } from 'solid-js';

interface QualityBadgeProps {
  missingPercentage: number;
}

const QualityBadge: Component<QualityBadgeProps> = (props) => {
  const status = createMemo(() => {
    const p = props.missingPercentage;
    if (p < 5) return 'excellent';
    if (p < 20) return 'warning';
    return 'critical';
  });

  const styles = {
    excellent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <span class={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status()]}`}>
      {props.missingPercentage.toFixed(1)}% missing
    </span>
  );
};

export default QualityBadge;
