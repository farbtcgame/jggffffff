import React, { useEffect, useState } from "react";
import { fetchCollectionGallery, GalleryItem } from "../../lib/collectionActivity";

type LoadState = "LOADING" | "LOADED" | "ERROR";

const REFRESH_MS = 15 * 60 * 1000; // 15 minutes

function eventLabel(item: GalleryItem): string {
  if (item.isMint) return "MINTED";
  if (item.isBurn) return "BURNED";
  return "TRANSFERRED";
}

function timeAgo(timestampSec: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestampSec);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const GalleryTile: React.FC<{ item: GalleryItem }> = ({ item }) => (
  <div className="group glass pixel-corners hover-lift hover:border-neon/50 relative overflow-hidden">
    <div className="bg-white/[0.03] relative aspect-square overflow-hidden">
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      ) : (
        <div className="skeleton-shimmer h-full w-full" />
      )}
      <span className="absolute top-2 left-2 px-2 py-1 text-[9px] font-bold tracking-[0.12em] uppercase bg-neon text-black">
        {eventLabel(item)}
      </span>
    </div>
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="font-display truncate text-xs font-bold">#{item.tokenId}</span>
      <span className="font-mono text-zinc-500 text-[10px]">{timeAgo(item.timestamp)}</span>
    </div>
  </div>
);

/**
 * Shows the last 100 sell/transfer events from the main collection over the
 * past hour. Refreshes automatically every 15 minutes with a fresh batch.
 */
export const CollectionGallery: React.FC = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [state, setState] = useState<LoadState>("LOADING");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const gallery = await fetchCollectionGallery(100);
        if (!live) return;
        setItems(gallery);
        setLastUpdated(new Date());
        setState("LOADED");
      } catch {
        if (live) setState("ERROR");
      }
    }
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-white tracking-widest uppercase">
            Collection Activity
          </h2>
          <p className="text-[10px] text-zinc-500 mt-1 label-mono">
            Last hour · sold / transferred · refreshes every 15 min
          </p>
        </div>
        {lastUpdated && (
          <span className="label-mono">Updated {timeAgo(Math.floor(lastUpdated.getTime() / 1000))}</span>
        )}
      </div>

      {state === "ERROR" ? (
        <div className="p-4 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs pixel-corners">
          Couldn&apos;t load collection activity right now.
        </div>
      ) : state === "LOADING" && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer pixel-corners aspect-square" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500 glass pixel-corners">
          No sales or transfers in the last hour.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((item) => (
            <GalleryTile key={`${item.tokenId}-${item.txHash}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
