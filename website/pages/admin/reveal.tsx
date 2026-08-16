import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { AdminNav } from '../../components/Admin/Nav';
import { AdminGuard } from '../../components/Admin/AdminGuard';
import { useWeb3 } from '../../context/Web3Context';

export default function AdminReveal() {
  const { baseUri, revealed, callContractMethod } = useWeb3();
  const [newUnrevealedUri, setNewUnrevealedUri] = useState('');
  const [newBaseUri, setNewBaseUri] = useState('');

  const updateUnrevealedUri = async () => {
    if (!newUnrevealedUri) return;
    await callContractMethod('setUnrevealedURI', [newUnrevealedUri]);
  };

  const triggerReveal = async () => {
    if (!newBaseUri) return;
    if (!confirm('Reveal is permanent and one-time. Continue?')) return;
    await callContractMethod('reveal', [newBaseUri]);
  };

  const refreshAllMetadata = async () => {
    await callContractMethod('refreshMetadata', []);
  };

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">CURRENT STATE</h3>
            <div className="text-xs space-y-1">
              <span className="text-zinc-500 block">STATUS</span>
              <span className={revealed ? 'text-neon font-bold' : 'text-amber-400 font-bold'}>
                {revealed ? 'REVEALED' : 'NOT REVEALED'}
              </span>
              <span className="text-zinc-500 block mt-2">{revealed ? 'BASE URI' : 'UNREVEALED URI'}</span>
              <span className="text-white font-mono block p-2 bg-black/40 border border-white/5 pixel-corners break-all">
                {baseUri || '—'}
              </span>
            </div>
          </div>

          {!revealed && (
            <div className="p-6 glass pixel-corners space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">UPDATE UNREVEALED (PLACEHOLDER) URI</h3>
              <div className="space-y-3 max-w-md">
                <input
                  type="text"
                  placeholder="ipfs://hiddenCID/hidden.json"
                  value={newUnrevealedUri}
                  onChange={(e) => setNewUnrevealedUri(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
                />
                <button onClick={updateUnrevealedUri} className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners">
                  UPDATE PLACEHOLDER URI
                </button>
              </div>
            </div>
          )}

          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">REVEAL COLLECTION (ONE-TIME, PERMANENT)</h3>
            {revealed ? (
              <p className="text-xs text-zinc-500">Already revealed — this cannot be undone or repeated.</p>
            ) : (
              <div className="space-y-3 max-w-md">
                <input
                  type="text"
                  placeholder="ipfs://revealedCID/ (must end with /)"
                  value={newBaseUri}
                  onChange={(e) => setNewBaseUri(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
                />
                <button onClick={triggerReveal} className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners">
                  REVEAL COLLECTION
                </button>
              </div>
            )}
          </div>

          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">REFRESH METADATA</h3>
            <p className="text-[10px] text-zinc-500">
              Emits an EIP-4906 signal so OpenSea and other marketplaces re-pull metadata for the whole collection. Doesn&apos;t change on-chain data — just tells marketplaces your cache is stale.
            </p>
            <button onClick={refreshAllMetadata} className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners">
              REFRESH ALL METADATA
            </button>
          </div>
        </div>
      </AdminGuard>
    </Layout>
  );
}
