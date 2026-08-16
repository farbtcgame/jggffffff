import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { useWeb3 } from "../context/Web3Context";
import { ALCHEMY_API_KEY, WEB3_CONFIG } from "../config/web3";
import { fetchOwnedMiniBrokers, OwnedNft } from "../lib/alchemyNfts";
import { ethers } from "ethers";

type LoadState = "IDLE" | "LOADING" | "LOADED" | "ERROR";

export default function BurnLabPage() {
  const {
    account,
    walletConnectReady,
    connectWallet,
    isCorrectNetwork,
    switchNetwork,
    burnLabConfigured,
    burnRewards,
    burnRewardsLoading,
    txState,
    txHash,
    errorMessage,
    checkBurnApproval,
    approveBurnLab,
    executeBurn,
  } = useWeb3();

  const [ownedNfts, setOwnedNfts] = useState<OwnedNft[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("IDLE");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [needsApproval, setNeedsApproval] = useState<boolean | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

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
    async function check() {
      if (!account || !burnLabConfigured) {
        setNeedsApproval(null);
        return;
      }
      try {
        const approved = await checkBurnApproval(account);
        if (!cancelled) setNeedsApproval(!approved);
      } catch (e) {
        if (!cancelled) setNeedsApproval(true);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [account, burnLabConfigured, checkBurnApproval]);

  useEffect(() => {
    if (txState === "BURN_SUCCESSFUL") {
      setSelected(new Set());
      setShowConfirm(false);
      loadOwnedNfts();
    }
    if (txState === "APPROVAL_REQUIRED") {
      setNeedsApproval(true);
    }
  }, [txState, loadOwnedNfts]);

  const toggleSelected = (tokenId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  };

  const activeRewards = useMemo(() => burnRewards.filter((r) => r.active), [burnRewards]);
  const selectedCount = selected.size;

  const formatAmount = (amount: bigint, decimals: number) => {
    try {
      const formatted = ethers.formatUnits(amount, decimals);
      return parseFloat(formatted).toString();
    } catch {
      return "0";
    }
  };

  const handleApprove = async () => {
    const ok = await approveBurnLab();
    if (ok && account) {
      const approved = await checkBurnApproval(account);
      setNeedsApproval(!approved);
    }
  };

  const handleConfirmBurn = async () => {
    if (!account) return;
    const isApprovedNow = await checkBurnApproval(account);
    if (!isApprovedNow) {
      setNeedsApproval(true);
      setShowConfirm(false);
      return;
    }
    await executeBurn(Array.from(selected));
  };

  const txStatusLabel: Record<string, string> = {
    IDLE: "",
    CHECKING_APPROVAL: "CHECKING APPROVAL…",
    APPROVAL_REQUIRED: "APPROVAL REQUIRED",
    CONFIRM_IN_WALLET: "CONFIRM IN WALLET…",
    TRANSACTION_PENDING: "TRANSACTION PROCESSING…",
    BURN_SUCCESSFUL: "BURN SUCCESSFUL",
    TRANSACTION_FAILED: "TRANSACTION FAILED",
    TRANSACTION_REJECTED: "TRANSACTION REJECTED",
    WRONG_NETWORK: "WRONG NETWORK",
    INSUFFICIENT_REWARD_BALANCE: "INSUFFICIENT REWARD BALANCE",
  };

  const isBusy =
    txState === "CHECKING_APPROVAL" ||
    txState === "CONFIRM_IN_WALLET" ||
    txState === "TRANSACTION_PENDING";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="border-b border-white/10 pb-4">
          <h1 className="font-display text-xl font-bold text-white tracking-widest uppercase">BURN LAB</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Retire your 404 Origin NFTs and receive configured ecosystem rewards.
          </p>
        </div>

        {!burnLabConfigured && (
          <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
            Burn Lab contract address isn&apos;t configured yet — set
            NEXT_PUBLIC_BURN_LAB_CONTRACT_ADDRESS once the Burn Lab contract has been deployed.
          </div>
        )}

        {account && !isCorrectNetwork && (
          <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs flex items-center justify-between gap-3">
            <span>Wrong network for Burn Lab.</span>
            <button
              onClick={switchNetwork}
              className="px-3 py-1.5 bg-red-900 border border-red-800 text-red-200 text-[10px] font-bold tracking-widest pixel-corners hover:bg-red-800"
            >
              SWITCH NETWORK
            </button>
          </div>
        )}

        <div className="glass pixel-corners p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-display text-sm font-bold text-white tracking-widest">YOUR COLLECTION</h3>
            <div className="flex items-center gap-3">
              {ownedNfts.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.size === ownedNfts.length
                        ? new Set()
                        : new Set(ownedNfts.map((n) => n.tokenId))
                    )
                  }
                  className="px-3 py-1 border border-white/15 text-[10px] font-bold tracking-widest text-zinc-300 pixel-corners hover:border-neon hover:text-neon transition-colors"
                >
                  {selected.size === ownedNfts.length ? "DESELECT ALL" : "SELECT ALL"}
                </button>
              )}
              <p className="text-[10px] text-zinc-500">SELECT NFTS TO RETIRE</p>
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
            <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
              Loading your collection…
            </div>
          ) : loadState === "ERROR" ? (
            <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs">
              {loadError}
            </div>
          ) : ownedNfts.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No 404 Origin NFTs found in this wallet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {ownedNfts.map((nft) => {
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

          {!ALCHEMY_API_KEY && (
            <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
              Note: NEXT_PUBLIC_ALCHEMY_API_KEY isn&apos;t set in .env.local, so NFT lookups above
              will show a config warning until it&apos;s added.
            </div>
          )}
        </div>

        <div className="glass pixel-corners p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-display text-sm font-bold text-white tracking-widest">REWARD PREVIEW</h3>
            <span className="text-[10px] text-zinc-500">
              SELECTED: <span className="text-neon font-bold">{selectedCount} NFT{selectedCount === 1 ? "" : "s"}</span>
            </span>
          </div>

          {burnRewardsLoading ? (
            <p className="text-xs text-zinc-500 animate-pulse">Loading reward configuration…</p>
          ) : activeRewards.length === 0 ? (
            <p className="text-xs text-zinc-500">No active reward tokens are configured yet.</p>
          ) : selectedCount === 0 ? (
            <p className="text-xs text-zinc-500">Select one or more NFTs to preview rewards.</p>
          ) : (
            <div className="space-y-2">
              {activeRewards.map((r) => (
                <div key={r.token} className="flex justify-between text-xs p-2 bg-black/40 border border-white/5 pixel-corners">
                  <span className="text-zinc-400">+ {formatAmount(r.amountPerNFT * BigInt(selectedCount), r.decimals)} ${r.symbol}</span>
                  {r.availableCapacity < BigInt(selectedCount) && (
                    <span className="text-red-400 text-[10px] font-bold">INSUFFICIENT BALANCE</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-white/10 space-y-3">
            {needsApproval && selectedCount > 0 && (
              <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-[10px]">
                The Burn Lab contract needs approval to move your NFTs. Approve once, then burn.
              </div>
            )}

            {showConfirm && (
              <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-300 text-[10px] space-y-2">
                <p>
                  This action permanently transfers your selected NFTs to the burn address
                  (0x000000000000000000000000000000000000dEaD). This cannot be undone — the
                  NFTs can never be recovered by anyone, including the contract administrator.
                </p>
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

            <div className="flex flex-col sm:flex-row gap-3">
              {needsApproval ? (
                <button
                  onClick={handleApprove}
                  disabled={selectedCount === 0 || isBusy || !burnLabConfigured}
                  className="flex-1 py-3 bg-neon text-black font-bold text-xs tracking-widest pixel-corners disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-shadow"
                >
                  APPROVE NFTS
                </button>
              ) : !showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={selectedCount === 0 || isBusy || !burnLabConfigured}
                  className="flex-1 py-3 bg-neon text-black font-bold text-xs tracking-widest pixel-corners disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-shadow"
                >
                  BURN SELECTED ({selectedCount})
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isBusy}
                    className="flex-1 py-3 bg-white/[0.04] border border-white/10 text-zinc-400 font-bold text-xs tracking-widest hover:text-white disabled:opacity-30"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleConfirmBurn}
                    disabled={isBusy}
                    className="flex-1 py-3 bg-red-600 text-white font-bold text-xs tracking-widest disabled:opacity-30 hover:bg-red-500 transition-colors"
                  >
                    CONFIRM BURN
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
