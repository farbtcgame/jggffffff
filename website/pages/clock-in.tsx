import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { useWeb3 } from "../context/Web3Context";
import { useClockIn, VipLevelConfig } from "../context/ClockInContext";
import { WEB3_CONFIG, ALCHEMY_API_KEY } from "../config/web3";
import { fetchOwnedMiniBrokers, OwnedNft } from "../lib/alchemyNfts";
import { ethers } from "ethers";

type LoadState = "IDLE" | "LOADING" | "LOADED" | "ERROR";

const VIP_DESCRIPTIONS: Record<number, string> = {
  1: "Entry-level clock in. Register your 404 Origin NFTs to start earning a steady reward every 24 hours — your NFT never leaves your wallet.",
  2: "Mid-tier clock in with a higher reward rate per NFT. A great step up once you're comfortable with how clocking in works.",
  3: "Top-tier clock in for the most committed holders — the highest reward per NFT, per completed 24-hour cycle.",
};

/**
 * Per-tier visual theme. Only styling/markup differs between tiers — every
 * prop, computation, handler and disabled/enabled condition below is
 * unchanged from the original single-design card.
 */
const VIP_TIER_THEME: Record<
  1 | 2 | 3,
  {
    tag: string;
    outerClass: string;
    badgeActive: string;
    badgeInactive: string;
    titleClass: string;
    tagClass: string;
    statBoxClass: string;
    statLabelClass: string;
    feeValueClass: string;
    rewardValueClass: string;
    selectAllBtnClass: string;
    nftIdleClass: string;
    nftSelectedClass: string;
    joinBtnClass: string;
    claimBtnClass: string;
    dividerClass: string;
    registeredLabelClass: string;
  }
> = {
  1: {
    tag: "STANDARD",
    outerClass: "relative border border-white/15/70 glass overflow-hidden",
    badgeActive: "bg-zinc-100/10 text-zinc-100 border-zinc-400/50",
    badgeInactive: "bg-white/[0.04] text-zinc-500 border-white/15",
    titleClass: "text-lg font-bold text-white tracking-wide",
    tagClass: "text-[10px] text-zinc-500 tracking-[0.2em]",
    statBoxClass: "p-2 bg-black/40 border border-white/5 pixel-corners",
    statLabelClass: "text-[10px] text-zinc-500 block",
    feeValueClass: "text-white font-bold",
    rewardValueClass: "text-neon font-bold",
    selectAllBtnClass:
      "px-2 py-1 border border-white/15 text-[10px] font-bold tracking-widest text-zinc-300 hover:border-zinc-100 hover:text-white transition-colors",
    nftIdleClass: "border-white/10 bg-black/30 hover:border-zinc-600",
    nftSelectedClass: "border-zinc-100 bg-white/[0.04]",
    joinBtnClass:
      "w-full py-2.5 bg-zinc-100 text-black font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors",
    claimBtnClass:
      "w-full py-2.5 bg-white/[0.04] border border-white/15 text-white font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:border-zinc-100 transition-colors",
    dividerClass: "border-white/5",
    registeredLabelClass: "text-[10px] text-zinc-500 tracking-widest",
  },
  2: {
    tag: "ELITE",
    outerClass: "relative border border-amber-500/40 glass vip-elite-clip overflow-hidden",
    badgeActive: "bg-amber-500/10 text-amber-400 border-amber-500/50",
    badgeInactive: "bg-white/[0.04] text-zinc-500 border-white/15",
    titleClass: "text-lg font-bold text-white tracking-wide",
    tagClass: "text-[10px] text-amber-500 tracking-[0.2em]",
    statBoxClass: "p-2 bg-black/30 border border-amber-900/30",
    statLabelClass: "text-[10px] text-zinc-500 block",
    feeValueClass: "text-white font-bold",
    rewardValueClass: "text-neon font-bold",
    selectAllBtnClass:
      "px-2 py-1 border border-amber-700/50 text-[10px] font-bold tracking-widest text-amber-300 hover:border-amber-400 hover:text-amber-300 transition-colors",
    nftIdleClass: "border-white/10 bg-black/30 hover:border-amber-700/60",
    nftSelectedClass: "border-amber-400 bg-amber-500/5",
    joinBtnClass:
      "w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:from-amber-300 hover:to-yellow-400 transition-colors",
    claimBtnClass:
      "w-full py-2.5 bg-white/[0.04] border border-amber-700/50 text-white font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:border-amber-400 transition-colors",
    dividerClass: "border-amber-900/30",
    registeredLabelClass: "text-[10px] text-amber-500/80 tracking-widest",
  },
  3: {
    tag: "APEX",
    outerClass: "relative border border-neon/50 glass vip-apex-glow overflow-hidden",
    badgeActive: "bg-neon text-black border-neon font-bold",
    badgeInactive: "bg-white/[0.04] text-zinc-500 border-white/15",
    titleClass: "text-lg font-bold text-white tracking-wide drop-shadow-[0_0_10px_rgba(204,255,0,0.35)]",
    tagClass: "text-[10px] text-neon tracking-[0.2em]",
    statBoxClass: "p-2 bg-black/30 border border-neon/20",
    statLabelClass: "text-[10px] text-zinc-500 block",
    feeValueClass: "text-white font-bold",
    rewardValueClass: "text-neon font-bold drop-shadow-[0_0_6px_rgba(204,255,0,0.5)]",
    selectAllBtnClass:
      "px-2 py-1 border border-neon/40 text-[10px] font-bold tracking-widest text-neon hover:bg-neon/10 transition-colors",
    nftIdleClass: "border-white/10 bg-black/30 hover:border-neon/50",
    nftSelectedClass: "border-neon bg-neon/5 shadow-[0_0_10px_rgba(204,255,0,0.25)]",
    joinBtnClass:
      "w-full py-2.5 bg-neon text-black font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neon/80 transition-colors shadow-[0_0_15px_rgba(204,255,0,0.2)]",
    claimBtnClass:
      "w-full py-2.5 bg-white/[0.04] border border-neon/50 text-white font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:border-neon transition-colors",
    dividerClass: "border-neon/15",
    registeredLabelClass: "text-[10px] text-neon/80 tracking-widest",
  },
};

