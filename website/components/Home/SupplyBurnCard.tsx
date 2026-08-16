import React, { useEffect, useState } from "react";
import { fetchSupplyStats } from "../../lib/onchainStats";

type LoadState = "LOADING" | "LOADED" | "ERROR";

export const SupplyBurnCard: React.FC = () => {
  const [state, setState] = useState<LoadState>("LOADING");
  const [totalSupply, setTotalSupply] = useState<bigint>(BigInt(0));
  const [maxSupply, setMaxSupply] = useState<bigint>(BigInt(0));
  const [burned, setBurned] = useState<bigint>(BigInt(0));

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const stats = await fetchSupplyStats();
        if (!live) return;
        setTotalSupply(stats.totalSupply);
        setMaxSupply(stats.maxSupply);
        setBurned(stats.nftBurned);
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

  const fmt = (n: bigint) => n.toLocaleString();

  return (
    <div className="glass pixel-corners p-5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
        <span className="label-mono">NFT Collection</span>
      </div>

      {state === "ERROR" ? (
        <p className="text-xs text-amber-400 mt-4">Couldn&apos;t load on-chain supply right now.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {state === "LOADING" ? "···" : fmt(totalSupply)}
            </div>
            <div className="label-mono mt-1">
              Current Supply{maxSupply > BigInt(0) ? ` / ${fmt(maxSupply)}` : ""}
            </div>
          </div>
          <div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-neon tabular-nums">
              {state === "LOADING" ? "···" : fmt(burned)}
            </div>
            <div className="label-mono mt-1">Total Burned</div>
          </div>
        </div>
      )}
    </div>
  );
};
