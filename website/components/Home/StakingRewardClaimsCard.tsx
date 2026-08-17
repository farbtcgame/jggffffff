import React, { useEffect, useState } from "react";
import { fetchRewardClaimStats } from "../../lib/onchainStats";
import { STAKING_CONTRACT_ADDRESS } from "../../config/web3";

type LoadState = "LOADING" | "LOADED" | "ERROR";

/**
 * Live count of how many times staking reward tokens have been claimed —
 * every claimRewards() call emits one RewardsClaimed per NFT it claimed
 * for, read directly from on-chain logs (no manual counter to keep in
 * sync).
 */
export const StakingRewardClaimsCard: React.FC = () => {
  const [state, setState] = useState<LoadState>("LOADING");
  const [count, setCount] = useState(0);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const stats = await fetchRewardClaimStats();
        if (!live) return;
        setCount(stats.stakingClaims);
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
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
        <span className="label-mono">STAKING REWARDS CLAIMED</span>
      </div>

      {!STAKING_CONTRACT_ADDRESS ? (
        <p className="text-xs text-amber-400 mt-4">Staking contract not configured yet.</p>
      ) : state === "ERROR" ? (
        <p className="text-xs text-amber-400 mt-4">Couldn&apos;t load claim stats right now.</p>
      ) : (
        <div className="mt-4">
          <div className="font-display text-2xl sm:text-3xl font-bold text-neon tabular-nums">
            {state === "LOADING" ? "···" : count.toLocaleString()}
          </div>
          <div className="label-mono mt-1">Reward payouts from the Vault</div>
        </div>
      )}
    </div>
  );
};
