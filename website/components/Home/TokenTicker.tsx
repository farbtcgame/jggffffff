import React from "react";

/**
 * Ticker watchlist. Wire `changeLabel`/`priceLabel` up to a real price feed
 * (once SWAP_ROUTER_ADDRESS / an oracle is live) by replacing the static
 * strings below — the marquee itself needs no changes.
 */
interface TickerItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
  logo: string;
}

const LOGO_BASE = "https://raw.githubusercontent.com/telegramfomo/Aset/main/Logo";

const TICKER_ITEMS: TickerItem[] = [
  { symbol: "NVDA", name: "NVIDIA", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/NVDA.png` },
  { symbol: "AAPL", name: "Apple", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/AAPL.png` },
  { symbol: "AMZN", name: "Amazon", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/AMZN.png` },
  { symbol: "GME", name: "GameStop", price: "PENDING", change: "TBD", up: false, logo: `${LOGO_BASE}/GME.png` },
  { symbol: "USAR", name: "USA Rare Earth", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/USAR.png` },
  { symbol: "COST", name: "Costco", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/COST.png` },
  { symbol: "MSFT", name: "Microsoft", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/MSFT.png` },
  { symbol: "SLV", name: "Silver", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/SLV.png` },
  { symbol: "RDDT", name: "Reddit", price: "PENDING", change: "TBD", up: false, logo: `${LOGO_BASE}/RDDT.png` },
  { symbol: "USDG", name: "Global Dollar", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/usdg-logo.svg` },
  { symbol: "TSLA", name: "Tesla", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/TSLA.png` },
  { symbol: "ETH", name: "Ethereum", price: "PENDING", change: "TBD", up: true, logo: `${LOGO_BASE}/eth-logo.svg` },
];

const TickerCard: React.FC<{ item: TickerItem }> = ({ item }) => (
  <div className="glass pixel-corners flex items-center gap-3 px-4 py-3 shrink-0">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={item.logo} alt={item.symbol} className="h-6 w-6 shrink-0 rounded-full object-contain bg-white/90" />
    <span className="font-display text-sm font-bold text-white whitespace-nowrap">${item.symbol}</span>
    <span className="text-[10px] text-zinc-500 whitespace-nowrap hidden sm:inline">{item.name}</span>
    <span className="font-mono text-xs text-zinc-300 whitespace-nowrap">{item.price}</span>
    <span
      className={`font-mono text-[10px] whitespace-nowrap ${item.up ? "text-neon" : "text-zinc-500"}`}
    >
      {item.change}
    </span>
  </div>
);

/** Continuous right-to-left scrolling ticker strip. The item list is
 * duplicated once so the marquee loops seamlessly. */
export const TokenTicker: React.FC = () => {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="marquee-row overflow-hidden">
      <div className="marquee-track flex gap-3 w-max">
        {doubled.map((item, i) => (
          <TickerCard key={`${item.symbol}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
};
