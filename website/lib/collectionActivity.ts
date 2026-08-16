import { ethers } from "ethers";
import { WEB3_CONFIG, IPFS_GATEWAY } from "../config/web3";
import { getPublicProvider } from "./onchainStats";

// Standard ERC-721 Transfer event — present on every NFT contract regardless
// of the trimmed project ABI, so we declare it directly here.
const TRANSFER_EVENT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];
const TOKEN_URI_ABI = ["function tokenURI(uint256 tokenId) view returns (string)"];

export interface CollectionTransfer {
  tokenId: string;
  from: string;
  to: string;
  isMint: boolean;
  isBurn: boolean;
  blockNumber: number;
  txHash: string;
  timestamp: number; // seconds
}

export interface GalleryItem extends CollectionTransfer {
  name: string;
  image: string;
}

const ONE_HOUR_SECONDS = 60 * 60;
const DEAD = "0x000000000000000000000000000000000000dead";
const ZERO = "0x0000000000000000000000000000000000000000";

function toGatewayUrl(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return IPFS_GATEWAY + uri.replace("ipfs://", "");
  return uri;
}

/** Binary-searches for the highest block whose timestamp is <= targetTimestamp. */
async function findBlockAtOrBefore(
  provider: ethers.JsonRpcProvider,
  targetTimestamp: number,
  latestBlockNumber: number
): Promise<number> {
  let lo = 0;
  let hi = latestBlockNumber;
  // Cap the search window so we don't binary-search the entire chain history
  // on very old/slow chains; a 200k block lower bound is generous for ~1hr
  // of activity on any realistic block time (down to ~1.8s blocks).
  lo = Math.max(0, latestBlockNumber - 200_000);

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const block = await provider.getBlock(mid);
    if (!block) {
      hi = mid - 1;
      continue;
    }
    if (block.timestamp <= targetTimestamp) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/**
 * Fetches Transfer events for the main NFT collection over the last hour,
 * newest first, deduplicated by tokenId (keeping only the most recent
 * event per token), capped at `limit` entries.
 *
 * Queried in chunks because most RPC providers cap the block range per
 * eth_getLogs call; on a rejection the chunk size is halved and retried.
 */
export async function fetchRecentCollectionTransfers(
  limit = 100
): Promise<CollectionTransfer[]> {
  const provider = getPublicProvider();
  const iface = new ethers.Interface(TRANSFER_EVENT_ABI);
  const topic = iface.getEvent("Transfer")!.topicHash;

  const latestBlockNumber = await provider.getBlockNumber();
  const latestBlock = await provider.getBlock(latestBlockNumber);
  const nowTs = latestBlock?.timestamp ?? Math.floor(Date.now() / 1000);
  const sinceTs = nowTs - ONE_HOUR_SECONDS;
  const fromBoundary = await findBlockAtOrBefore(provider, sinceTs, latestBlockNumber);

  const events: CollectionTransfer[] = [];
  const seenTokens = new Set<string>();

  let chunkSize = 2000;
  let toBlock = latestBlockNumber;

  while (toBlock > fromBoundary && events.length < limit * 3) {
    const fromBlock = Math.max(fromBoundary, toBlock - chunkSize + 1);
    try {
      const logs = await provider.getLogs({
        address: WEB3_CONFIG.NFT_CONTRACT_ADDRESS,
        topics: [topic],
        fromBlock,
        toBlock,
      });

      // Newest first within this chunk.
      for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        const parsed = iface.parseLog(log);
        if (!parsed) continue;
        const tokenId = (parsed.args.tokenId as bigint).toString();
        if (seenTokens.has(tokenId)) continue;
        seenTokens.add(tokenId);

        const from = (parsed.args.from as string).toLowerCase();
        const to = (parsed.args.to as string).toLowerCase();
        const block = await provider.getBlock(log.blockNumber);

        events.push({
          tokenId,
          from,
          to,
          isMint: from === ZERO,
          isBurn: to === ZERO || to === DEAD,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          timestamp: block?.timestamp ?? nowTs,
        });

        if (events.length >= limit) break;
      }

      toBlock = fromBlock - 1;
    } catch (err) {
      // Provider likely rejected the range — retry this window with a
      // smaller chunk rather than giving up on the whole query.
      if (chunkSize <= 100) {
        // Give up on this window entirely to avoid an infinite loop.
        toBlock = fromBlock - 1;
      } else {
        chunkSize = Math.floor(chunkSize / 2);
      }
    }
  }

  events.sort((a, b) => b.blockNumber - a.blockNumber);
  return events.slice(0, limit);
}

const metadataCache = new Map<string, { name: string; image: string }>();

async function resolveMetadata(tokenId: string): Promise<{ name: string; image: string }> {
  const cached = metadataCache.get(tokenId);
  if (cached) return cached;

  const provider = getPublicProvider();
  const contract = new ethers.Contract(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, TOKEN_URI_ABI, provider);

  try {
    const uri: string = await contract.tokenURI(tokenId);
    const res = await fetch(toGatewayUrl(uri));
    const meta = await res.json();
    const result = {
      name: meta.name || `#${tokenId}`,
      image: toGatewayUrl(meta.image || ""),
    };
    metadataCache.set(tokenId, result);
    return result;
  } catch {
    const fallback = { name: `#${tokenId}`, image: "" };
    metadataCache.set(tokenId, fallback);
    return fallback;
  }
}

/** Runs metadata resolution with a small concurrency cap so we don't fire
 * 100 simultaneous requests at the IPFS gateway. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/** Fetches the last hour's collection activity (up to `limit` items) with
 * resolved image/name metadata for gallery display. */
export async function fetchCollectionGallery(limit = 100): Promise<GalleryItem[]> {
  const transfers = await fetchRecentCollectionTransfers(limit);
  const metas = await mapWithConcurrency(transfers, 8, (t) => resolveMetadata(t.tokenId));
  return transfers.map((t, i) => ({ ...t, ...metas[i] }));
}
