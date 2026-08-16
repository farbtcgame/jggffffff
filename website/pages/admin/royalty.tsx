import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { AdminNav } from '../../components/Admin/Nav';
import { AdminGuard } from '../../components/Admin/AdminGuard';
import { useWeb3 } from '../../context/Web3Context';

export default function AdminRoyalty() {
  const { royaltyFeeBps, callContractMethod, account } = useWeb3();
  const [receiver, setReceiver] = useState('');
  const [feePercent, setFeePercent] = useState('');

  const updateRoyalty = async () => {
    if (!receiver || !feePercent) return;
    const bps = Math.round(parseFloat(feePercent) * 100); // 5% -> 500 bps
    if (bps < 0 || bps > 10000) {
      alert('Fee must be between 0% and 100%.');
      return;
    }
    await callContractMethod('setRoyaltyInfo', [receiver, bps]);
  };

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">SECONDARY SALE COMMISSION (ERC-2981)</h3>
            <div className="text-xs space-y-1">
              <span className="text-zinc-500 block">CURRENT ROYALTY</span>
              <span className="text-neon font-bold text-sm">{(royaltyFeeBps / 100).toFixed(2)}%</span>
            </div>

            <p className="text-[10px] text-zinc-500 leading-relaxed">
              This sets the on-chain royalty signal (ERC-2981) that marketplaces read when a token resells. It tells them what % and which wallet should receive it — actual payment still depends on each marketplace choosing to honor it; it isn&apos;t something a smart contract alone can force.
            </p>

            <div className="space-y-3 max-w-md pt-2">
              <label className="text-[10px] text-zinc-500 block">RECEIVER WALLET</label>
              <input
                type="text"
                placeholder="0x..."
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
              />
              <label className="text-[10px] text-zinc-500 block">FEE (%)</label>
              <input
                type="text"
                placeholder="e.g. 5"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
              />
              <button onClick={updateRoyalty} className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners">
                UPDATE ROYALTY
              </button>
            </div>
          </div>
        </div>
      </AdminGuard>
    </Layout>
  );
}
