import { ALCHEMY_API_KEY, ALCHEMY_NFT_API_BASE, WEB3_CONFIG, IPFS_GATEWAY } from "../config/web3";

export interface OwnedNft {
  tokenId: string;
  name: string;
  image: string;
}

function toGatewayUrl(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return IPFS_GATEWAY + uri.replace("ipfs://", "");
  if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice(5)}`;
  return uri;
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`ALCHEMY_HTTP_${response.status}`);
    return await response.json();
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("ALCHEMY_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches every Mini Brokers NFT the given address currently owns, via
 * Alchemy's NFT API (getNFTsForOwner), filtered to our collection contract.
 *
 * NOTE: Alchemy's NFT API coverage can vary per chain. Robinhood Chain has a
 * Chain API endpoint (robinhood-mainnet / robinhood-testnet), but if the NFT
 * API specifically isn't available for it yet, this will throw — the caller
 * shows an error state rather than silently failing.
 */
export async function fetchOwnedMiniBrokers(ownerAddress: string): Promise<OwnedNft[]> {
  if (!ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_NOT_CONFIGURED");
  }

  // Alchemy caps each getNFTsForOwner response at pageSize items and
  // returns a `pageKey` when more are available. A wallet holding more
  // than one page of this collection would previously have its later
  // tokens silently dropped since only the first page was ever fetched;
  // this now follows pageKey until the wallet's full holdings are in.
  const all: any[] = [];
  let pageKey: string | undefined;
  do {
    const url =
      `${ALCHEMY_NFT_API_BASE}/getNFTsForOwner` +
      `?owner=${ownerAddress}` +
      `&contractAddresses[]=${WEB3_CONFIG.NFT_CONTRACT_ADDRESS}` +
      `&withMetadata=true&pageSize=100` +
      (pageKey ? `&pageKey=${encodeURIComponent(pageKey)}` : "");

    const data = await fetchJson(url);
    const nfts = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
    all.push(...nfts);
    pageKey = typeof data.pageKey === "string" ? data.pageKey : undefined;
  } while (pageKey);

  const unique = new Map<string, any>();
  for (const nft of all) {
    const tokenId = String(nft.tokenId ?? nft.id?.tokenId ?? "?");
    unique.set(tokenId, nft);
  }

  return [...unique.values()].map((nft: any): OwnedNft => {
    const tokenId: string = nft.tokenId ?? nft.id?.tokenId ?? "?";
    const name: string = nft.name || nft.contract?.name || `404 Origin #${tokenId}`;
    const rawImage: string =
      nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || "";
    return {
      tokenId,
      name,
      image: toGatewayUrl(rawImage),
    };
  });
}

/**
 * Fetches metadata (name/image) for specific token IDs of our collection,
 * regardless of who currently holds them.
 *
 * Needed for staked NFTs: once staked, the staking contract holds custody,
 * so `getNFTsForOwner` on the connected wallet no longer returns them.
 * `getNFTMetadataBatch` looks up by contract + tokenId instead of by owner,
 * so staked tokens still resolve to the right name/image.
 */
export async function fetchNftMetadataByIds(tokenIds: string[]): Promise<OwnedNft[]> {
  if (!ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_NOT_CONFIGURED");
  }
  if (tokenIds.length === 0) return [];

  const url = `${ALCHEMY_NFT_API_BASE}/getNFTMetadataBatch`;

  const data = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokens: tokenIds.map((tokenId) => ({
        contractAddress: WEB3_CONFIG.NFT_CONTRACT_ADDRESS,
        tokenId,
      })),
    }),
  });
  const nfts = Array.isArray(data.nfts) ? data.nfts : [];

  return nfts.map((nft: any): OwnedNft => {
    const tokenId: string = nft.tokenId ?? nft.id?.tokenId ?? "?";
    const name: string = nft.name || nft.contract?.name || `404 Origin #${tokenId}`;
    const rawImage: string =
      nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || "";
    return {
      tokenId,
      name,
      image: toGatewayUrl(rawImage),
    };
  });
}
