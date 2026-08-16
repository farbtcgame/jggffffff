"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { OWNER_ADDRESS, WEB3_CONFIG, WALLETCONNECT_PROJECT_ID, WALLETCONNECT_CHAINS, ALCHEMY_RPC_URL } from "../config/web3";
import NFT_ABI from "../abi/NFT.json";
import ERC20_ABI from "../abi/ERC20.json";
import BURN_LAB_ABI from "../abi/BurnLab.json";
import { describeTxError } from "../lib/txErrors";
import ERC721_MINIMAL_ABI from "../abi/ERC721Minimal.json";
import {
  WALLET_CATALOG,
  WalletOption,
  EIP1193Provider,
  EIP6963ProviderDetail,
  requestInjectedProviders,
  findInjectedByRdns,
  getFallbackInjectedProvider,
  connectWalletConnect,
  disconnectProvider,
  switchOrAddChain,
} from "../lib/wallet";

// ==========================================================
// Wallet modal icon.
//
// Priority order:
//   1. A LIVE icon announced by an installed extension itself (EIP-6963
//      info.icon) — this is the real, official logo, straight from the
//      wallet, so it's always preferred when available.
//   2. A hand-drawn glyph below. These all share the same 20x20 viewBox
//      and sit centered in the same 36x36 colored box, so — unlike
//      favicons pulled from each wallet's website (which come in wildly
//      different native resolutions and internal padding, making some
//      look tiny and others fill the whole box) — every fallback icon is
//      now guaranteed to render at the exact same visual size.
//   3. Plain initials, for wallets with no glyph defined (e.g. the
//      generic "Browser Wallet" entry).
// ==========================================================
const WALLET_GLYPHS: Record<string, React.ReactNode> = {
  metamask: (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="white">
      <path d="M10 2.5 5.5 6l1 3.3L10 11l3.5-1.7 1-3.3L10 2.5Z" opacity="0.95" />
      <path d="M3 8l2.5-2 1 3.5-1.8 4.3L3 12.3 3 8Z" opacity="0.8" />
      <path d="M17 8l-2.5-2-1 3.5 1.8 4.3 2.7-1.5L17 8Z" opacity="0.8" />
      <path d="M6.7 13.8 10 17.5l3.3-3.7-3.3-1.6-3.3 1.6Z" opacity="0.95" />
    </svg>
  ),
  rabby: (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round">
      <path d="M7 2.5c-1 2-1.2 4.2-.3 6.2M13 2.5c1 2 1.2 4.2.3 6.2" />
      <circle cx="10" cy="12.5" r="5.3" fill="white" stroke="none" />
    </svg>
  ),
  coinbase: (
    <svg viewBox="0 0 20 20" className="w-5 h-5">
      <circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="2.6" />
      <rect x="7.3" y="8.4" width="5.4" height="3.2" rx="1.2" fill="white" />
    </svg>
  ),
  rainbow: (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" strokeLinecap="round">
      <path d="M3 14a7 7 0 0 1 14 0" stroke="white" strokeWidth="1.8" />
      <path d="M6 14a4 4 0 0 1 8 0" stroke="white" strokeWidth="1.8" opacity="0.65" />
      <circle cx="10" cy="14" r="1.4" fill="white" />
    </svg>
  ),
  trust: (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="white">
      <path d="M10 2.2 16 4.6v5.1c0 4.3-2.8 6.9-6 8.1-3.2-1.2-6-3.8-6-8.1V4.6L10 2.2Z" />
    </svg>
  ),
  walletconnect: (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
      <path d="M5.5 9.3c2.5-3 6.5-3 9 0" />
      <path d="M4 11.3l1.4-1.4M16 11.3l-1.4-1.4" />
    </svg>
  ),
};

const WalletLogo: React.FC<{ option: WalletOption; liveIconSrc?: string }> = ({ option, liveIconSrc }) => {
  const [liveIconFailed, setLiveIconFailed] = useState(false);

  if (liveIconSrc && !liveIconFailed) {
    return (
      <span className="h-9 w-9 flex items-center justify-center shrink-0 rounded-md overflow-hidden bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={liveIconSrc}
          alt={option.name}
          className="w-full h-full object-contain"
          onError={() => setLiveIconFailed(true)}
        />
      </span>
    );
  }

  const glyph = WALLET_GLYPHS[option.id];

  return (
    <span
      className="h-9 w-9 flex items-center justify-center shrink-0 rounded-md overflow-hidden text-[11px] font-bold text-white"
      style={{ backgroundColor: option.accentColor }}
    >
      {glyph ?? option.initials}
    </span>
  );
};

