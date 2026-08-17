import React, { useEffect, useState } from "react";
import { fetchStakedCount } from "../../lib/onchainStats";
import { STAKING_CONTRACT_ADDRESS } from "../../config/web3";

type LoadState = "LOADING" | "LOADED" | "ERROR";

/**
 * Live count of how many NFTs from the whole collection are currently
 * staked. The staking contract is the custodian of every staked NFT, so
 * its own balanceOf() on the NFT collection is exactly this count —
 * always in sync with the chain, no admin input needed.
 */
export const TokenBurnCard: React.FC = () => {
  const [state, setState] = useState<LoadState>("LOADING");
  const [staked, setStaked] = useState<bigint>(BigInt(0));

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const count = await fetchStakedCount();
        if (!live) return;
        setStaked(count);
        setState("LOADED");
      } catch {
        if (live) setState("ERROR");
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      live = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="glass pixel-corners p-5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-neon" />
        <span className="label-mono">NFTS STAKED</span>
      </div>

      {!STAKING_CONTRACT_ADDRESS ? (
        <p className="text-xs text-amber-400 mt-4">Staking contract not configured yet.</p>
      ) : state === "ERROR" ? (
        <p className="text-xs text-amber-400 mt-4">Couldn&apos;t load staking stats right now.</p>
      ) : (
        <div className="mt-4">
          <div className="font-display text-2xl sm:text-3xl font-bold text-neon tabular-nums">
            {state === "LOADING" ? "···" : staked.toString()}
          </div>
          <div className="label-mono mt-1">Live from chain · currently in the Vault</div>
        </div>
      )}
    </div>
  );
};
