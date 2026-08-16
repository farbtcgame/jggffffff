/**
 * Wallet connection layer.
 *
 * Provides:
 *  - EIP-6963 discovery of installed injected wallets (MetaMask, Rabby,
 *    Coinbase Wallet, Rainbow, etc. all announce themselves this way).
 *  - A generic `window.ethereum` fallback for older, non-EIP-6963 wallets.
 *  - A WalletConnect v2 bootstrap (mobile wallets, incl. Trust Wallet and
 *    Rainbow, and QR-code desktop connections).
 *  - A chain switch/add helper (wallet_switchEthereumChain with an
 *    automatic wallet_addEthereumChain fallback for unrecognized chains).
 *
 * This file is intentionally framework-agnostic — it returns plain
 * EIP-1193 providers so the rest of the app (ethers `BrowserProvider`)
 * keeps working exactly as before.
 */

export interface EIP1193Provider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  providers?: EIP1193Provider[];
  session?: unknown;
  disconnect?: () => Promise<void>;
  [key: string]: any;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export type WalletKind = "injected" | "walletconnect";

export interface WalletOption {
  id: string;
  name: string;
  description: string;
  kind: WalletKind;
  /** EIP-6963 rdns identifier used to match an installed browser extension. */
  rdns?: string;
  accentColor: string;
  initials: string;
  downloadUrl?: string;
  /**
   * Static official logo shown in the wallet modal. For injected wallets
   * this is only a fallback — if the installed extension announces itself
   * via EIP-6963 with its own `info.icon`, that live icon is preferred and
   * takes priority over this URL.
   */
  logoUrl?: string;
}

// ==========================================================
// Wallet catalog shown in the connection modal
// ==========================================================
export const WALLET_CATALOG: WalletOption[] = [
  {
    id: "metamask",
    name: "MetaMask",
    description: "Browser extension or mobile app",
    kind: "injected",
    rdns: "io.metamask",
    accentColor: "#F6851B",
    initials: "MM",
    downloadUrl: "https://metamask.io/download",
    logoUrl: "https://www.google.com/s2/favicons?domain=metamask.io&sz=128",
  },
  {
    id: "rabby",
    name: "Rabby Wallet",
    description: "Browser extension",
    kind: "injected",
    rdns: "io.rabby",
    accentColor: "#7084FF",
    initials: "RB",
    downloadUrl: "https://rabby.io",
    logoUrl: "https://www.google.com/s2/favicons?domain=rabby.io&sz=128",
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    description: "Browser extension or mobile app",
    kind: "injected",
    rdns: "com.coinbase.wallet",
    accentColor: "#0052FF",
    initials: "CB",
    downloadUrl: "https://www.coinbase.com/wallet",
    logoUrl: "https://www.google.com/s2/favicons?domain=coinbase.com&sz=128",
  },
  {
    id: "rainbow",
    name: "Rainbow Wallet",
    description: "Mobile app via WalletConnect",
    kind: "walletconnect",
    rdns: "me.rainbow",
    accentColor: "#001E59",
    initials: "RW",
    downloadUrl: "https://rainbow.me",
    logoUrl: "https://www.google.com/s2/favicons?domain=rainbow.me&sz=128",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    description: "Mobile app via WalletConnect",
    kind: "walletconnect",
    rdns: "com.trustwallet.app",
    accentColor: "#3375BB",
    initials: "TW",
    downloadUrl: "https://trustwallet.com",
    logoUrl: "https://www.google.com/s2/favicons?domain=trustwallet.com&sz=128",
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    description: "Scan a QR code with any mobile wallet",
    kind: "walletconnect",
    accentColor: "#3B99FC",
    initials: "WC",
    logoUrl: "https://www.google.com/s2/favicons?domain=walletconnect.com&sz=128",
  },
  {
    id: "injected",
    name: "Browser Wallet",
    description: "Any wallet installed in this browser",
    kind: "injected",
    accentColor: "#71717A",
    initials: "BW",
  },
];

// ==========================================================
// EIP-6963 injected wallet discovery
// ==========================================================
let discoveredProviders: EIP6963ProviderDetail[] = [];
let discoveryListenerAttached = false;

function attachDiscoveryListener() {
  if (typeof window === "undefined" || discoveryListenerAttached) return;
  discoveryListenerAttached = true;
  window.addEventListener("eip6963:announceProvider", ((event: CustomEvent<EIP6963ProviderDetail>) => {
    const detail = event.detail;
    if (!detail?.info?.rdns) return;
    if (!discoveredProviders.some((p) => p.info.rdns === detail.info.rdns)) {
      discoveredProviders.push(detail);
    }
  }) as EventListener);
}

