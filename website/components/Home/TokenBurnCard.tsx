import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { fetchTokenBurnStats } from "../../lib/onchainStats";

type LoadState = "LOADING" | "LOADED" | "ERROR";

export const TokenBurnCard: React.FC = () => {
  const [state, setState] = useState<LoadState>("LOADING");
  const [burned, setBurned] = useState("0");
  const [symbol, setSymbol] = useState("ORIGIN");
  const [percent, setPercent] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const stats = await fetchTokenBurnStats();
        if (!live) return;
        const formatted = parseFloat(ethers.formatUnits(stats.burned, stats.decimals));
        setBurned(formatted.toLocaleString(undefined, { maximumFractionDigits: 2 }));
        // Displayed as $ORIGIN per the current rebrand, regardless of the
        // on-chain symbol string.
        setSymbol("ORIGIN");
        if (stats.totalSupply > BigInt(0)) {
          const pct = (Number(stats.burned) / Number(stats.totalSupply)) * 100;
          setPercent(pct.toFixed(2));
        }
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
        <span className="h-1.5 w-1.5 rounded-full bg-neon" />
        <span className="label-mono">Token Burn</span>
      </div>

      {state === "ERROR" ? (
        <p className="text-xs text-amber-400 mt-4">Couldn&apos;t load token burn stats right now.</p>
      ) : (
        <div className="mt-4">
          <div className="font-display text-2xl sm:text-3xl font-bold text-neon tabular-nums truncate">
            {state === "LOADING" ? "···" : burned}
          </div>
          <div className="label-mono mt-1">
            ${symbol} Burned{percent ? ` · ${percent}% of supply` : ""}
          </div>
        </div>
      )}
    </div>
  );
};
