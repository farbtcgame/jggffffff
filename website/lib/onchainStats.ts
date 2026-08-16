import { ethers } from "ethers";
import { WEB3_CONFIG, ALCHEMY_RPC_URL } from "../config/web3";
import NFT_ABI from "../abi/NFT.json";
import BURN_LAB_ABI from "../abi/BurnLab.json";

// Minimal read-only fragments not present in the trimmed ABI files above,
// but standard on any ERC-721 / ERC-20 implementation.
const ERC721_EXTRA_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const ERC20_EXTRA_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// Standard "burn" address most retirement flows send tokens to.
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

let cachedProvider: ethers.JsonRpcProvider | null = null;
// Read-only calls (homepage supply/burn cards, collection activity logs)
// go through Alchemy — see the ALCHEMY_RPC_URL comment in config/web3.ts
// for why the raw chain RPC isn't used here. Wallet transactions are
// unaffected; those go through the connected wallet's own provider.
export function getPublicProvider(): ethers.JsonRpcProvider {
  if (!cachedProvider) {
    cachedProvider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
  }
  return cachedProvider;
}

export interface SupplyStats {
  totalSupply: bigint;
  maxSupply: bigint;
  nftBurned: bigint;
}

/** Reads live NFT collection supply + burned count (NFTs held at the dead address). */
export async function fetchSupplyStats(): Promise<SupplyStats> {
  const provider = getPublicProvider();
  const nft = new ethers.Contract(
    WEB3_CONFIG.NFT_CONTRACT_ADDRESS,
    [...NFT_ABI, ...ERC721_EXTRA_ABI],
    provider
  );

  const [totalSupply, maxSupply, nftBurned] = await Promise.all([
    nft.totalSupply() as Promise<bigint>,
    nft.MAX_SUPPLY() as Promise<bigint>,
    nft.balanceOf(DEAD_ADDRESS) as Promise<bigint>,
  ]);

  return { totalSupply, maxSupply, nftBurned };
}

export interface TokenBurnStats {
  burned: bigint;
  totalSupply: bigint;
  decimals: number;
  symbol: string;
}

/** Reads how much of the ecosystem token has been permanently burned (sent to the dead address). */
export async function fetchTokenBurnStats(): Promise<TokenBurnStats> {
  const provider = getPublicProvider();
  const token = new ethers.Contract(WEB3_CONFIG.MINT_TOKEN_ADDRESS, ERC20_EXTRA_ABI, provider);

  const [burned, totalSupply, decimals, symbol] = await Promise.all([
    token.balanceOf(DEAD_ADDRESS) as Promise<bigint>,
    token.totalSupply() as Promise<bigint>,
    token.decimals() as Promise<number>,
    token.symbol() as Promise<string>,
  ]);

  return { burned, totalSupply, decimals, symbol };
}

/** True once the Burn Lab contract address has been configured. */
export function isBurnLabConfigured(): boolean {
  return Boolean(WEB3_CONFIG.BURN_LAB_CONTRACT_ADDRESS);
}

export { BURN_LAB_ABI };
