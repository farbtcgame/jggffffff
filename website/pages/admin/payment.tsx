import React from 'react';
import { Layout } from '../../components/Layout';
import { AdminNav } from '../../components/Admin/Nav';
import { AdminGuard } from '../../components/Admin/AdminGuard';
import { useWeb3 } from '../../context/Web3Context';
import { WEB3_CONFIG } from '../../config/web3';

export default function AdminPayment() {
  const { tokenSymbol, tokenDecimals } = useWeb3();

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">PAYMENT SPECIFICATIONS</h3>
            <p className="text-[10px] text-zinc-500">
              The mint payment token is fixed by design and not exposed as an admin control. Use the MINT CONTROL tab to change how many tokens are required per mint.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">PAYMENT TYPE</span>
                <span className="text-white">ERC-20 TOKEN (FIXED)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">TOKEN SYMBOL</span>
                <span className="text-neon font-bold">{tokenSymbol}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">TOKEN DECIMALS</span>
                <span className="text-white">{tokenDecimals}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">TOKEN ADDRESS</span>
                <span className="text-white font-mono">{WEB3_CONFIG.MINT_TOKEN_ADDRESS}</span>
              </div>
            </div>
          </div>
        </div>
      </AdminGuard>
    </Layout>
  );
}