/**
 * Asks every installed EIP-6963-compatible wallet to announce itself and
 * resolves with whatever responded within `timeoutMs`.
 */
export function requestInjectedProviders(timeoutMs = 250): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }
    attachDiscoveryListener();
    discoveredProviders = [];
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => resolve([...discoveredProviders]), timeoutMs);
  });
}

export function findInjectedByRdns(
  providers: EIP6963ProviderDetail[],
  rdns: string
): EIP1193Provider | null {
  const match = providers.find((p) => p.info.rdns === rdns);
  return match ? match.provider : null;
}

/**
 * Fallback for wallets that don't (yet) implement EIP-6963 — uses the
 * legacy `window.ethereum` injection directly, same as the previous
 * implementation did.
 */
export function getFallbackInjectedProvider(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers[0];
  }
  return eth;
}

export function hasAnyInjectedProvider(): boolean {
  return typeof window !== "undefined" && !!(window as any).ethereum;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// ==========================================================
// WalletConnect v2
// ==========================================================
let walletConnectProviderPromise: Promise<any> | null = null;

export function resetWalletConnectSession() {
  walletConnectProviderPromise = null;
}

async function getWalletConnectProvider(
  projectId: string,
  chains: { id: number; rpc: string }[]
) {
  if (!walletConnectProviderPromise) {
    walletConnectProviderPromise = (async () => {
      const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
      const [primaryChain, ...otherChains] = chains;
      const rpcMap: Record<number, string> = {};
      chains.forEach((c) => {
        rpcMap[c.id] = c.rpc;
      });

      const provider = await EthereumProvider.init({
        projectId,
        chains: [primaryChain.id],
        optionalChains: otherChains.map((c) => c.id),
        rpcMap,
        showQrModal: true,
        metadata: {
          name: "404 ORIGIN",
          description: "404 Origin NFT Mint Terminal",
          url: typeof window !== "undefined" ? window.location.origin : "https://www.minibrokers.cash",
          icons: [
            typeof window !== "undefined"
              ? `${window.location.origin}/favicon.ico`
              : "https://www.minibrokers.cash/favicon.ico",
          ],
        },
      });

      return provider;
    })();
  }
  return walletConnectProviderPromise;
}

/**
 * Opens the WalletConnect QR / deep-link modal and resolves once a mobile
 * wallet (Trust Wallet, Rainbow, MetaMask Mobile, Coinbase Wallet, etc.)
 * approves the connection.
 */
export async function connectWalletConnect(
  projectId: string,
  chains: { id: number; rpc: string }[]
): Promise<EIP1193Provider> {
  const provider = await getWalletConnectProvider(projectId, chains);

  if (provider.session) {
    try {
      await provider.disconnect();
    } catch {
      // ignore — we're about to start a fresh session anyway
    }
  }

  await provider.connect();
  return provider as unknown as EIP1193Provider;
}

/**
 * Cleanly tears down a provider's session, whether it's an injected
 * extension (no-op, since those don't hold a persistent session object)
 * or a WalletConnect session (which must be explicitly disconnected).
 */
export async function disconnectProvider(provider: EIP1193Provider | null): Promise<void> {
  if (!provider) return;
  try {
    if (typeof provider.disconnect === "function") {
      await provider.disconnect();
    }
  } catch (err) {
    console.error("Error disconnecting wallet session:", err);
  } finally {
    resetWalletConnectSession();
  }
}

// ==========================================================
// Chain switching
// ==========================================================
export interface SwitchableChain {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl?: string;
  currencySymbol: string;
}

/**
 * Requests the wallet switch to `chain`. If the wallet doesn't recognize
 * the chain yet (error code 4902), falls back to wallet_addEthereumChain
 * so Robinhood Chain testnet/mainnet can be added automatically.
 */
export async function switchOrAddChain(provider: EIP1193Provider, chain: SwitchableChain): Promise<void> {
  const hexChainId = "0x" + chain.chainId.toString(16);
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  } catch (err: any) {
    const code = err?.code ?? err?.data?.originalError?.code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexChainId,
            chainName: chain.chainName,
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: chain.explorerUrl ? [chain.explorerUrl] : [],
            nativeCurrency: {
              name: chain.currencySymbol,
              symbol: chain.currencySymbol,
              decimals: 18,
            },
          },
        ],
      });
    } else {
      throw err;
    }
  }
}
