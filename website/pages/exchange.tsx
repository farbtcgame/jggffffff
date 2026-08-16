import React from "react";
import { Layout } from "../components/Layout";
import { ExchangeSwapCard } from "../components/ExchangeSwapCard";
import { SWAP_ROUTER_ADDRESS, WEB3_CONFIG } from "../config/web3";

// Exchange status is driven by whether a real router contract is
// configured — never by a countdown timer alone. A date can pass while
// nothing has actually been deployed, which would show fake liquidity/
// swaps; gating on SWAP_ROUTER_ADDRESS keeps the page honest.
export default function ExchangePage() {
  const exchangeLive = !!SWAP_ROUTER_ADDRESS;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h1 className="font-display text-xl font-bold text-white tracking-widest uppercase">Exchange</h1>
          <p className="text-xs text-zinc-500 mt-1">
            SWAP interface — {WEB3_CONFIG.CHAIN_NAME} MAINNET only
          </p>
        </div>

        {exchangeLive ? (
          <div className="space-y-4">
            <div className="p-3 border border-neon/40 bg-neon/10 text-neon text-xs font-bold tracking-wider uppercase">
              Exchange is live
            </div>
            <ExchangeSwapCard />
          </div>
        ) : (
          <div className="p-4 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
            <span className="font-bold tracking-widest uppercase">Status: Pending</span>
            <p className="mt-1 text-zinc-400 normal-case tracking-normal">
              The Exchange router contract hasn&apos;t been deployed yet — set
              NEXT_PUBLIC_SWAP_ROUTER_ADDRESS once it is, and this page will switch to live
              swaps automatically.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
