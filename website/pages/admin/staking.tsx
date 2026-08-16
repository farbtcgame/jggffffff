import React, { useState } from "react";
import { ethers } from "ethers";
import { Layout } from "../../components/Layout";
import { AdminNav } from "../../components/Admin/Nav";
import { AdminGuard } from "../../components/Admin/AdminGuard";
import { useWeb3 } from "../../context/Web3Context";
import { useStaking } from "../../context/StakingContext";
import { WEB3_CONFIG, STAKING_CONTRACT_ADDRESS } from "../../config/web3";

export default function AdminStaking() {
  const { account, readErc20Meta } = useWeb3();
  const {
    stakingConfigured,
    stakingOwnerAddress,
    isStakingOwner,
    rewardTokenAddress,
    rewardTokenSymbol,
    rewardTokenDecimals,
    rewardPerCycle,
    rewardPoolBalance,
    txState,
    errorMessage,
    setRewardTokenAdmin,
    setRewardPerCycleAdmin,
    fundRewardsAdmin,
    withdrawRewardsAdmin,
  } = useStaking();

  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [newTokenPreview, setNewTokenPreview] = useState<{ symbol: string; decimals: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [rewardPerCycleInput, setRewardPerCycleInput] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const fmt = (amount: bigint, decimals: number) => {
    const formatted = ethers.formatUnits(amount, decimals);
    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const previewNewToken = async () => {
    if (!ethers.isAddress(newTokenAddress)) return;
    setPreviewLoading(true);
    const meta = await readErc20Meta(newTokenAddress);
    setNewTokenPreview(meta);
    setPreviewLoading(false);
  };

  const submitSetRewardToken = async () => {
    if (!ethers.isAddress(newTokenAddress)) return;
    const ok = await setRewardTokenAdmin(newTokenAddress);
    if (ok) {
      setNewTokenAddress("");
      setNewTokenPreview(null);
    }
  };

  const submitSetRewardPerCycle = async () => {
    if (!rewardPerCycleInput) return;
    const decimals = rewardTokenDecimals || 18;
    const raw = ethers.parseUnits(rewardPerCycleInput, decimals);
    const ok = await setRewardPerCycleAdmin(raw);
    if (ok) setRewardPerCycleInput("");
  };

  const submitFund = async () => {
    if (!fundAmount || !rewardTokenAddress) return;
    const raw = ethers.parseUnits(fundAmount, rewardTokenDecimals || 18);
    const ok = await fundRewardsAdmin(rewardTokenAddress, raw);
    if (ok) setFundAmount("");
  };

  const submitWithdraw = async () => {
    if (!withdrawAmount || !rewardTokenAddress) return;
    const raw = ethers.parseUnits(withdrawAmount, rewardTokenDecimals || 18);
    const ok = await withdrawRewardsAdmin(rewardTokenAddress, raw);
    if (ok) setWithdrawAmount("");
  };

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          {!stakingConfigured && (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
              Staking contract address isn&apos;t configured yet — set
              NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS once the contract has been deployed (see the
              staking-clockin-contracts package).
            </div>
          )}

          {stakingConfigured && account && !isStakingOwner && (
            <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs">
              Connected wallet is not the Staking contract owner. Staking owner: {stakingOwnerAddress}
            </div>
          )}

          {/* CONTRACT INFO */}
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">STAKING CONTRACT</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">CONTRACT ADDRESS</span>
                <span className="text-white font-mono break-all text-right">
                  {stakingConfigured ? STAKING_CONTRACT_ADDRESS : "NOT DEPLOYED"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">OWNER / ADMIN</span>
                <span className="text-white font-mono break-all text-right">{stakingOwnerAddress}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500">CYCLE LENGTH</span>
                <span className="text-white">24 hours</span>
              </div>
            </div>
          </div>

          {/* REWARD TOKEN */}
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">REWARD TOKEN</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2 bg-black/40 border border-white/5 pixel-corners">
                <span className="text-[10px] text-zinc-500 block">CURRENT TOKEN</span>
                <span className="text-white font-bold">{rewardTokenSymbol ? `$${rewardTokenSymbol}` : "NOT SET"}</span>
              </div>
              <div className="p-2 bg-black/40 border border-white/5 pixel-corners">
                <span className="text-[10px] text-zinc-500 block">REWARD / NFT / CYCLE</span>
                <span className="text-neon font-bold">
                  {rewardTokenSymbol ? `${fmt(rewardPerCycle, rewardTokenDecimals)} $${rewardTokenSymbol}` : "—"}
                </span>
              </div>
              <div className="p-2 bg-black/40 border border-white/5 pixel-corners">
                <span className="text-[10px] text-zinc-500 block">POOL BALANCE</span>
                <span className="text-white font-bold">
                  {rewardTokenSymbol ? `${fmt(rewardPoolBalance, rewardTokenDecimals)} $${rewardTokenSymbol}` : "—"}
                </span>
              </div>
            </div>

            {/* Set reward token */}
            <div className="p-4 glass pixel-corners space-y-3">
              <p className="text-[10px] text-zinc-500 tracking-widest">SET REWARD TOKEN</p>
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
              <button
                onClick={submitSetRewardToken}
                disabled={!newTokenPreview || !isStakingOwner}
                className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners disabled:opacity-30"
              >
                SAVE REWARD TOKEN
              </button>
            </div>

            {/* Reward per cycle */}
            <div className="p-4 glass pixel-corners space-y-3">
              <p className="text-[10px] text-zinc-500 tracking-widest">
                REWARD PER NFT PER 24H CYCLE (default: 100)
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g. 100"
                  value={rewardPerCycleInput}
                  onChange={(e) => setRewardPerCycleInput(e.target.value)}
                  className="flex-1 bg-black border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
                />
                <button
                  onClick={submitSetRewardPerCycle}
                  disabled={!rewardPerCycleInput || !isStakingOwner}
                  className="px-6 py-2.5 bg-white/[0.04] border border-white/15 text-white text-xs font-bold disabled:opacity-30"
                >
                  UPDATE
                </button>
              </div>
            </div>

            {/* Fund */}
            <div className="p-4 glass pixel-corners space-y-3">
              <p className="text-[10px] text-zinc-500 tracking-widest">FUND REWARD POOL</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Amount to fund"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  disabled={!rewardTokenAddress}
                  className="flex-1 bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none disabled:opacity-40"
                />
                <button
                  onClick={submitFund}
                  disabled={!fundAmount || !rewardTokenAddress || !isStakingOwner}
                  className="px-6 py-2.5 bg-neon text-black text-xs font-bold disabled:opacity-30"
                >
                  FUND
                </button>
              </div>
              <p className="text-[10px] text-zinc-600">
                Requires an on-chain ERC20 approval first — handled automatically in one flow above.
              </p>
            </div>

            {/* Withdraw */}
            <div className="p-4 glass pixel-corners space-y-3">
              <p className="text-[10px] text-zinc-500 tracking-widest">WITHDRAW FROM REWARD POOL</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Amount to withdraw"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={!rewardTokenAddress}
                  className="flex-1 bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none disabled:opacity-40"
                />
                <button
                  onClick={submitWithdraw}
                  disabled={!withdrawAmount || !rewardTokenAddress || !isStakingOwner}
                  className="px-6 py-2.5 bg-red-900/60 border border-red-800 text-red-200 text-xs font-bold disabled:opacity-30"
                >
                  WITHDRAW
                </button>
              </div>
            </div>
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
