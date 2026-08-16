import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Layout } from "../../components/Layout";
import { AdminNav } from "../../components/Admin/Nav";
import { AdminGuard } from "../../components/Admin/AdminGuard";
import { useWeb3 } from "../../context/Web3Context";
import { useClockIn } from "../../context/ClockInContext";
import { CLOCK_IN_CONTRACT_ADDRESS } from "../../config/web3";

function VipConfigForm({
  vipLevel,
  cfg,
  readErc20Meta,
  onSave,
  onToggleActive,
  disabled,
}: {
  vipLevel: 1 | 2 | 3;
  cfg: {
    feeToken: string;
    feeAmount: bigint;
    feeTokenSymbol: string;
    feeTokenDecimals: number;
    rewardToken: string;
    rewardTokenSymbol: string;
    rewardTokenDecimals: number;
    rewardAmountPerCycle: bigint;
    active: boolean;
  };
  readErc20Meta: (addr: string) => Promise<{ symbol: string; decimals: number } | null>;
  onSave: (feeToken: string, feeAmount: string, rewardToken: string, rewardAmount: string, active: boolean) => void;
  onToggleActive: (active: boolean) => void;
  disabled: boolean;
}) {
  const [feeToken, setFeeToken] = useState(cfg.feeToken || "");
  const [feeAmount, setFeeAmount] = useState(
    cfg.feeToken ? ethers.formatUnits(cfg.feeAmount, cfg.feeTokenDecimals) : ""
  );
  const [rewardToken, setRewardToken] = useState(cfg.rewardToken || "");
  const [rewardAmount, setRewardAmount] = useState(
    cfg.rewardToken ? ethers.formatUnits(cfg.rewardAmountPerCycle, cfg.rewardTokenDecimals) : ""
  );
  const [feePreview, setFeePreview] = useState<{ symbol: string; decimals: number } | null>(
    cfg.feeTokenSymbol ? { symbol: cfg.feeTokenSymbol, decimals: cfg.feeTokenDecimals } : null
  );
  const [rewardPreview, setRewardPreview] = useState<{ symbol: string; decimals: number } | null>(
    cfg.rewardTokenSymbol ? { symbol: cfg.rewardTokenSymbol, decimals: cfg.rewardTokenDecimals } : null
  );

  useEffect(() => {
    setFeeToken(cfg.feeToken || "");
    setFeeAmount(cfg.feeToken ? ethers.formatUnits(cfg.feeAmount, cfg.feeTokenDecimals) : "");
    setRewardToken(cfg.rewardToken || "");
    setRewardAmount(cfg.rewardToken ? ethers.formatUnits(cfg.rewardAmountPerCycle, cfg.rewardTokenDecimals) : "");
    setFeePreview(cfg.feeTokenSymbol ? { symbol: cfg.feeTokenSymbol, decimals: cfg.feeTokenDecimals } : null);
    setRewardPreview(cfg.rewardTokenSymbol ? { symbol: cfg.rewardTokenSymbol, decimals: cfg.rewardTokenDecimals } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.feeToken, cfg.rewardToken]);

  return (
    <div className="p-6 glass pixel-corners space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display font-display text-sm font-bold text-white tracking-widest">VIP {vipLevel}</h3>
        <button
          onClick={() => onToggleActive(!cfg.active)}
          disabled={disabled}
          className={`px-3 py-1 text-[10px] font-bold tracking-widest border disabled:opacity-30 ${
            cfg.active
              ? "bg-white/[0.04] border-neon/40 text-neon"
              : "bg-white/[0.04] border-white/15 text-zinc-500"
          }`}
        >
          {cfg.active ? "ACTIVE" : "INACTIVE"}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-zinc-500 tracking-widest">JOIN FEE</p>
        <input
          type="text"
          placeholder="Fee token contract address (0x...)"
          value={feeToken}
          onChange={(e) => {
            setFeeToken(e.target.value);
            setFeePreview(null);
          }}
          onBlur={async () => {
            if (ethers.isAddress(feeToken)) setFeePreview(await readErc20Meta(feeToken));
          }}
          className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
        />
        {feePreview && (
          <div className="flex justify-between text-[10px] text-zinc-400 p-2 bg-black/40 border border-white/5 pixel-corners">
            <span>TOKEN: ${feePreview.symbol}</span>
            <span>DECIMALS: {feePreview.decimals}</span>
          </div>
        )}
        <input
          type="text"
          placeholder="Fee amount (per NFT, human-readable)"
          value={feeAmount}
          onChange={(e) => setFeeAmount(e.target.value)}
          className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-zinc-500 tracking-widest">REWARD</p>
        <input
          type="text"
          placeholder="Reward token contract address (0x...)"
          value={rewardToken}
          onChange={(e) => {
            setRewardToken(e.target.value);
            setRewardPreview(null);
          }}
          onBlur={async () => {
            if (ethers.isAddress(rewardToken)) setRewardPreview(await readErc20Meta(rewardToken));
          }}
          className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
        />
        {rewardPreview && (
          <div className="flex justify-between text-[10px] text-zinc-400 p-2 bg-black/40 border border-white/5 pixel-corners">
            <span>TOKEN: ${rewardPreview.symbol}</span>
            <span>DECIMALS: {rewardPreview.decimals}</span>
          </div>
        )}
        <input
          type="text"
          placeholder="Reward amount per NFT per 24h cycle"
          value={rewardAmount}
          onChange={(e) => setRewardAmount(e.target.value)}
          className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
        />
      </div>

      <button
        onClick={() => onSave(feeToken, feeAmount, rewardToken, rewardAmount, cfg.active)}
        disabled={disabled || !feePreview || !rewardPreview || !feeAmount || !rewardAmount}
        className="w-full py-2.5 bg-neon text-black font-bold text-xs tracking-widest disabled:opacity-30"
      >
        SAVE VIP {vipLevel} CONFIG
      </button>
    </div>
  );
}

export default function AdminClockIn() {
  const { account, readErc20Meta } = useWeb3();
  const {
    clockInConfigured,
    clockInOwnerAddress,
    isClockInOwner,
    vipConfigs,
    txState,
    errorMessage,
    configureVipAdmin,
    setVipActiveAdmin,
    fundRewardsAdmin,
    withdrawRewardsAdmin,
    withdrawFeesAdmin,
  } = useClockIn();

  const [fundToken, setFundToken] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [withdrawRewardToken, setWithdrawRewardToken] = useState("");
  const [withdrawRewardAmount, setWithdrawRewardAmount] = useState("");
  const [withdrawFeeToken, setWithdrawFeeToken] = useState("");
  const [withdrawFeeAmount, setWithdrawFeeAmount] = useState("");

  const handleSaveVip = async (
    vipLevel: 1 | 2 | 3,
    feeToken: string,
    feeAmount: string,
    rewardToken: string,
    rewardAmount: string,
    active: boolean
  ) => {
    if (!ethers.isAddress(feeToken) || !ethers.isAddress(rewardToken)) return;
    const feeMeta = await readErc20Meta(feeToken);
    const rewardMeta = await readErc20Meta(rewardToken);
    if (!feeMeta || !rewardMeta) return;
    const feeRaw = ethers.parseUnits(feeAmount, feeMeta.decimals);
    const rewardRaw = ethers.parseUnits(rewardAmount, rewardMeta.decimals);
    await configureVipAdmin(vipLevel, feeToken, feeRaw, rewardToken, rewardRaw, active);
  };

  const submitFund = async () => {
    if (!fundToken || !fundAmount) return;
    const meta = await readErc20Meta(fundToken);
    if (!meta) return;
    const raw = ethers.parseUnits(fundAmount, meta.decimals);
    const ok = await fundRewardsAdmin(fundToken, raw);
    if (ok) setFundAmount("");
  };

  const submitWithdrawReward = async () => {
    if (!withdrawRewardToken || !withdrawRewardAmount) return;
    const meta = await readErc20Meta(withdrawRewardToken);
    if (!meta) return;
    const raw = ethers.parseUnits(withdrawRewardAmount, meta.decimals);
    const ok = await withdrawRewardsAdmin(withdrawRewardToken, raw);
    if (ok) setWithdrawRewardAmount("");
  };

  const submitWithdrawFees = async () => {
    if (!withdrawFeeToken || !withdrawFeeAmount) return;
    const meta = await readErc20Meta(withdrawFeeToken);
    if (!meta) return;
    const raw = ethers.parseUnits(withdrawFeeAmount, meta.decimals);
    const ok = await withdrawFeesAdmin(withdrawFeeToken, raw);
    if (ok) setWithdrawFeeAmount("");
  };

  return (
    <Layout>
      <AdminNav />
      <AdminGuard>
        <div className="space-y-6">
          {!clockInConfigured && (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
              Clock In contract address isn&apos;t configured yet — set
              NEXT_PUBLIC_CLOCK_IN_CONTRACT_ADDRESS once the contract has been deployed (see the
              staking-clockin-contracts package).
            </div>
          )}

          {clockInConfigured && account && !isClockInOwner && (
            <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs">
              Connected wallet is not the Clock In contract owner. Clock In owner: {clockInOwnerAddress}
            </div>
          )}

          <div className="p-6 border border-white/10 glass space-y-3 text-xs">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">CLOCK IN CONTRACT</h3>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-500">CONTRACT ADDRESS</span>
              <span className="text-white font-mono break-all text-right">
                {clockInConfigured ? CLOCK_IN_CONTRACT_ADDRESS : "NOT DEPLOYED"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-500">OWNER / ADMIN</span>
              <span className="text-white font-mono break-all text-right">{clockInOwnerAddress}</span>
            </div>
          </div>

          {/* VIP configuration — all 3 levels, independently configurable */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {vipConfigs.map((cfg) => (
              <VipConfigForm
                key={cfg.vipLevel}
                vipLevel={cfg.vipLevel}
                cfg={cfg}
                readErc20Meta={readErc20Meta}
                disabled={!isClockInOwner}
                onSave={(feeToken, feeAmount, rewardToken, rewardAmount, active) =>
                  handleSaveVip(cfg.vipLevel, feeToken, feeAmount, rewardToken, rewardAmount, active)
                }
                onToggleActive={(active) => setVipActiveAdmin(cfg.vipLevel, active)}
              />
            ))}
          </div>

          {/* Fund / withdraw reward pools */}
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">REWARD POOL — FUND / WITHDRAW</h3>
            <p className="text-[10px] text-zinc-600">
              Fund whichever reward token(s) your VIP levels above are configured to pay out. Each VIP level can
              use a different reward token — fund each one separately.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 glass pixel-corners space-y-2">
                <p className="text-[10px] text-zinc-500 tracking-widest">FUND</p>
                <input
                  type="text"
                  placeholder="Reward token address"
                  value={fundToken}
                  onChange={(e) => setFundToken(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
                />
                <input
                  type="text"
                  placeholder="Amount"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
                />
                <button
                  onClick={submitFund}
                  disabled={!fundToken || !fundAmount || !isClockInOwner}
                  className="w-full py-2.5 bg-neon text-black text-xs font-bold disabled:opacity-30"
                >
                  FUND POOL
                </button>
              </div>

              <div className="p-4 glass pixel-corners space-y-2">
                <p className="text-[10px] text-zinc-500 tracking-widest">WITHDRAW</p>
                <input
                  type="text"
                  placeholder="Reward token address"
                  value={withdrawRewardToken}
                  onChange={(e) => setWithdrawRewardToken(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
                />
                <input
                  type="text"
                  placeholder="Amount"
                  value={withdrawRewardAmount}
                  onChange={(e) => setWithdrawRewardAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
                />
                <button
                  onClick={submitWithdrawReward}
                  disabled={!withdrawRewardToken || !withdrawRewardAmount || !isClockInOwner}
                  className="w-full py-2.5 bg-red-900/60 border border-red-800 text-red-200 text-xs font-bold pixel-corners disabled:opacity-30"
                >
                  WITHDRAW
                </button>
              </div>
            </div>
          </div>

          {/* Registration fees */}
          <div className="p-6 glass pixel-corners space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">COLLECTED JOIN FEES</h3>
            <p className="text-[10px] text-zinc-600">
              Withdraw registration fees collected from users joining any VIP level. Available anytime.
            </p>
            <div className="p-4 glass pixel-corners space-y-2">
              <input
                type="text"
                placeholder="Fee token address"
                value={withdrawFeeToken}
                onChange={(e) => setWithdrawFeeToken(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
              />
              <input
                type="text"
                placeholder="Amount"
                value={withdrawFeeAmount}
                onChange={(e) => setWithdrawFeeAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:border-neon outline-none"
              />
              <button
                onClick={submitWithdrawFees}
                disabled={!withdrawFeeToken || !withdrawFeeAmount || !isClockInOwner}
                className="w-full py-2.5 bg-red-900/60 border border-red-800 text-red-200 text-xs font-bold pixel-corners disabled:opacity-30"
              >
                WITHDRAW FEES
              </button>
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