export type TxState =
  | "IDLE"
  | "CONNECTING_WALLET"
  | "AWAITING_SIGNATURE"
  | "CONFIRM_IN_WALLET"
  | "TRANSACTION_PENDING"
  | "MINT_SUCCESSFUL"
  | "TRANSACTION_FAILED"
  | "TRANSACTION_REJECTED"
  | "WRONG_NETWORK"
  | "INSUFFICIENT_BALANCE"
  // Burn Lab-specific states (additive; existing flows never set these).
  | "CHECKING_APPROVAL"
  | "APPROVAL_REQUIRED"
  | "BURN_SUCCESSFUL"
  | "INSUFFICIENT_REWARD_BALANCE";

// ==========================================================
// Burn Lab types (additive — does not touch existing mint types)
// ==========================================================
export interface BurnReward {
  token: string;
  symbol: string;
  decimals: number;
  amountPerNFT: bigint;
  active: boolean;
  totalLoaded: bigint;
  totalDistributed: bigint;
  contractBalance: bigint;
  availableCapacity: bigint;
}

const LAST_WALLET_STORAGE_KEY = "mb_last_wallet_id";

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  // Raw EIP-1193 provider of the currently connected wallet (MetaMask,
  // Rabby, Coinbase Wallet, WalletConnect session, etc).
  walletProvider: EIP1193Provider | null;
  // ethers Signer for the connected account, kept in sync automatically.
  signer: ethers.Signer | null;
  isCorrectNetwork: boolean;
  isOwner: boolean;
  txState: TxState;
  txHash: string | null;
  errorMessage: string | null;
  totalSupply: bigint;
  maxSupply: bigint;
  mintPrice: bigint;
  isPaused: boolean;
  publicMintEnabled: boolean;
  ownerAddress: string;
  baseUri: string;
  revealed: boolean;
  royaltyFeeBps: number;
  tokenSymbol: string;
  tokenDecimals: number;
  contractFunctions: string[];
  walletConnectReady: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  // Alias of switchNetwork with an explicit name for Robinhood Chain.
  switchToRobinhood: () => Promise<void>;
  mintNft: (quantity: number) => Promise<void>;
  refreshContractData: () => Promise<void>;
  callContractMethod: (methodName: string, args: any[]) => Promise<boolean>;

  // ===== Burn Lab (additive — separate contract, separate state) =====
  burnLabConfigured: boolean;
  burnLabOwnerAddress: string;
  isBurnLabOwner: boolean;
  // True once we've read burnLab.nftContract() on-chain and it does NOT
  // match the NFT contract this site is configured for. Burning must not
  // be allowed while this is true — see executeBurn.
  burnLabNftContractMismatch: boolean;
  burnLabNftContractAddress: string;
  burnRewards: BurnReward[];
  burnRewardsLoading: boolean;
  refreshBurnLabData: () => Promise<void>;
  checkBurnApproval: (ownerAddress: string) => Promise<boolean>;
  approveBurnLab: () => Promise<boolean>;
  executeBurn: (tokenIds: string[]) => Promise<boolean>;
  addBurnReward: (token: string, amountPerNFTRaw: bigint) => Promise<boolean>;
  updateBurnRewardAmount: (token: string, newAmountPerNFTRaw: bigint) => Promise<boolean>;
  setBurnRewardActive: (token: string, active: boolean) => Promise<boolean>;
  loadBurnRewardTokens: (token: string, amountRaw: bigint) => Promise<boolean>;
  withdrawBurnRewardTokens: (token: string, amountRaw: bigint) => Promise<boolean>;
  readErc20Meta: (tokenAddress: string) => Promise<{ symbol: string; decimals: number } | null>;
}

