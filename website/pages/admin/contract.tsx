import React from 'react';
import { Layout } from '../../components/Layout';
import { AdminNav } from '../../components/Admin/Nav';
import { AdminGuard } from '../../components/Admin/AdminGuard';
import { useWeb3 } from '../../context/Web3Context';
import { WEB3_CONFIG } from '../../config/web3';

export default function AdminContract() {
  const { ownerAddress, totalSupply, maxSupply, baseUri, revealed } = useWeb3();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">CONTRACT METADATA</h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-500 block">NFT CONTRACT ADDRESS</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-mono p-2 bg-black/40 border border-white/5 pixel-corners flex-1 break-all">
                    {WEB3_CONFIG.NFT_CONTRACT_ADDRESS}
                  </span>
                  <button
                    onClick={() => copyToClipboard(WEB3_CONFIG.NFT_CONTRACT_ADDRESS)}
                    className="px-3 py-2 bg-white/[0.06] border border-white/10 text-white font-bold pixel-corners"
                  >
                    COPY
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-500 block">CHAIN ID</span>
                  <span className="text-white font-bold">{WEB3_CONFIG.CHAIN_ID}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">NETWORK</span>
                  <span className="text-white font-bold">{WEB3_CONFIG.CHAIN_NAME}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">OWNER</span>
                  <span className="text-white font-mono break-all">{ownerAddress}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">MAX SUPPLY</span>
                  <span className="text-white font-bold">{maxSupply.toString()}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">MINTED</span>
                  <span className="text-white font-bold">{totalSupply.toString()}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">REVEALED</span>
                  <span className="text-white font-bold">{revealed ? 'YES' : 'NO'}</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-500 block">{revealed ? 'BASE URI' : 'UNREVEALED URI'}</span>
                <span className="text-white font-mono break-all">{baseUri}</span>
              </div>

              <div className="pt-2">
                <a
                  href={`${WEB3_CONFIG.EXPLORER_URL}/address/${WEB3_CONFIG.NFT_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-4 py-2 border border-neon/40 text-neon hover:bg-neon/10 font-bold"
                >
                  VIEW ON BLOCK EXPLORER ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </AdminGuard>
    </Layout>
  );
}
