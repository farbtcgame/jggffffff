export interface ChainConfig {
  CHAIN_ID: number;
  CHAIN_NAME: string;
  RPC_URL: string;
  EXPLORER_URL: string;
  CURRENCY_SYMBOL: string;
}

// ==========================================
// Robinhood Chain — MAINNET ONLY
//
// The site now runs exclusively on Robinhood Chain MAINNET. Testnet has
// been fully removed from the active configuration, chain list, wallet
// connection flow, and network-switch logic. RPC URL and Chain ID are
// configurable via environment variables so they can be updated without a
// code change, but there is no runtime "testnet" mode to opt into.
// ==========================================
export const ROBINHOOD_MAINNET: ChainConfig = {
  CHAIN_ID: Number(process.env.NEXT_PUBLIC_ROBINHOOD_MAINNET_CHAIN_ID || 4663),
  CHAIN_NAME: "Robinhood Chain",
  RPC_URL: process.env.NEXT_PUBLIC_ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
  EXPLORER_URL: "https://robinhoodchain.blockscout.com",
  CURRENCY_SYMBOL: "RH",
};

export const ACTIVE_CHAIN: ChainConfig = ROBINHOOD_MAINNET;

// Kept as `true` — the Alchemy NFT API base URL below is always the
// mainnet subdomain now that testnet has been removed.
const USE_MAINNET = true;

export interface Web3Config extends ChainConfig {
  NFT_CONTRACT_ADDRESS: string;
  MINT_TOKEN_ADDRESS: string;
  BURN_LAB_CONTRACT_ADDRESS: string;
}

export const WEB3_CONFIG: Web3Config = {
  ...ACTIVE_CHAIN,
  // Fill this in after `npm run deploy:testnet` / `deploy:mainnet` in /hardhat.
  NFT_CONTRACT_ADDRESS:
    process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "0x68e5a6aaf2503940f0337243063ab8f4da6bedec",
  // Fixed mint payment token, as specified.
  MINT_TOKEN_ADDRESS: "0xa9635A21fE99084F0C795D33Fc3A45fCDb3027AF",
  // Burn Lab — permanent-burn rewards contract. NFTs sent here go straight
  // to the dead address (0x000...dEaD); this contract never holds custody.
  BURN_LAB_CONTRACT_ADDRESS:
    process.env.NEXT_PUBLIC_BURN_LAB_CONTRACT_ADDRESS || "0xB1d0F60B99Cc7e96674a1A2b83d3357FB3018c06",
};

// ==========================================
// WalletConnect
// ==========================================
// Get a free Project ID at https://cloud.reown.com (30 seconds, no cost).
// Left blank on purpose — fill in .env.local as NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// Chains offered to WalletConnect sessions (mobile wallets, QR connections).
// Robinhood Chain MAINNET only — no testnet option is offered anywhere in
// the wallet connection flow.
export const WALLETCONNECT_CHAINS: { id: number; rpc: string }[] = [
  { id: ACTIVE_CHAIN.CHAIN_ID, rpc: ACTIVE_CHAIN.RPC_URL },
];

// ==========================================
// $StonkBroker token — buy link (OpenSea)
// ==========================================
export const STONKBROKER_BUY_URL =
  "https://opensea.io/collection/mini-brokers";

// ==========================================
// IPFS gateway used for the rotating preview-card images on the mint page
// ==========================================
export const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/";

// ==========================================
// Alchemy — used by the Staking page to look up which Mini Brokers NFTs
// the connected wallet owns (Alchemy NFT API: getNFTsForOwner).
// Get a free API key at https://dashboard.alchemy.com
// ==========================================
export const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

// Alchemy's NFT API base URL, per network. Robinhood Chain is supported by
// Alchemy under the "robinhood-mainnet" / "robinhood-testnet" subdomains.
export const ALCHEMY_NFT_API_BASE = USE_MAINNET
  ? `https://robinhood-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`
  : `https://robinhood-testnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

// ==========================================
// Exchange (SWAP) — Robinhood Chain MAINNET only
// ==========================================
// Router/aggregator contract that will execute swaps once trading goes
// live. Left blank until a real router is deployed/selected; the Exchange
// UI reads this to decide whether swap execution is wired up yet.
export const SWAP_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS || "";

// The ERC-20 token offered opposite native RH in the swap interface.
// Defaults to the existing mint payment token so the Exchange page has a
// sensible pair configured out of the box.
export const SWAP_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_SWAP_TOKEN_ADDRESS || "0xa9635A21fE99084F0C795D33Fc3A45fCDb3027AF";
export const SWAP_TOKEN_SYMBOL = process.env.NEXT_PUBLIC_SWAP_TOKEN_SYMBOL || "MINI";

// Single configurable launch timestamp for the Exchange 14-day countdown.
// Accepts an ISO-8601 date string (recommended) or a raw millisecond
// epoch. If unset, falls back to a fixed placeholder date rather than a
// value derived from "now", so the countdown never resets or drifts
// across deploys/refreshes just because the env var is missing.
export const EXCHANGE_LAUNCH_TIMESTAMP =
  process.env.NEXT_PUBLIC_EXCHANGE_LAUNCH_TIMESTAMP || "2026-08-25T00:00:00Z";

// ==========================================
// Clock In — 7-day countdown
// ==========================================
// Optional contract that records/rewards a wallet's clock-in once live.
// Left blank until deployed; the Clock In page reads this to decide
// whether the on-chain action is wired up yet.
export const CLOCK_IN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CLOCK_IN_CONTRACT_ADDRESS || "";

// Single configurable launch timestamp for the Clock In 7-day countdown.
// Same fixed-fallback behavior as EXCHANGE_LAUNCH_TIMESTAMP above.
export const CLOCK_IN_LAUNCH_TIMESTAMP =
  process.env.NEXT_PUBLIC_CLOCK_IN_LAUNCH_TIMESTAMP || "2026-08-18T00:00:00Z";

// ==========================================================
// NFT Staking — separate contract, deployed after the /hardhat-staking
// package's `deploy:staking` script. Left blank until deployed; pages
// read this to decide whether staking is wired up yet.
// ==========================================================
export const STAKING_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS || "";