const Web3Context = createContext<Web3ContextType>({} as Web3ContextType);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The new connection layer works for injected wallets regardless of
  // whether a WalletConnect Project ID is configured, so the "ready" flag
  // is no longer gated behind it (fixes the old behavior where the whole
  // connect UI disappeared without a WalletConnect Project ID).
  const walletConnectReady = true;

  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletProvider, setWalletProvider] = useState<EIP1193Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Wallet connection modal state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [walletModalError, setWalletModalError] = useState<string | null>(null);
  // Live wallet icons announced via EIP-6963 by installed extensions,
  // keyed by rdns. Populated when the modal opens; takes priority over the
  // catalog's static logoUrl when a match is found.
  const [injectedWalletIcons, setInjectedWalletIcons] = useState<Record<string, string>>({});

  const [txState, setTxState] = useState<TxState>("IDLE");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [totalSupply, setTotalSupply] = useState<bigint>(BigInt(0));
  const [maxSupply, setMaxSupply] = useState<bigint>(BigInt(10000));
  const [mintPrice, setMintPrice] = useState<bigint>(BigInt(0));
  const [isPaused, setIsPaused] = useState(false);
  const [publicMintEnabled, setPublicMintEnabled] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState(OWNER_ADDRESS);
  const [baseUri, setBaseUri] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [royaltyFeeBps, setRoyaltyFeeBps] = useState(0);
  const [tokenSymbol, setTokenSymbol] = useState(WEB3_CONFIG.CURRENCY_SYMBOL);
  const [tokenDecimals, setTokenDecimals] = useState(18);

  const contractFunctions = (NFT_ABI as any[])
    .filter((item) => item.type === "function")
    .map((item) => item.name);

  const isOwner = !!account && account.toLowerCase() === ownerAddress.toLowerCase();

  // Read-only calls (contract data refresh, ERC-20 metadata, Burn Lab
  // reads) go through Alchemy instead of the raw chain RPC — see the
  // ALCHEMY_RPC_URL comment in config/web3.ts. This is what was causing
  // the homepage/staking/burn/clock-in "couldn't load" errors. Wallet
  // transactions still go through the connected wallet's own provider via
  // getSigner() below, completely unaffected by this.
  const getReadProvider = () => new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);

  const getSigner = useCallback(async () => {
    if (!walletProvider) throw new Error("Wallet not connected");
    const provider = new ethers.BrowserProvider(walletProvider);
    return provider.getSigner();
  }, [walletProvider]);

  const refreshContractData = useCallback(async () => {
    try {
      const provider = getReadProvider();
      const nft = new ethers.Contract(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, NFT_ABI, provider);

      const [supply, max, price, mp, pme, ownr, uri, rev, royalty] = await Promise.all([
        nft.totalSupply().catch(() => BigInt(0)),
        nft.MAX_SUPPLY().catch(() => BigInt(10000)),
        nft.mintPrice().catch(() => BigInt(0)),
        nft.mintingPaused().catch(() => false),
        nft.publicMintEnabled().catch(() => false),
        nft.owner().catch(() => "0x0000000000000000000000000000000000000000"),
        nft.revealed().catch(() => false).then((r: boolean) => (r ? nft.baseURI() : nft.unrevealedURI())),
        nft.revealed().catch(() => false),
        nft.royaltyInfo(1, 10000).catch(() => [null, 0]),
      ]);

      setTotalSupply(supply);
      setMaxSupply(max);
      setMintPrice(price);
      setIsPaused(mp);
      setPublicMintEnabled(pme);
      setOwnerAddress(OWNER_ADDRESS);
      setBaseUri(uri);
      setRevealed(rev);
      setRoyaltyFeeBps(Number(royalty[1] ?? 0));

      const tokenContract = new ethers.Contract(WEB3_CONFIG.MINT_TOKEN_ADDRESS, ERC20_ABI, provider);
      const [sym, dec] = await Promise.all([
        tokenContract.symbol().catch(() => WEB3_CONFIG.CURRENCY_SYMBOL),
        tokenContract.decimals().catch(() => 18),
      ]);
      setTokenSymbol(sym);
      setTokenDecimals(Number(dec));
    } catch (err) {
      console.error("Error fetching contract data:", err);
    }
  }, []);

  useEffect(() => {
    refreshContractData();
    const interval = setInterval(refreshContractData, 20000);
    return () => clearInterval(interval);
  }, [refreshContractData]);

  // ==========================================================
  // Wallet connection layer
  // ==========================================================
  const providerListenersRef = useRef<{
    provider: EIP1193Provider;
    onAccountsChanged: (accounts: string[]) => void;
    onChainChanged: (id: string | number) => void;
    onDisconnect: () => void;
  } | null>(null);

  const detachProviderListeners = useCallback(() => {
    const current = providerListenersRef.current;
    if (current?.provider?.removeListener) {
      current.provider.removeListener("accountsChanged", current.onAccountsChanged);
      current.provider.removeListener("chainChanged", current.onChainChanged);
      current.provider.removeListener("disconnect", current.onDisconnect);
    }
    providerListenersRef.current = null;
  }, []);

  const disconnectWallet = useCallback(async () => {
    const providerToClose = providerListenersRef.current?.provider ?? walletProvider;
    detachProviderListeners();
    await disconnectProvider(providerToClose);
    setAccount(null);
    setChainId(null);
    setWalletProvider(null);
    setSigner(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(LAST_WALLET_STORAGE_KEY);
      } catch {
        // ignore storage errors (private browsing, etc.)
      }
    }
  }, [walletProvider, detachProviderListeners]);

  const attachProviderListeners = useCallback(
    (provider: EIP1193Provider) => {
      if (!provider?.on) return;

      const onAccountsChanged = (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      };
      const onChainChanged = (id: string | number) => {
        const parsed = typeof id === "string" ? (id.startsWith("0x") ? parseInt(id, 16) : Number(id)) : Number(id);
        setChainId(parsed);
      };
      const onDisconnect = () => {
        disconnectWallet();
      };

      provider.on("accountsChanged", onAccountsChanged);
      provider.on("chainChanged", onChainChanged);
      provider.on("disconnect", onDisconnect);

      providerListenersRef.current = { provider, onAccountsChanged, onChainChanged, onDisconnect };
    },
    [disconnectWallet]
  );

  useEffect(() => {
    return () => {
      detachProviderListeners();
    };
  }, [detachProviderListeners]);

  const finalizeConnection = useCallback(
    async (provider: EIP1193Provider, walletId: string, silent = false) => {
      let accounts: string[] = [];
      try {
        accounts = silent
          ? await provider.request({ method: "eth_accounts" })
          : await provider.request({ method: "eth_requestAccounts" });
      } catch (err: any) {
        if (!silent && err?.code !== 4001) {
          // Some wallets (namely certain WalletConnect sessions) don't
          // support eth_requestAccounts after connect() — fall back.
          accounts = await provider.request({ method: "eth_accounts" });
        } else {
          throw err;
        }
      }

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned by wallet.");
      }

      // Always connect on Robinhood Chain mainnet. Wallets can retain a prior
      // network selection, so switch before creating the signer and reading
      // contract state.
      await switchOrAddChain(provider, {
        chainId: WEB3_CONFIG.CHAIN_ID,
        chainName: WEB3_CONFIG.CHAIN_NAME,
        rpcUrl: WEB3_CONFIG.RPC_URL,
        explorerUrl: WEB3_CONFIG.EXPLORER_URL,
        currencySymbol: WEB3_CONFIG.CURRENCY_SYMBOL,
      });

      const browserProvider = new ethers.BrowserProvider(provider);
      const network = await browserProvider.getNetwork();

      detachProviderListeners();
      attachProviderListeners(provider);

      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setWalletProvider(provider);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LAST_WALLET_STORAGE_KEY, walletId);
        } catch {
          // ignore storage errors
        }
      }

      setIsWalletModalOpen(false);
      setWalletModalError(null);
    },
    [attachProviderListeners, detachProviderListeners]
  );

  // Opens the wallet selection modal. Kept as the same function identity
  // every existing component already calls.
  const connectWallet = useCallback(async () => {
    setWalletModalError(null);

    // The primary CTA should immediately trigger the installed wallet prompt.
    // Previously it only opened the picker, which looked like a no-op when the
    // user expected MetaMask/Rabby/etc. to open on the first click.
    const injected = getFallbackInjectedProvider();
    if (injected) {
      try {
        await finalizeConnection(injected, "injected");
        return;
      } catch (err: any) {
        console.error("[v0] Direct wallet connection failed:", err);
        setWalletModalError(err?.message || "Wallet connection failed. Select a wallet below.");
      }
    }

    // No injected extension (or the direct request failed): show the picker so
    // WalletConnect can be selected for mobile wallets.
    setIsWalletModalOpen(true);
  }, [finalizeConnection]);

  const closeWalletModal = useCallback(() => {
    if (connectingWalletId) return;
    setIsWalletModalOpen(false);
    setWalletModalError(null);
  }, [connectingWalletId]);

  // Ask installed extensions to announce themselves so the modal can show
  // each one's own live logo (EIP-6963 info.icon) instead of the static
  // fallback. Purely additive — connection behavior is unchanged.
  useEffect(() => {
    if (!isWalletModalOpen) return;
    let cancelled = false;
    (async () => {
      const injected: EIP6963ProviderDetail[] = await requestInjectedProviders();
      if (cancelled) return;
      const iconMap: Record<string, string> = {};
      injected.forEach((detail) => {
        if (detail.info?.rdns && detail.info?.icon) {
          iconMap[detail.info.rdns] = detail.info.icon;
        }
      });
      setInjectedWalletIcons(iconMap);
    })();
    return () => {
      cancelled = true;
    };
  }, [isWalletModalOpen]);

  const selectWallet = useCallback(
    async (option: WalletOption) => {
      setWalletModalError(null);
      setConnectingWalletId(option.id);
      try {
        let provider: EIP1193Provider | null = null;

        // 1. Try to find the wallet as an installed browser extension.
        if (option.rdns) {
          const injected = await requestInjectedProviders();
          provider = findInjectedByRdns(injected, option.rdns);
        }

        // 2. Generic "Browser Wallet" option — use whatever is injected.
        if (!provider && option.id === "injected") {
          provider = getFallbackInjectedProvider();
        }

        // 3. Wallets that are WalletConnect-first (WalletConnect itself,
        //    Rainbow, Trust Wallet) connect via WalletConnect directly if
        //    no matching extension was found.
        if (!provider && option.kind === "walletconnect") {
          if (!WALLETCONNECT_PROJECT_ID) {
            throw new Error(
              "WalletConnect is not configured for this site yet. Try a browser extension wallet instead."
            );
          }
          provider = await connectWalletConnect(WALLETCONNECT_PROJECT_ID, WALLETCONNECT_CHAINS);
        }

        // 4. Extension-first wallets (MetaMask, Rabby, Coinbase Wallet)
        //    that weren't found installed — offer a WalletConnect fallback
        //    so their mobile apps still work, otherwise point to install.
        if (!provider && option.rdns && option.kind === "injected") {
          if (WALLETCONNECT_PROJECT_ID) {
            provider = await connectWalletConnect(WALLETCONNECT_PROJECT_ID, WALLETCONNECT_CHAINS);
          } else if (option.downloadUrl && typeof window !== "undefined") {
            window.open(option.downloadUrl, "_blank", "noopener,noreferrer");
            throw new Error(`${option.name} was not detected. Opening the install page in a new tab.`);
          }
        }

        if (!provider) {
          throw new Error(`${option.name} was not detected in this browser.`);
        }

        await finalizeConnection(provider, option.id);
      } catch (err: any) {
        console.error("Wallet connection error:", err);
        if (err?.code === 4001 || /reject/i.test(err?.message || "")) {
          setWalletModalError("Connection request was rejected.");
        } else {
          setWalletModalError(err?.message || "Failed to connect wallet.");
        }
      } finally {
        setConnectingWalletId(null);
      }
    },
    [finalizeConnection]
  );

  // Silent reconnect on page load, using the last wallet the user
  // successfully connected with. Never triggers a popup or QR modal —
  // only reconnects if the wallet already authorizes this site.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastWalletId: string | null = null;
    try {
      lastWalletId = window.localStorage.getItem(LAST_WALLET_STORAGE_KEY);
    } catch {
      lastWalletId = null;
    }
    if (!lastWalletId) return;

    const option = WALLET_CATALOG.find((w) => w.id === lastWalletId);
    if (!option) return;

    (async () => {
      try {
        let provider: EIP1193Provider | null = null;

        if (option.rdns) {
          const injected = await requestInjectedProviders();
          provider = findInjectedByRdns(injected, option.rdns);
        }
        if (!provider && option.id === "injected") {
          provider = getFallbackInjectedProvider();
        }

        // Never silently open WalletConnect — only reconnect wallets that
        // are already sitting in the page (no popup needed).
        if (!provider) return;

        const accounts: string[] = await provider.request({ method: "eth_accounts" });
        if (!accounts || accounts.length === 0) return;

        await finalizeConnection(provider, option.id, true);
      } catch (err) {
        console.error("Silent wallet reconnect failed:", err);
      }
    })();
    // Runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps `signer` in sync with the connected account/network. Purely
  // additive — internal contract calls below still use getSigner()
  // directly, unchanged from before.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!walletProvider || !account) {
        setSigner(null);
        return;
      }
      try {
        const s = await getSigner();
        if (!cancelled) setSigner(s);
      } catch {
        if (!cancelled) setSigner(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletProvider, account, chainId, getSigner]);

  const switchNetwork = useCallback(async () => {
    try {
      if (!walletProvider) {
        await connectWallet();
        return;
      }
      await switchOrAddChain(walletProvider, {
        chainId: WEB3_CONFIG.CHAIN_ID,
        chainName: WEB3_CONFIG.CHAIN_NAME,
        rpcUrl: WEB3_CONFIG.RPC_URL,
        explorerUrl: WEB3_CONFIG.EXPLORER_URL,
        currencySymbol: WEB3_CONFIG.CURRENCY_SYMBOL,
      });
      // Some wallets are slow or unreliable about emitting `chainChanged`
      // after wallet_switchEthereumChain / wallet_addEthereumChain
      // resolves. Read the chain back directly so `isCorrectNetwork`
      // updates immediately and reliably reflects Chain ID 4663, instead
      // of waiting on an event that may never fire.
      try {
        const hexId: string = await walletProvider.request({ method: "eth_chainId" });
        setChainId(parseInt(hexId, 16));
      } catch {
        // Non-fatal — the chainChanged listener (if the wallet does emit
        // it) will still pick this up.
      }
    } catch (err) {
      console.error("Network switch error:", err);
      setErrorMessage("Failed to switch network in wallet");
    }
  }, [walletProvider, connectWallet]);

  // Explicit alias — same function, kept available under both names.
  const switchToRobinhood = switchNetwork;

  const mintNft = async (quantity: number) => {
    if (!account) {
      await connectWallet();
      return;
    }
    if (chainId !== WEB3_CONFIG.CHAIN_ID) {
      setTxState("WRONG_NETWORK");
      return;
    }

    try {
      setErrorMessage(null);
      setTxHash(null);

      const signer = await getSigner();
      const nft = new ethers.Contract(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, NFT_ABI, signer);
      const tokenContract = new ethers.Contract(WEB3_CONFIG.MINT_TOKEN_ADDRESS, ERC20_ABI, signer);
      const totalCost = mintPrice * BigInt(quantity);

      const allowance: bigint = await tokenContract.allowance(account, WEB3_CONFIG.NFT_CONTRACT_ADDRESS);
      if (allowance < totalCost) {
        setTxState("CONFIRM_IN_WALLET");
        const approveTx = await tokenContract.approve(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, totalCost);
        setTxState("TRANSACTION_PENDING");
        await approveTx.wait();
      }

      setTxState("CONFIRM_IN_WALLET");
      const tx = await nft.mint(quantity);
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();

      setTxState("MINT_SUCCESSFUL");
      await refreshContractData();
    } catch (err: any) {
      console.error(err);
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else if (err.message?.includes("insufficient funds")) {
        setTxState("INSUFFICIENT_BALANCE");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(describeTxError(err, "Transaction failed"));
      }
    }
  };

  const callContractMethod = async (methodName: string, args: any[]): Promise<boolean> => {
    if (!account) return false;
    try {
      setTxState("CONFIRM_IN_WALLET");
      const signer = await getSigner();
      const nft = new ethers.Contract(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, NFT_ABI, signer);
      const tx = await nft[methodName](...args);
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("MINT_SUCCESSFUL");
      await refreshContractData();
      return true;
    } catch (err: any) {
      console.error(err);
      setTxState("TRANSACTION_FAILED");
      setErrorMessage(describeTxError(err, "Execution failed"));
      return false;
    }
  };

  // ==========================================================
  // Burn Lab — additive state & functions, separate contract instance.
  // None of this touches mint/staking/admin state above.
  // ==========================================================
  const burnLabConfigured = !!WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS;

