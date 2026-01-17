import { Component } from 'solid-js';

/**
 * PrivacyBadge Component
 *
 * A reasurring UI element that confirms data stays local.
 * Features a subtle animation and a detailed tooltip on hover.
 */
const PrivacyBadge: Component<{ class?: string }> = (props) => {
  return (
    <div
      class={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-help transition-all hover:bg-emerald-500/20 ${props.class || ''}`}
      aria-label="Local Processing: Data never leaves your device"
    >
      {/* Pulse Dot */}
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>

      <span class="text-[10px] sm:text-xs font-semibold tracking-wide uppercase whitespace-nowrap">
        Local Processing
      </span>

      {/* Tooltip */}
      <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2.5 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <p class="text-xs text-slate-200 leading-relaxed text-center">
          <span class="font-bold text-emerald-400 block mb-1">Privacy Safe</span>
          Your data is processed locally in your browser. It is never uploaded to any server.
        </p>
        {/* Tooltip Arrow */}
        <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
};

export default PrivacyBadge;
