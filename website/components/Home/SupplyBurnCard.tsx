import React, { useEffect, useState } from "react";

export const PAYOUT_STORAGE_KEY = "origin_total_payout";
const DEFAULT_PAYOUT = 1509;

export const SupplyBurnCard: React.FC = () => {
  const [payout, setPayout] = useState(DEFAULT_PAYOUT);

  useEffect(() => {
    const stored = window.localStorage.getItem(PAYOUT_STORAGE_KEY);
    const parsed = stored === null ? DEFAULT_PAYOUT : Number(stored);
    if (Number.isFinite(parsed) && parsed >= 0) setPayout(parsed);

    const sync = () => {
      const next = Number(window.localStorage.getItem(PAYOUT_STORAGE_KEY));
      if (Number.isFinite(next) && next >= 0) setPayout(next);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("origin-payout-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("origin-payout-updated", sync);
    };
  }, []);

  return (
    <div className="glass pixel-corners p-5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
        <span className="label-mono">TOTAL PAYOUT</span>
      </div>
      <div className="mt-4">
        <div className="font-display text-2xl sm:text-3xl font-bold text-neon tabular-nums">
          ${payout.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </div>
        <div className="label-mono mt-1">Configured by Admin</div>
      </div>
    </div>
  );
};

export { DEFAULT_PAYOUT };