const [burnLabOwnerAddress, setBurnLabOwnerAddress] = useState(OWNER_ADDRESS);
  const [burnLabNftContractMismatch, setBurnLabNftContractMismatch] = useState(false);
  const [burnLabNftContractAddress, setBurnLabNftContractAddress] = useState("");
  const [burnRewards, setBurnRewards] = useState<BurnReward[]>([]);
  const [burnRewardsLoading, setBurnRewardsLoading] = useState(false);

  const isBurnLabOwner =
    !!account && account.toLowerCase() === burnLabOwnerAddress.toLowerCase();

  const readErc20Meta = useCallback(
    async (tokenAddress: string): Promise<{ symbol: string; decimals: number } | null> => {
      try {
        const provider = getReadProvider();
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [symbol, decimals] = await Promise.all([
          token.symbol().catch(() => "TOKEN"),
          token.decimals().catch(() => 18),
        ]);
        return { symbol, decimals: Number(decimals) };
      } catch (err) {
        console.error("Error reading ERC20 metadata:", err);
        return null;
      }
    },
    []
  );

  const refreshBurnLabData = useCallback(async () => {
    if (!burnLabConfigured) return;
    setBurnRewardsLoading(true);
    try {
      const provider = getReadProvider();
      const burnLab = new ethers.Contract(WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS, BURN_LAB_ABI, provider);

      const [ownr, count, nftContractAddr] = await Promise.all([
        burnLab.owner().catch(() => "0x0000000000000000000000000000000000000000"),
        burnLab.getRewardsCount().catch(() => BigInt(0)),
        burnLab.nftContract().catch(() => ""),
      ]);
      // Use the actual on-chain owner as the source of truth instead of
      // overwriting it with the static OWNER_ADDRESS constant (that constant
      // is the *NFT* contract's owner and is not guaranteed to be the same
      // wallet as the Burn Lab contract's owner).
      setBurnLabOwnerAddress(
        ownr && ownr !== ethers.ZeroAddress ? ownr : OWNER_ADDRESS
      );

      // The Burn Lab contract must be burning THIS collection's NFTs. If the
      // deployed Burn Lab's nftContract() doesn't match the NFT contract
      // this site is configured for, burning must be blocked rather than
      // silently allowed.
      setBurnLabNftContractAddress(nftContractAddr || "");
      setBurnLabNftContractMismatch(
        !!nftContractAddr &&
          nftContractAddr.toLowerCase() !== WEB3_CONFIG.NFT_CONTRACT_ADDRESS.toLowerCase()
      );

      const total = Number(count);
      const rewards: BurnReward[] = [];

      for (let i = 0; i < total; i++) {
        try {
          const cfg = await burnLab.getReward(i);
          const tokenAddress: string = cfg.token;
          const [meta, balance, capacity] = await Promise.all([
            readErc20Meta(tokenAddress),
            burnLab.getRewardTokenBalance(tokenAddress).catch(() => BigInt(0)),
            burnLab.getAvailableCapacity(tokenAddress).catch(() => BigInt(0)),
          ]);

          rewards.push({
            token: tokenAddress,
            symbol: meta?.symbol || "TOKEN",
            decimals: meta?.decimals ?? 18,
            amountPerNFT: cfg.amountPerNFT,
            active: cfg.active,
            totalLoaded: cfg.totalLoaded,
            totalDistributed: cfg.totalDistributed,
            contractBalance: balance,
            availableCapacity: capacity,
          });
        } catch (err) {
          console.error("Error reading Burn Lab reward index", i, err);
        }
      }

      setBurnRewards(rewards);
    } catch (err) {
      console.error("Error fetching Burn Lab data:", err);
    } finally {
      setBurnRewardsLoading(false);
    }
  }, [burnLabConfigured, readErc20Meta]);

  useEffect(() => {
    if (!burnLabConfigured) return;
    refreshBurnLabData();
    const interval = setInterval(refreshBurnLabData, 20000);
    return () => clearInterval(interval);
  }, [burnLabConfigured, refreshBurnLabData]);

  const getBurnLabSignerContract = useCallback(async () => {
    const signer = await getSigner();
    return new ethers.Contract(WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS, BURN_LAB_ABI, signer);
  }, [getSigner]);

  const checkBurnApproval = async (ownerAddress: string): Promise<boolean> => {
    try {
      const provider = getReadProvider();
      const nft = new ethers.Contract(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, ERC721_MINIMAL_ABI, provider);
      return await nft.isApprovedForAll(ownerAddress, WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS);
    } catch (err) {
      console.error("Error checking Burn Lab NFT approval:", err);
      return false;
    }
  };

  const approveBurnLab = async (): Promise<boolean> => {
    if (!account) return false;
    try {
      setTxState("CHECKING_APPROVAL");
      const signer = await getSigner();
      const nft = new ethers.Contract(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, ERC721_MINIMAL_ABI, signer);
      setTxState("CONFIRM_IN_WALLET");
      const tx = await nft.setApprovalForAll(WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS, true);
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("IDLE");
      return true;
    } catch (err: any) {
      console.error(err);
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(describeTxError(err, "Approval failed"));
      }
      return false;
    }
  };

  const executeBurn = async (tokenIds: string[]): Promise<boolean> => {
    if (!account) {
      await connectWallet();
      return false;
    }
    if (chainId !== WEB3_CONFIG.CHAIN_ID) {
      setTxState("WRONG_NETWORK");
      return false;
    }
    if (!burnLabConfigured) {
      setTxState("TRANSACTION_FAILED");
      setErrorMessage("Burn Lab contract address is not configured yet.");
      return false;
    }
    if (burnLabNftContractMismatch) {
      setTxState("TRANSACTION_FAILED");
      setErrorMessage(
        "Burn Lab contract is configured for a different NFT collection. Burning is disabled until this is fixed."
      );
      return false;
    }

    try {
      setErrorMessage(null);
      setTxHash(null);
      setTxState("CHECKING_APPROVAL");

      const approved = await checkBurnApproval(account);
      if (!approved) {
        setTxState("APPROVAL_REQUIRED");
        return false;
      }

      // Client-side sanity check for reward capacity (the contract still
      // enforces this as the source of truth and will revert if it's wrong).
      const insufficient = burnRewards.some(
        (r) => r.active && r.availableCapacity < BigInt(tokenIds.length)
      );
      if (insufficient) {
        setTxState("INSUFFICIENT_REWARD_BALANCE");
        return false;
      }

      const burnLab = await getBurnLabSignerContract();
      setTxState("CONFIRM_IN_WALLET");
      const tx = await burnLab.burn(tokenIds.map((id) => BigInt(id)));
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();

      setTxState("BURN_SUCCESSFUL");
      await refreshBurnLabData();
      return true;
    } catch (err: any) {
      console.error(err);
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else if (err.reason?.includes?.("insufficient reward balance")) {
        setTxState("INSUFFICIENT_REWARD_BALANCE");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(describeTxError(err, "Burn transaction failed"));
      }
      return false;
    }
  };

  const callBurnLabMethod = async (methodName: string, args: any[]): Promise<boolean> => {
    if (!account) return false;
    try {
      setTxState("CONFIRM_IN_WALLET");
      const burnLab = await getBurnLabSignerContract();
      const tx = await burnLab[methodName](...args);
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("MINT_SUCCESSFUL");
      await refreshBurnLabData();
      return true;
    } catch (err: any) {
      console.error(err);
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(describeTxError(err, "Execution failed"));
      }
      return false;
    }
  };

  const addBurnReward = (token: string, amountPerNFTRaw: bigint) =>
    callBurnLabMethod("addRewardToken", [token, amountPerNFTRaw]);

  const updateBurnRewardAmount = (token: string, newAmountPerNFTRaw: bigint) =>
    callBurnLabMethod("updateRewardAmount", [token, newAmountPerNFTRaw]);

  const setBurnRewardActive = (token: string, active: boolean) =>
    callBurnLabMethod("setRewardActive", [token, active]);

  const withdrawBurnRewardTokens = (token: string, amountRaw: bigint) =>
    callBurnLabMethod("withdrawRewardTokens", [token, amountRaw]);

  const loadBurnRewardTokens = async (token: string, amountRaw: bigint): Promise<boolean> => {
    if (!account) return false;
    try {
      setErrorMessage(null);
      setTxHash(null);

      const signer = await getSigner();
      const erc20 = new ethers.Contract(token, ERC20_ABI, signer);

      const allowance: bigint = await erc20.allowance(account, WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS);
      if (allowance < amountRaw) {
        setTxState("CONFIRM_IN_WALLET");
        const approveTx = await erc20.approve(WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS, amountRaw);
        setTxState("TRANSACTION_PENDING");
        await approveTx.wait();
      }

      return await callBurnLabMethod("loadRewardTokens", [token, amountRaw]);
    } catch (err: any) {
      console.error(err);
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(describeTxError(err, "Loading reward tokens failed"));
      }
      return false;
    }
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        walletProvider,
        signer,
        isCorrectNetwork: chainId === WEB3_CONFIG.CHAIN_ID,
        isOwner,
        txState,
        txHash,
        errorMessage,
        totalSupply,
        maxSupply,
        mintPrice,
        isPaused,
        publicMintEnabled,
        ownerAddress,
        baseUri,
        revealed,
        royaltyFeeBps,
        tokenSymbol,
        tokenDecimals,
        contractFunctions,
        walletConnectReady,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        switchToRobinhood,
        mintNft,
        refreshContractData,
        callContractMethod,

        // Burn Lab (additive)
        burnLabConfigured,
        burnLabOwnerAddress,
        isBurnLabOwner,
        burnLabNftContractMismatch,
        burnLabNftContractAddress,
        burnRewards,
        burnRewardsLoading,
        refreshBurnLabData,
        checkBurnApproval,
        approveBurnLab,
        executeBurn,
        addBurnReward,
        updateBurnRewardAmount,
        setBurnRewardActive,
        loadBurnRewardTokens,
        withdrawBurnRewardTokens,
        readErc20Meta,
      }}
    >
      {children}

      {isWalletModalOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-mono"
          onClick={closeWalletModal}
        >
          <div
            className="w-full max-w-sm glass-strong pixel-corners"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-neon animate-pulse" />
                <h2 className="text-sm font-bold text-white tracking-widest">CONNECT WALLET</h2>
              </div>
              <button
                type="button"
                onClick={closeWalletModal}
                className="text-zinc-500 hover:text-white text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Select a wallet to connect to {WEB3_CONFIG.CHAIN_NAME}.
              </p>

              {walletModalError && (
                <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-[11px]">
                  {walletModalError}
                </div>
              )}

              {!WALLETCONNECT_PROJECT_ID && (
                <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-[11px]">
                  WalletConnect Project ID not configured — QR / mobile connections are
                  unavailable until NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set. Browser extension
                  wallets still work normally.
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                {WALLET_CATALOG.map((option) => {
                  const isBusy = connectingWalletId === option.id;
                  const isDisabled = connectingWalletId !== null && !isBusy;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectWallet(option)}
                      disabled={isDisabled || isBusy}
                      className="w-full flex items-center gap-3 p-3 border border-white/10 bg-black/30 pixel-corners hover:border-neon/50 hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
                    >
                      <WalletLogo
                        option={option}
                        liveIconSrc={option.rdns ? injectedWalletIcons[option.rdns] : undefined}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-white tracking-wide">
                          {option.name}
                        </span>
                        <span className="block text-[10px] text-zinc-500 truncate">
                          {option.description}
                        </span>
                      </span>
                      {isBusy ? (
                        <span className="text-[10px] text-neon tracking-widest animate-pulse">
                          ...
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">›</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-white/10 text-[10px] text-zinc-600 text-center">
              By connecting, you agree to the terms of the connected wallet provider.
            </div>
          </div>
        </div>
      )}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
