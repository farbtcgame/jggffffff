import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { useWeb3 } from "../context/Web3Context";
import { useStaking } from "../context/StakingContext";
import { ALCHEMY_API_KEY, WEB3_CONFIG } from "../config/web3";
import { fetchOwnedMiniBrokers, fetchNftMetadataByIds, OwnedNft } from "../lib/alchemyNfts";
import { ethers } from "ethers";

type LoadState = "IDLE" | "LOADING" | "LOADED" | "ERROR";

export default function StakingPage() {
  const { account, walletConnectReady, connectWallet, isCorrectNetwork, switchNetwork } = useWeb3();
  const {
    stakingConfigured,
    rewardTokenSymbol,
    rewardTokenDecimals,
    rewardPerCycle,
    stakedTokens,
    stakedLoading,
    txState,
    txHash,
    errorMessage,
    checkStakingApproval,
    approveStaking,
    stakeSelected,
    unstakeSelected,
    claimSelected,
  } = useStaking();

  const [ownedNfts, setOwnedNfts] = useState<OwnedNft[]>([]);
  const [stakedNftMeta, setStakedNftMeta] = useState<Record<string, OwnedNft>>({});
  const [loadState, setLoadState] = useState<LoadState>("IDLE");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedStaked, setSelectedStaked] = useState<Set<string>>(new Set());
  const [needsApproval, setNeedsApproval] = useState<boolean | null>(null);

  const loadOwnedNfts = React.useCallback(async () => {
    if (!account) {
      setOwnedNfts([]);
      setStakedNftMeta({});
      setLoadState("IDLE");
      return;
    }
    setLoadState("LOADING");
    setLoadError(null);
    try {
      const nfts = await fetchOwnedMiniBrokers(account);
      setOwnedNfts(nfts);
      setLoadState("LOADED");
    } catch (err: any) {
      setLoadState("ERROR");
      setLoadError(
        err?.message === "ALCHEMY_NOT_CONFIGURED"
          ? "Alchemy API key not configured yet — set NEXT_PUBLIC_ALCHEMY_API_KEY."
          : "Couldn't load your NFTs right now. Please try again shortly."
      );
    }
  }, [account]);

  useEffect(() => {
    loadOwnedNfts();
  }, [loadOwnedNfts]);

  useEffect(() => {
    let cancelled = false;
    const idsToFetch = stakedTokens
      .map((t) => t.tokenId)
      .filter((id) => !stakedNftMeta[id]);

    if (idsToFetch.length === 0) return;

    (async () => {
      try {
        const metas = await fetchNftMetadataByIds(idsToFetch);
        if (cancelled) return;
        setStakedNftMeta((prev) => {
          const next = { ...prev };
          metas.forEach((m) => {
            next[m.tokenId] = m;
          });
          return next;
        });
      } catch (err) {
        console.error("Error fetching staked NFT metadata:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stakedTokens]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!account || !stakingConfigured) {
        setNeedsApproval(null);
        return;
      }
      try {
        const approved = await checkStakingApproval(account);
        if (!cancelled) setNeedsApproval(!approved);
      } catch (e) {
        if (!cancelled) setNeedsApproval(true);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [account, stakingConfigured, checkStakingApproval]);

  useEffect(() => {
    if (txState === "STAKE_SUCCESSFUL" || txState === "UNSTAKE_SUCCESSFUL") {
      setSelected(new Set());
      setSelectedStaked(new Set());
      loadOwnedNfts();
    }
    if (txState === "APPROVAL_REQUIRED") {
      setNeedsApproval(true);
    }
  }, [txState, loadOwnedNfts]);

  const stakedIdSet = useMemo(() => new Set(stakedTokens.map((t) => t.tokenId)), [stakedTokens]);
  const availableNfts = useMemo(() => ownedNfts.filter((n) => !stakedIdSet.has(n.tokenId)), [ownedNfts, stakedIdSet]);

  const toggleSelected = (tokenId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  };

  const toggleSelectedStaked = (tokenId: string) => {
    setSelectedStaked((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  };

  const selectAllAvailable = () => {
    setSelected((prev) =>
      prev.size === availableNfts.length ? new Set() : new Set(availableNfts.map((n) => n.tokenId))
    );
  };

  const selectAllStaked = () => {
    setSelectedStaked((prev) =>
      prev.size === stakedTokens.length ? new Set() : new Set(stakedTokens.map((t) => t.tokenId))
    );
  };

  const fmt = (amount: bigint, decimals: number) => {
    try {
      const formatted = ethers.formatUnits(amount, decimals);
      return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 4 });
    } catch {
      return "0";
    }
  };

  const totalPendingReward = useMemo(
    () => stakedTokens.reduce((sum, t) => sum + t.pendingReward, BigInt(0)),
    [stakedTokens]
  );

  const handleApprove = async () => {
    const ok = await approveStaking();
    if (ok && account) {
      const approved = await checkStakingApproval(account);
      setNeedsApproval(!approved);
    }
  };

  const handleStakeAction = async () => {
    if (!account) return;
    const isApprovedNow = await checkStakingApproval(account);
    if (!isApprovedNow) {
      setNeedsApproval(true);
      return;
    }
    await stakeSelected(Array.from(selected));
  };

  const txStatusLabel: Record<string, string> = {
    IDLE: "",
    CHECKING_APPROVAL: "CHECKING APPROVAL…",
    APPROVAL_REQUIRED: "APPROVAL REQUIRED",
    CONFIRM_IN_WALLET: "CONFIRM IN WALLET…",
    TRANSACTION_PENDING: "TRANSACTION PROCESSING…",
    STAKE_SUCCESSFUL: "STAKE SUCCESSFUL",
    UNSTAKE_SUCCESSFUL: "UNSTAKE SUCCESSFUL",
    CLAIM_SUCCESSFUL: "REWARDS CLAIMED",
    TRANSACTION_FAILED: "TRANSACTION FAILED",
    TRANSACTION_REJECTED: "TRANSACTION REJECTED",
    WRONG_NETWORK: "WRONG NETWORK",
  };

  const isBusy =
    txState === "CHECKING_APPROVAL" ||
    txState === "CONFIRM_IN_WALLET" ||
    txState === "TRANSACTION_PENDING";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="relative border border-neon/40 bg-neon p-6 overflow-hidden">
          <span className="pointer-events-none select-none absolute -right-2 -bottom-4 text-7xl md:text-8xl font-black text-black/10 tracking-tight">
            STAKE
          </span>
          <h3 className="relative text-xl md:text-2xl font-extrabold text-black tracking-tight">
            ORIGIN Vault {rewardTokenSymbol ? `/ ${fmt(rewardPerCycle, rewardTokenDecimals)} $${rewardTokenSymbol} per 24h` : ""}
          </h3>
          <p className="relative text-xs md:text-sm text-black/70 mt-1 max-w-md">
            Lock your 404 Origin NFTs in the vault and let the protocol do the accounting.
          </p>
        </div>

        {!stakingConfigured && (
          <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
            Staking contract address isn&apos;t configured yet — set
            NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS once the staking contract has been deployed.
          </div>
        )}

        {account && !isCorrectNetwork && (
          <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs flex items-center justify-between gap-3">
            <span>Wrong network for the Staking Vault.</span>
            <button
              onClick={switchNetwork}
              className="px-3 py-1.5 bg-red-900 border border-red-800 text-red-200 text-[10px] font-bold tracking-widest pixel-corners hover:bg-red-800"
            >
              SWITCH NETWORK
            </button>
          </div>
        )}

        <div className="border border-white/10 glass p-6">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wider">404 ORIGIN VAULT</h2>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-2xl">
                Stake your 404 Origin NFTs to earn {rewardTokenSymbol ? `$${rewardTokenSymbol}` : "reward tokens"}{" "}
                every completed 24-hour cycle. Claim anytime without unstaking, or unstake whenever you like — the
                in-progress cycle just won&apos;t pay out.
              </p>
            </div>
            <span
              className={`px-2.5 py-1 text-[10px] font-bold tracking-widest border whitespace-nowrap ${
                stakingConfigured
                  ? "bg-neon/10 text-neon border-neon/40"
                  : "bg-amber-950/30 text-amber-400 border-amber-800"
              }`}
            >
              {stakingConfigured ? "● LIVE" : "● COMING SOON"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6">
            <div className="p-3 glass pixel-corners">
              <span className="text-[10px] text-zinc-500 block">YOUR VAULT</span>
              <span className="font-display text-sm font-bold text-white">{stakedTokens.length}</span>
            </div>
            <div className="p-3 glass pixel-corners">
              <span className="text-[10px] text-zinc-500 block">PENDING REWARDS</span>
              <span className="font-display text-sm font-bold text-neon">
                {rewardTokenSymbol ? `${fmt(totalPendingReward, rewardTokenDecimals)} $${rewardTokenSymbol}` : "—"}
              </span>
            </div>
            <div className="p-3 glass pixel-corners">
              <span className="text-[10px] text-zinc-500 block">REWARD / CYCLE</span>
              <span className="font-display text-sm font-bold text-white">
                {rewardTokenSymbol ? `${fmt(rewardPerCycle, rewardTokenDecimals)} $${rewardTokenSymbol}` : "—"}
              </span>
            </div>
            <div className="p-3 glass pixel-corners">
              <span className="text-[10px] text-zinc-500 block">CYCLE LENGTH</span>
              <span className="font-display text-sm font-bold text-white">24h</span>
            </div>
          </div>
        </div>

        <div className="glass pixel-corners p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-display text-sm font-bold text-white tracking-widest">AVAILABLE TO STAKE</h3>
            <div className="flex items-center gap-3">
              {availableNfts.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllAvailable}
                  className="px-3 py-1 border border-white/15 text-[10px] font-bold tracking-widest text-zinc-300 pixel-corners hover:border-neon hover:text-neon transition-colors"
                >
                  {selected.size === availableNfts.length ? "DESELECT ALL" : "SELECT ALL"}
                </button>
              )}
              <p className="text-[10px] text-zinc-500">SELECT OWNED NFTS TO STAKE</p>
            </div>
          </div>

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
          ) : availableNfts.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              {ownedNfts.length === 0 ? "No 404 Origin NFTs found in this wallet." : "All of your 404 Origin NFTs are already staked."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {availableNfts.map((nft) => {
                const isSelected = selected.has(nft.tokenId);
                return (
                  <button
                    key={nft.tokenId}
                    type="button"
                    onClick={() => toggleSelected(nft.tokenId)}
                    className={`relative text-left border p-2 space-y-2 transition-colors ${
                      isSelected
                        ? "border-neon bg-white/[0.04] shadow-[inset_0_0_10px_rgba(204,255,0,0.08)]"
                        : "border-white/10 bg-black/30 hover:border-white/15"
                    }`}
                  >
                    <div className="aspect-square w-full bg-white/[0.04] pixel-corners overflow-hidden flex items-center justify-center">
                      {nft.image ? (
                        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-zinc-600">NO IMAGE</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">{nft.name}</p>
                    <p className="text-[10px] text-zinc-600">#{nft.tokenId}</p>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="absolute top-2 right-2 accent-neon pointer-events-none"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {needsApproval && selected.size > 0 && (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-[10px]">
              The Staking Vault needs approval to move your NFTs. Approve once, then stake.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10">
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={selected.size === 0 || isBusy || !stakingConfigured}
                className="flex-1 py-3 bg-neon text-black font-bold text-xs tracking-widest pixel-corners disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-shadow"
              >
                APPROVE NFTS
              </button>
            ) : (
              <button
                onClick={handleStakeAction}
                disabled={selected.size === 0 || isBusy || !stakingConfigured}
                className="flex-1 py-3 bg-neon text-black font-bold text-xs tracking-widest pixel-corners disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-shadow"
              >
                STAKE SELECTED ({selected.size})
              </button>
            )}
          </div>

          {!ALCHEMY_API_KEY && (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
              Note: NEXT_PUBLIC_ALCHEMY_API_KEY isn&apos;t set in .env.local, so NFT lookups above will show a
              config warning until it&apos;s added.
            </div>
          )}
        </div>

        <div className="glass pixel-corners p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-display text-sm font-bold text-white tracking-widest">CURRENTLY STAKED</h3>
            <div className="flex items-center gap-3">
              {stakedTokens.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllStaked}
                  className="px-3 py-1 border border-white/15 text-[10px] font-bold tracking-widest text-zinc-300 pixel-corners hover:border-neon hover:text-neon transition-colors"
                >
                  {selectedStaked.size === stakedTokens.length ? "DESELECT ALL" : "SELECT ALL"}
                </button>
              )}
              <p className="text-[10px] text-zinc-500">SELECT TO CLAIM / UNSTAKE</p>
            </div>
          </div>

          {stakedLoading ? (
            <p className="text-xs text-zinc-500 animate-pulse py-8 text-center">Loading vault…</p>
          ) : stakedTokens.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">Nothing staked yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {stakedTokens.map((t) => {
                const isSelected = selectedStaked.has(t.tokenId);
                const nftMeta = stakedNftMeta[t.tokenId] || ownedNfts.find((n) => n.tokenId === t.tokenId);
                return (
                  <button
                    key={t.tokenId}
                    type="button"
                    onClick={() => toggleSelectedStaked(t.tokenId)}
                    className={`relative text-left border p-2 space-y-1 transition-colors ${
                      isSelected
                        ? "border-neon bg-white/[0.04] shadow-[inset_0_0_10px_rgba(204,255,0,0.08)]"
                        : "border-white/10 bg-black/30 hover:border-white/15"
                    }`}
                  >
                    <div className="aspect-square w-full bg-white/[0.04] pixel-corners overflow-hidden flex items-center justify-center">
                      {nftMeta?.image ? (
                        <img src={nftMeta.image} alt={nftMeta.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-zinc-600">#{t.tokenId}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600">#{t.tokenId}</p>
                    <p className="text-[10px] text-neon font-bold">
                      +{rewardTokenSymbol ? fmt(t.pendingReward, rewardTokenDecimals) : "0"}
                    </p>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="absolute top-2 right-2 accent-neon pointer-events-none"
                    />
                  </button>
                );
              })}
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

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10">
            <button
              onClick={() => claimSelected(Array.from(selectedStaked))}
              disabled={selectedStaked.size === 0 || isBusy}
              className="flex-1 py-3 bg-neon text-black font-bold text-xs tracking-widest pixel-corners disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-shadow"
            >
              CLAIM REWARDS ({selectedStaked.size})
            </button>
            <button
              onClick={() => unstakeSelected(Array.from(selectedStaked))}
              disabled={selectedStaked.size === 0 || isBusy}
              className="flex-1 py-3 bg-white/[0.04] border border-white/15 text-white font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:border-neon transition-colors"
            >
              UNSTAKE SELECTED ({selectedStaked.size})
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
