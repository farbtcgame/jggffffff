import React from "react";
import { useCountdown, pad2 } from "../lib/countdown";

interface CountdownProps {
  target: string | number | undefined | null;
  label?: string;
  /** Rendered once remainingMs hits zero. */
  completeState?: React.ReactNode;
}

const Unit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex-1 min-w-[64px] border border-white/10 bg-black/30 py-3 text-center">
    <div className="text-2xl md:text-3xl font-bold text-neon tabular-nums">{pad2(value)}</div>
    <div className="text-[10px] text-zinc-500 tracking-widest mt-1 uppercase">{label}</div>
  </div>
);

/** Full Days / Hours / Minutes / Seconds countdown block, terminal-styled. */
export const Countdown: React.FC<CountdownProps> = ({ target, label, completeState }) => {
  const { days, hours, minutes, seconds, isComplete, isConfigured } = useCountdown(target);

  if (!isConfigured) {
    return (
      <div className="p-4 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
        Countdown target is not configured yet.
      </div>
    );
  }

  if (isComplete) {
    return <>{completeState}</>;
  }

  return (
    <div className="space-y-2">
      {label && <div className="text-[10px] text-zinc-500 tracking-widest uppercase">{label}</div>}
      <div className="flex gap-2 md:gap-3">
        <Unit value={days} label="Days" />
        <Unit value={hours} label="Hrs" />
        <Unit value={minutes} label="Min" />
        <Unit value={seconds} label="Sec" />
      </div>
    </div>
  );
};

/** Compact "Dd Hh Mm" badge for use inline, e.g. in the terminal nav menu. */
export const CountdownBadge: React.FC<{ target: string | number | undefined | null }> = ({ target }) => {
  const { days, hours, minutes, isComplete, isConfigured } = useCountdown(target);

  if (!isConfigured) return null;

  if (isComplete) {
    return (
      <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-neon text-black">
        LIVE
      </span>
    );
  }

  return (
    <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold tracking-wider border border-white/15 text-zinc-400 tabular-nums">
      {days}D {pad2(hours)}H {pad2(minutes)}M
    </span>
  );
};
