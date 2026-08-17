import React, { useEffect, useState } from "react";
import { fetchSupplyStats } from "../../lib/onchainStats";

type LoadState = "LOADING" | "LOADED" | "ERROR";

/**
 * Live count of how many NFTs from the whole collection have been burned
 * (i.e. currently held at the dead address). Reads directly from the NFT
 * contract's own balanceOf(DEAD_ADDRESS) — always in sync with the chain,
 * no admin input needed.
 */
export const SupplyBurnCard: React.FC = () => {
  const [state, setState] = useState<LoadState>("LOADING");
  const [nftBurned, setNftBurned] = useState<bigint>(BigInt(0));
  const [totalSupply, setTotalSupply] = useState<bigint>(BigInt(0));

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const stats = await fetchSupplyStats();
        if (!live) return;
        setNftBurned(stats.nftBurned);
        setTotalSupply(stats.totalSupply);
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

  const percent =
    totalSupply > BigInt(0) ? ((Number(nftBurned) / Number(totalSupply)) * 100).toFixed(2) : null;

  return (
    <div className="glass pixel-corners p-5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
        <span className="label-mono">NFTS BURNED</span>
      </div>

      {state === "ERROR" ? (
        <p className="text-xs text-amber-400 mt-4">Couldn&apos;t load burn stats right now.</p>
      ) : (
        <div className="mt-4">
          <div className="font-display text-2xl sm:text-3xl font-bold text-neon tabular-nums">
            {state === "LOADING" ? "···" : nftBurned.toString()}
          </div>
          <div className="label-mono mt-1">
            Live from chain{percent ? ` · ${percent}% of collection` : ""}
          </div>
        </div>
      )}
    </div>
  );
};
