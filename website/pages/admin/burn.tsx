import React, { useState } from "react";
import { ethers } from "ethers";
import { Layout } from "../../components/Layout";
import { AdminNav } from "../../components/Admin/Nav";
import { AdminGuard } from "../../components/Admin/AdminGuard";
import { useWeb3 } from "../../context/Web3Context";
import { WEB3_CONFIG } from "../../config/web3";

export default function AdminBurnLab() {
  const {
    account,
    isBurnLabOwner,
    burnLabConfigured,
    burnLabOwnerAddress,
    burnRewards,
    burnRewardsLoading,
    txState,
    errorMessage,
    addBurnReward,
    updateBurnRewardAmount,
    setBurnRewardActive,
    loadBurnRewardTokens,
    withdrawBurnRewardTokens,
    readErc20Meta,
  } = useWeb3();

  // Add reward form
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [newTokenAmount, setNewTokenAmount] = useState("");
  const [newTokenPreview, setNewTokenPreview] = useState<{ symbol: string; decimals: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Per-reward form state, keyed by token address
  const [updateAmounts, setUpdateAmounts] = useState<Record<string, string>>({});
  const [loadAmounts, setLoadAmounts] = useState<Record<string, string>>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, string>>({});

  const previewNewToken = async () => {
    if (!ethers.isAddress(newTokenAddress)) return;
    setPreviewLoading(true);
    const meta = await readErc20Meta(newTokenAddress);
    setNewTokenPreview(meta);
    setPreviewLoading(false);
  };

  const submitAddReward = async () => {
    if (!newTokenPreview || !newTokenAmount) return;
    const raw = ethers.parseUnits(newTokenAmount, newTokenPreview.decimals);
    const ok = await addBurnReward(newTokenAddress, raw);
    if (ok) {
      setNewTokenAddress("");
      setNewTokenAmount("");
      setNewTokenPreview(null);
    }
  };

  const submitUpdateAmount = async (token: string, decimals: number) => {
    const value = updateAmounts[token];
    if (!value) return;
    const raw = ethers.parseUnits(value, decimals);
    await updateBurnRewardAmount(token, raw);
  };

  const submitLoadTokens = async (token: string, decimals: number) => {
    const value = loadAmounts[token];
    if (!value) return;
    const raw = ethers.parseUnits(value, decimals);
    const ok = await loadBurnRewardTokens(token, raw);
    if (ok) setLoadAmounts((prev) => ({ ...prev, [token]: "" }));
  };

  const submitWithdraw = async (token: string, decimals: number) => {
    const value = withdrawAmounts[token];
    if (!value) return;
    const raw = ethers.parseUnits(value, decimals);
    await withdrawBurnRewardTokens(token, raw);
  };

  const fmt = (amount: bigint, decimals: number) => {
    const formatted = ethers.formatUnits(amount, decimals);
    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          {!burnLabConfigured && (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
              Burn Lab contract address isn&apos;t configured yet — set
              NEXT_PUBLIC_BURN_LAB_CONTRACT_ADDRESS once the contract has been deployed.
            </div>
          )}

          {burnLabConfigured && account && !isBurnLabOwner && (
            <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs">
              Connected wallet is not the Burn Lab contract owner. Burn Lab owner: {burnLabOwnerAddress}
            </div>
          )}

          {/* BURN LAB CONTRACT */}
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">BURN LAB CONTRACT</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">CONTRACT ADDRESS</span>
                <span className="text-white font-mono break-all text-right">
                  {burnLabConfigured ? WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS : "NOT DEPLOYED"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">OWNER / ADMIN</span>
                <span className="text-white font-mono break-all text-right">{burnLabOwnerAddress}</span>
              </div>
            </div>
          </div>

          {/* REWARD TOKENS */}
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">REWARD TOKENS</h3>

            {/* Add reward */}
            <div className="p-4 glass pixel-corners space-y-3">
              <p className="text-[10px] text-zinc-500 tracking-widest">ADD REWARD</p>
              <input
                type="text"
                placeholder="Reward token contract address (0x...)"
                value={newTokenAddress}
                onChange={(e) => {
                  setNewTokenAddress(e.target.value);
                  setNewTokenPreview(null);
                }}
                onBlur={previewNewToken}
                className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
              />
              {previewLoading && <p className="text-[10px] text-zinc-500 animate-pulse">Reading token…</p>}
              {newTokenPreview && (
                <div className="flex justify-between text-[10px] text-zinc-400 p-2 bg-black/40 border border-white/5 pixel-corners">
                  <span>TOKEN: ${newTokenPreview.symbol}</span>
                  <span>DECIMALS: {newTokenPreview.decimals}</span>
                </div>
              )}
              <input
                type="text"
                placeholder="Reward amount per NFT (human-readable, e.g. 5)"
                value={newTokenAmount}
                onChange={(e) => setNewTokenAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
              />
              <button
                onClick={submitAddReward}
                disabled={!newTokenPreview || !newTokenAmount || !isBurnLabOwner}
                className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners disabled:opacity-30"
              >
                SAVE REWARD
              </button>
            </div>

            {/* Existing reward cards */}
            {burnRewardsLoading ? (
              <p className="text-xs text-zinc-500 animate-pulse">Loading reward configuration…</p>
            ) : burnRewards.length === 0 ? (
              <p className="text-xs text-zinc-500">No reward tokens configured yet.</p>
            ) : (
              <div className="space-y-4">
                {burnRewards.map((r) => (
                  <div key={r.token} className="p-4 glass pixel-corners space-y-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <p className="font-display text-sm font-bold text-white">${r.symbol}</p>
                        <p className="text-[10px] text-zinc-500 font-mono break-all">{r.token}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-[10px] font-bold tracking-widest border ${
                          r.active
                            ? "bg-white/[0.04] border-neon/40 text-neon"
                            : "bg-white/[0.04] border-white/15 text-zinc-500"
                        }`}
                      >
                        {r.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-2 bg-black/40 border border-white/5 pixel-corners">
                        <span className="text-[10px] text-zinc-500 block">REWARD / NFT</span>
                        <span className="text-xs text-white">{fmt(r.amountPerNFT, r.decimals)} {r.symbol}</span>
                      </div>
                      <div className="p-2 bg-black/40 border border-white/5 pixel-corners">
                        <span className="text-[10px] text-zinc-500 block">CONTRACT BALANCE</span>
                        <span className="text-xs text-white">{fmt(r.contractBalance, r.decimals)} {r.symbol}</span>
                      </div>
                      <div className="p-2 bg-black/40 border border-white/5 pixel-corners">
                        <span className="text-[10px] text-zinc-500 block">LOADED</span>
                        <span className="text-xs text-white">{fmt(r.totalLoaded, r.decimals)} {r.symbol}</span>
                      </div>
                      <div className="p-2 bg-black/40 border border-white/5 pixel-corners">
                        <span className="text-[10px] text-zinc-500 block">AVAILABLE REWARDS</span>
                        <span className="text-xs text-neon font-bold">{r.availableCapacity.toString()} NFTs</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="New reward / NFT"
                        value={updateAmounts[r.token] || ""}
                        onChange={(e) => setUpdateAmounts((prev) => ({ ...prev, [r.token]: e.target.value }))}
                        className="flex-1 bg-black/40 border border-white/10 p-2 text-xs text-white focus:border-neon outline-none"
                      />
                      <button
                        onClick={() => submitUpdateAmount(r.token, r.decimals)}
                        disabled={!isBurnLabOwner}
                        className="px-4 py-2 bg-white/5 border border-white/15 text-white text-[10px] font-bold tracking-widest pixel-corners disabled:opacity-30"
                      >
                        UPDATE
                      </button>
                      <button
                        onClick={() => setBurnRewardActive(r.token, !r.active)}
                        disabled={!isBurnLabOwner}
                        className="px-4 py-2 bg-white/5 border border-white/15 text-white text-[10px] font-bold tracking-widest pixel-corners disabled:opacity-30"
                      >
                        {r.active ? "DISABLE" : "ENABLE"}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Amount to load"
                        value={loadAmounts[r.token] || ""}
                        onChange={(e) => setLoadAmounts((prev) => ({ ...prev, [r.token]: e.target.value }))}
                        className="flex-1 bg-black/40 border border-white/10 p-2 text-xs text-white focus:border-neon outline-none"
                      />
                      <button
                        onClick={() => submitLoadTokens(r.token, r.decimals)}
                        disabled={!isBurnLabOwner}
                        className="px-4 py-2 bg-neon text-black text-[10px] font-bold tracking-widest disabled:opacity-30"
                      >
                        LOAD TOKENS
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Amount to withdraw"
                        value={withdrawAmounts[r.token] || ""}
                        onChange={(e) => setWithdrawAmounts((prev) => ({ ...prev, [r.token]: e.target.value }))}
                        className="flex-1 bg-black/40 border border-white/10 p-2 text-xs text-white focus:border-neon outline-none"
                      />
                      <button
                        onClick={() => submitWithdraw(r.token, r.decimals)}
                        disabled={!isBurnLabOwner}
                        className="px-4 py-2 bg-red-900/60 border border-red-800 text-red-200 text-[10px] font-bold tracking-widest disabled:opacity-30"
                      >
                        WITHDRAW REMAINING
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BURN DESTINATION */}
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">BURN DESTINATION</h3>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              This Burn Lab contract never takes custody of NFTs. Every burned NFT is
              transferred directly and permanently to the dead address
              0x000000000000000000000000000000000000dEaD and cannot be recovered by anyone,
              including this admin panel.
            </p>
          </div>

          {txState !== "IDLE" && (
            <div className="p-3 text-xs glass pixel-corners text-zinc-400">
              STATUS: {txState}
              {txState === "TRANSACTION_FAILED" && errorMessage ? ` — ${errorMessage}` : ""}
            </div>
          )}
        </div>
      </AdminGuard>
    </Layout>
  );
}
