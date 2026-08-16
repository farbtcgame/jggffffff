import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { AdminNav } from '../../components/Admin/Nav';
import { AdminGuard } from '../../components/Admin/AdminGuard';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';

export default function AdminMintControl() {
  const { publicMintEnabled, isPaused, mintPrice, tokenDecimals, tokenSymbol, callContractMethod } = useWeb3();
  const [newPrice, setNewPrice] = useState<string>('');

  const togglePublicMint = async (enabled: boolean) => {
    await callContractMethod('setPublicMintEnabled', [enabled]);
  };

  const toggleMintPause = async (paused: boolean) => {
    await callContractMethod('setMintingPaused', [paused]);
  };

  const updatePrice = async () => {
    if (!newPrice) return;
    const parsed = ethers.parseUnits(newPrice, tokenDecimals);
    await callContractMethod('setMintPrice', [parsed]);
  };

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">PUBLIC MINT SWITCH</h3>
            <p className="text-[10px] text-zinc-500">Turns the public sale on/off (`setPublicMintEnabled`).</p>
            <div className="flex space-x-4">
              <button
                onClick={() => togglePublicMint(true)}
                disabled={publicMintEnabled}
                className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners disabled:opacity-30"
              >
                ENABLE PUBLIC MINT
              </button>
              <button
                onClick={() => togglePublicMint(false)}
                disabled={!publicMintEnabled}
                className="px-6 py-2.5 bg-red-600 text-white font-bold text-xs pixel-corners disabled:opacity-30"
              >
                DISABLE PUBLIC MINT
              </button>
            </div>
          </div>

          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">EMERGENCY MINT PAUSE</h3>
            <p className="text-[10px] text-zinc-500">Independent kill-switch (`setMintingPaused`), separate from the public-mint toggle above.</p>
            <div className="flex space-x-4">
              <button
                onClick={() => toggleMintPause(false)}
                disabled={!isPaused}
                className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners disabled:opacity-30"
              >
                UNPAUSE
              </button>
              <button
                onClick={() => toggleMintPause(true)}
                disabled={isPaused}
                className="px-6 py-2.5 bg-red-600 text-white font-bold text-xs pixel-corners disabled:opacity-30"
              >
                PAUSE MINTING
              </button>
            </div>
          </div>

          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">MINT PRICE (TOKENS PER MINT)</h3>
            <div className="space-y-3 max-w-md">
              <span className="text-xs text-zinc-500 block">
                CURRENT: {ethers.formatUnits(mintPrice, tokenDecimals)} {tokenSymbol} per NFT
              </span>
              <input
                type="text"
                placeholder="New price (e.g. 50)"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
              />
              <button onClick={updatePrice} className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners">
                UPDATE PRICE
              </button>
            </div>
          </div>
        </div>
      </AdminGuard>
    </Layout>
  );
}
