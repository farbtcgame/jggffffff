import React from 'react';
import { Layout } from '../components/Layout';
import { HourlyCountdownCard } from '../components/Home/HourlyCountdownCard';
import { SupplyBurnCard } from '../components/Home/SupplyBurnCard';
import { TokenBurnCard } from '../components/Home/TokenBurnCard';
import { BurnRewardClaimsCard } from '../components/Home/BurnRewardClaimsCard';
import { StakingRewardClaimsCard } from '../components/Home/StakingRewardClaimsCard';
import { TokenTicker } from '../components/Home/TokenTicker';
import { CollectionGallery } from '../components/Home/CollectionGallery';
import { EcosystemGuide } from '../components/Home/EcosystemGuide';

export default function Home() {
  return (
    <Layout>
      <div className="space-y-10">
        {/* Title */}
        <div className="border-b border-white/10 pb-6">
          <div className="glass pixel-corners inline-flex items-center gap-2 px-3 py-1.5 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse-glow" />
            <span className="label-mono">Robinhood Chain · Live Terminal</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
            ORIGIN <span className="gradient-text">PUNK</span> TERMINAL
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-3 max-w-xl">
            Live collection stats, token burns, and real-time activity for the 404 Origin ecosystem.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HourlyCountdownCard />
          <SupplyBurnCard />
          <TokenBurnCard />
        </div>

        {/* Reward claim cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BurnRewardClaimsCard />
          <StakingRewardClaimsCard />
        </div>

        {/* Scrolling token ticker */}
        <TokenTicker />

        {/* NFT gallery */}
        <CollectionGallery />

        {/* How staking/burn work + weekly reward rotation + liquidity note */}
        <EcosystemGuide />
      </div>
    </Layout>
  );
}
