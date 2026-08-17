import React, { useEffect, useState } from "react";
import { fetchRewardClaimStats } from "../../lib/onchainStats";
import { WEB3_CONFIG } from "../../config/web3";

type LoadState = "LOADING" | "LOADED" | "ERROR";

/**
 * Live count of how many times Burn Lab has paid out its configured
 * reward tokens — every completed burn distributes every active reward
 * in the same transaction, so this reads directly from on-chain
 * BurnExecuted logs (no manual counter to keep in sync).
 */
export const BurnRewardClaimsCard: React.FC = () => {
  const [state, setState] = useState<LoadState>("LOADING");
  const [count, setCount] = useState(0);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const stats = await fetchRewardClaimStats();
        if (!live) return;
        setCount(stats.burnClaims);
        setState("LOADED");
      } catch {
        if (live) setState("ERROR");
      }
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      live = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="glass pixel-corners p-5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span className="label-mono">BURN REWARDS CLAIMED</span>
      </div>

      {!WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS ? (
        <p className="text-xs text-amber-400 mt-4">Burn Lab not configured yet.</p>
      ) : state === "ERROR" ? (
        <p className="text-xs text-amber-400 mt-4">Couldn&apos;t load claim stats right now.</p>
      ) : (
        <div className="mt-4">
          <div className="font-display text-2xl sm:text-3xl font-bold text-neon tabular-nums">
            {state === "LOADING" ? "···" : count.toLocaleString()}
          </div>
          <div className="label-mono mt-1">Reward payouts from Burn Lab</div>
        </div>
      )}
    </div>
  );
};
