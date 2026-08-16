import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { AdminNav } from '../../components/Admin/Nav';
import { AdminGuard } from '../../components/Admin/AdminGuard';
import { useWeb3 } from '../../context/Web3Context';
import { WEB3_CONFIG } from '../../config/web3';
import { ethers } from 'ethers';
import { DEFAULT_PAYOUT, PAYOUT_STORAGE_KEY } from '../../components/Home/SupplyBurnCard';

export default function AdminOverview() {
  const { totalSupply, maxSupply, mintPrice, isPaused, publicMintEnabled, ownerAddress, tokenSymbol, tokenDecimals, royaltyFeeBps } = useWeb3();
  const [payout, setPayout] = useState(DEFAULT_PAYOUT);
  const [payoutInput, setPayoutInput] = useState(String(DEFAULT_PAYOUT));

  useEffect(() => {
    const stored = window.localStorage.getItem(PAYOUT_STORAGE_KEY);
    const value = stored === null ? DEFAULT_PAYOUT : Number(stored);
    if (Number.isFinite(value) && value >= 0) {
      setPayout(value);
      setPayoutInput(String(value));
    }
  }, []);

  const savePayout = () => {
    const value = Number(payoutInput);
    if (!Number.isFinite(value) || value < 0) return;
    setPayout(value);
    window.localStorage.setItem(PAYOUT_STORAGE_KEY, String(value));
    window.dispatchEvent(new Event('origin-payout-updated'));
  };

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
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">Homepage Total Payout</h3>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <label className="flex-1 text-xs text-zinc-500">
                Amount in USD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payoutInput}
                  onChange={(event) => setPayoutInput(event.target.value)}
                  className="mt-2 w-full bg-white/[0.04] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </label>
              <button type="button" onClick={savePayout} className="px-5 py-2.5 bg-neon text-black text-xs font-bold">
                SAVE ${payout.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">Saved locally in this browser. No API is used.</p>
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