function VipCard({
  cfg,
  ownedNfts,
  registeredTokenIds,
  registrationsByToken,
  fmt,
  onJoin,
  onClaim,
  busy,
}: {
  cfg: VipLevelConfig;
  ownedNfts: OwnedNft[];
  registeredTokenIds: string[];
  registrationsByToken: Record<string, { pendingAmount: bigint; active: boolean }>;
  fmt: (amount: bigint, decimals: number) => string;
  onJoin: (vipLevel: 1 | 2 | 3, tokenIds: string[]) => void;
  onClaim: (tokenIds: string[]) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // NFTs owned but not currently registered under ANY vip level are eligible to join this one.
  const eligibleNfts = useMemo(
    () => ownedNfts.filter((n) => !registeredTokenIds.includes(n.tokenId)),
    [ownedNfts, registeredTokenIds]
  );

  const myRegisteredForThisVip = useMemo(
    () =>
      Object.entries(registrationsByToken)
        .filter(([, r]) => r.active)
        .map(([tokenId]) => tokenId),
    [registrationsByToken]
  );

  const totalClaimable = useMemo(
    () => myRegisteredForThisVip.reduce((sum, id) => sum + (registrationsByToken[id]?.pendingAmount || BigInt(0)), BigInt(0)),
    [myRegisteredForThisVip, registrationsByToken]
  );

  const toggle = (tokenId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => (prev.size === eligibleNfts.length ? new Set() : new Set(eligibleNfts.map((n) => n.tokenId))));
  };

  const theme = VIP_TIER_THEME[cfg.vipLevel];

  return (
    <div className={theme.outerClass}>
      {/* Tier-specific decorative header strip */}
      {cfg.vipLevel === 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white/20" />
            <span className="w-2 h-2 bg-white/20" />
            <span className="w-2 h-2 bg-white/20" />
          </div>
          <span className="text-[9px] text-zinc-600 tracking-widest font-mono">404ORIGIN://VIP-01</span>
        </div>
      )}
      {cfg.vipLevel === 2 && (
        <div className="h-[3px] w-full bg-gradient-to-r from-amber-700 via-amber-300 to-amber-700" />
      )}
      {cfg.vipLevel === 3 && (
        <>
          <div className="h-[6px] w-full vip-apex-stripes" />
          <div className="absolute -right-11 top-4 rotate-45 bg-neon text-black text-[9px] font-bold tracking-widest px-11 py-0.5 shadow-[0_0_10px_rgba(204,255,0,0.4)]">
            TOP TIER
          </div>
        </>
      )}

      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              {cfg.vipLevel === 2 && <span className="inline-block w-2 h-2 rotate-45 bg-amber-400" />}
              <h3 className={theme.titleClass}>VIP {cfg.vipLevel}</h3>
            </div>
            <p className={`${theme.tagClass} mt-0.5`}>[ {theme.tag} ]</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">{VIP_DESCRIPTIONS[cfg.vipLevel]}</p>
          </div>
          <span
            className={`px-2.5 py-1 text-[10px] font-bold tracking-widest border whitespace-nowrap ${
              cfg.active ? theme.badgeActive : theme.badgeInactive
            }`}
          >
            {cfg.active ? "● OPEN" : "● NOT CONFIGURED"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={theme.statBoxClass}>
            <span className={theme.statLabelClass}>JOIN FEE</span>
            <span className={theme.feeValueClass}>
              {cfg.feeTokenSymbol ? `${fmt(cfg.feeAmount, cfg.feeTokenDecimals)} $${cfg.feeTokenSymbol}` : "—"}
            </span>
          </div>
          <div className={theme.statBoxClass}>
            <span className={theme.statLabelClass}>REWARD / NFT / 24H</span>
            <span className={theme.rewardValueClass}>
              {cfg.rewardTokenSymbol ? `${fmt(cfg.rewardAmountPerCycle, cfg.rewardTokenDecimals)} $${cfg.rewardTokenSymbol}` : "—"}
            </span>
          </div>
        </div>

        <div className="text-[10px] text-zinc-600 font-mono break-all">
          REWARD TOKEN: {cfg.rewardToken && cfg.rewardToken !== ethers.ZeroAddress ? cfg.rewardToken : "NOT CONFIGURED"}
        </div>

        {/* Eligible NFTs to join with */}
        <div className={`space-y-2 pt-2 border-t ${theme.dividerClass}`}>
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-zinc-500 tracking-widest">SELECT NFTS TO JOIN</p>
            {eligibleNfts.length > 0 && (
              <button type="button" onClick={selectAll} className={theme.selectAllBtnClass}>
                {selected.size === eligibleNfts.length ? "DESELECT ALL" : "SELECT ALL"}
              </button>
            )}
          </div>

          {eligibleNfts.length === 0 ? (
            <p className="text-[10px] text-zinc-600 py-3">No eligible NFTs (already registered or none owned).</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
              {eligibleNfts.map((nft) => {
                const isSelected = selected.has(nft.tokenId);
                return (
                  <button
                    key={nft.tokenId}
                    type="button"
                    onClick={() => toggle(nft.tokenId)}
                    className={`relative border p-1 space-y-1 transition-colors ${
                      isSelected ? theme.nftSelectedClass : theme.nftIdleClass
                    }`}
                  >
                    <div className="aspect-square w-full bg-white/[0.04] pixel-corners overflow-hidden flex items-center justify-center">
                      {nft.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-zinc-600">#{nft.tokenId}</span>
                      )}
                    </div>
                    <p className="text-[9px] text-zinc-500 truncate">#{nft.tokenId}</p>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => onJoin(cfg.vipLevel, Array.from(selected))}
            disabled={selected.size === 0 || busy || !cfg.active}
            className={theme.joinBtnClass}
          >
            JOIN ({selected.size})
          </button>
        </div>

        {/* Registered NFTs & claim */}
        {myRegisteredForThisVip.length > 0 && (
          <div className={`space-y-2 pt-2 border-t ${theme.dividerClass}`}>
            <p className={theme.registeredLabelClass}>
              REGISTERED: {myRegisteredForThisVip.length} NFT{myRegisteredForThisVip.length === 1 ? "" : "s"} — CLAIMABLE:{" "}
              <span className="text-neon font-bold">
                {cfg.rewardTokenSymbol ? `${fmt(totalClaimable, cfg.rewardTokenDecimals)} $${cfg.rewardTokenSymbol}` : "0"}
              </span>
            </p>
            <button
              onClick={() => onClaim(myRegisteredForThisVip)}
              disabled={totalClaimable === BigInt(0) || busy}
              className={theme.claimBtnClass}
            >
              CLAIM REWARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClockInPage() {
  const { account, walletConnectReady, connectWallet, isCorrectNetwork, switchNetwork } = useWeb3();
  const {
    clockInConfigured,
    vipConfigs,
    registrationsByToken,
    txState,
    txHash,
    errorMessage,
    joinVip,
    claimVip,
    refreshClockInData,
  } = useClockIn();

  const [ownedNfts, setOwnedNfts] = useState<OwnedNft[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("IDLE");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOwnedNfts = React.useCallback(async () => {
    if (!account) {
      setOwnedNfts([]);
      setLoadState("IDLE");
      return;
    }
    setLoadState("LOADING");
    setLoadError(null);
    try {
      const nfts = await fetchOwnedMiniBrokers(account);
      setOwnedNfts(nfts);
      setLoadState("LOADED");
      await refreshClockInData(nfts.map((n) => n.tokenId));
    } catch (err: any) {
      setLoadState("ERROR");
      setLoadError(
        err?.message === "ALCHEMY_NOT_CONFIGURED"
          ? "Alchemy API key not configured yet — set NEXT_PUBLIC_ALCHEMY_API_KEY."
          : "Couldn't load your NFTs right now. Please try again shortly."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  useEffect(() => {
    loadOwnedNfts();
  }, [loadOwnedNfts]);

  useEffect(() => {
    if (txState === "JOIN_SUCCESSFUL" || txState === "CLAIM_SUCCESSFUL") {
      loadOwnedNfts();
    }
  }, [txState, loadOwnedNfts]);

  const fmt = (amount: bigint, decimals: number) => {
    const formatted = ethers.formatUnits(amount, decimals);
    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  // tokenIds this wallet currently has an active registration on, across any VIP level.
  const registeredTokenIds = useMemo(
    () => Object.entries(registrationsByToken).filter(([, r]) => r.active).map(([id]) => id),
    [registrationsByToken]
  );

  const txStatusLabel: Record<string, string> = {
    IDLE: "",
    CONFIRM_IN_WALLET: "CONFIRM IN WALLET…",
    TRANSACTION_PENDING: "TRANSACTION PROCESSING…",
    JOIN_SUCCESSFUL: "JOINED SUCCESSFULLY",
    CLAIM_SUCCESSFUL: "REWARD CLAIMED",
    TRANSACTION_FAILED: "TRANSACTION FAILED",
    TRANSACTION_REJECTED: "TRANSACTION REJECTED",
    WRONG_NETWORK: "WRONG NETWORK",
    INSUFFICIENT_BALANCE: "INSUFFICIENT TOKEN BALANCE FOR FEE",
  };

  const isBusy = txState === "CONFIRM_IN_WALLET" || txState === "TRANSACTION_PENDING";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h1 className="font-display text-xl font-bold text-white tracking-widest uppercase">Clock In</h1>
          <p className="text-xs text-zinc-500 mt-1">Register your 404 Origin NFTs for VIP rewards — no staking required</p>
        </div>

        <div className="space-y-6">
          {!clockInConfigured && (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
              <span className="font-bold tracking-widest uppercase">Status: Pending</span>
              <p className="mt-1 text-zinc-400 normal-case tracking-normal">
                The Clock In contract hasn&apos;t been deployed yet — set
                NEXT_PUBLIC_CLOCK_IN_CONTRACT_ADDRESS once it is, and this page will switch to
                the real reward flow automatically.
              </p>
            </div>
          )}

          {account && !isCorrectNetwork && (
            <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs flex items-center justify-between gap-3">
              <span>Wrong network for Clock In.</span>
              <button
                onClick={switchNetwork}
                className="px-3 py-1.5 bg-red-900 border border-red-800 text-red-200 text-[10px] font-bold tracking-widest pixel-corners hover:bg-red-800"
              >
                SWITCH NETWORK
              </button>
            </div>
          )}

          {!walletConnectReady ? (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
              WalletConnect Project ID not configured yet — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
            </div>
          ) : !account ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/15 pixel-corners space-y-4">
              <p className="text-xs text-zinc-500">Connect your wallet to see your 404 Origin NFTs.</p>
              <button
                onClick={connectWallet}
                className="px-6 py-2.5 bg-neon text-black font-bold text-xs tracking-widest pixel-corners hover:shadow-glow transition-shadow"
              >
                CONNECT WALLET
              </button>
            </div>
          ) : loadState === "LOADING" ? (
            <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">Loading your collection…</div>
          ) : loadState === "ERROR" ? (
            <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs">{loadError}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {vipConfigs.map((cfg) => (
                <VipCard
                  key={cfg.vipLevel}
                  cfg={cfg}
                  ownedNfts={ownedNfts}
                  registeredTokenIds={registeredTokenIds}
                  registrationsByToken={Object.fromEntries(
                    Object.entries(registrationsByToken).filter(([, r]) => r.vipLevel === cfg.vipLevel)
                  )}
                  fmt={fmt}
                  onJoin={joinVip}
                  onClaim={claimVip}
                  busy={isBusy}
                />
              ))}
            </div>
          )}

          {!ALCHEMY_API_KEY && account && (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
              Note: NEXT_PUBLIC_ALCHEMY_API_KEY isn&apos;t set in .env.local, so NFT lookups above will show a
              config warning until it&apos;s added.
            </div>
          )}

          {txState !== "IDLE" && txStatusLabel[txState] && (
            <div className="p-2 text-[10px] tracking-widest text-zinc-400 glass pixel-corners">
              {txStatusLabel[txState]}
              {txState === "TRANSACTION_FAILED" && errorMessage ? ` — ${errorMessage}` : ""}
              {txHash && (
                <a
                  href={`${WEB3_CONFIG.EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-neon mt-1 underline"
                >
                  VIEW TRANSACTION
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
