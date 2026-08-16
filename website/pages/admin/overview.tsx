import React from 'react';
import { Layout } from '../../components/Layout';
import { AdminNav } from '../../components/Admin/Nav';
import { AdminGuard } from '../../components/Admin/AdminGuard';
import { useWeb3 } from '../../context/Web3Context';
import { WEB3_CONFIG } from '../../config/web3';
import { ethers } from 'ethers';

export default function AdminOverview() {
  const { totalSupply, maxSupply, mintPrice, isPaused, publicMintEnabled, ownerAddress, tokenSymbol, tokenDecimals, royaltyFeeBps } = useWeb3();

  const priceFormatted = ethers.formatUnits(mintPrice, tokenDecimals);
  const mintLive = publicMintEnabled && !isPaused;

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white tracking-widest">SYSTEM OVERVIEW</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 glass pixel-corners">
              <span className="text-[10px] text-zinc-500 block">COLLECTION NAME</span>
              <span className="font-display text-sm font-bold text-white">404 ORIGIN</span>
            </div>

            <div className="p-4 glass pixel-corners">
              <span className="text-[10px] text-zinc-500 block">MINT STATUS</span>
              <span className={mintLive ? 'text-neon font-bold text-sm' : 'text-amber-400 font-bold text-sm'}>
                ● {mintLive ? 'LIVE' : 'PAUSED'}
              </span>
            </div>

            <div className="p-4 glass pixel-corners">
              <span className="text-[10px] text-zinc-500 block">CURRENT COST</span>
              <span className="font-display text-sm font-bold text-neon">
                {priceFormatted} {tokenSymbol}
              </span>
            </div>

            <div className="p-4 glass pixel-corners">
              <span className="text-[10px] text-zinc-500 block">ROYALTY</span>
              <span className="font-display text-sm font-bold text-white">{(royaltyFeeBps / 100).toFixed(2)}%</span>
            </div>
          </div>

          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">CONTRACT SPECIFICATIONS</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">CONTRACT ADDRESS</span>
                <span className="text-white font-mono">{WEB3_CONFIG.NFT_CONTRACT_ADDRESS}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">CONTRACT OWNER</span>
                <span className="text-white font-mono">{ownerAddress}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">MINT SUPPLY STATE</span>
                <span className="text-white">
                  {totalSupply.toString()} / {maxSupply.toString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </AdminGuard>
    </Layout>
  );
}
