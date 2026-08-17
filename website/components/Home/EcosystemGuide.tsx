import React from "react";

const LOGO_BASE = "https://raw.githubusercontent.com/telegramfomo/Aset/main/Logo";

interface RotationToken {
  symbol: string;
  name: string;
  logo: string;
}

// Example of the kind of stock-linked reward token that rotates through
// the Staking Vault's admin-configured reward slot each week — the same
// logos already used in the homepage ticker above.
const ROTATION_EXAMPLES: RotationToken[] = [
  { symbol: "NVDA", name: "NVIDIA", logo: `${LOGO_BASE}/NVDA.png` },
  { symbol: "TSLA", name: "Tesla", logo: `${LOGO_BASE}/TSLA.png` },
  { symbol: "AAPL", name: "Apple", logo: `${LOGO_BASE}/AAPL.png` },
  { symbol: "GME", name: "GameStop", logo: `${LOGO_BASE}/GME.png` },
  { symbol: "AMZN", name: "Amazon", logo: `${LOGO_BASE}/AMZN.png` },
  { symbol: "MSFT", name: "Microsoft", logo: `${LOGO_BASE}/MSFT.png` },
];

const StepRow: React.FC<{ index: string; title: string; children: React.ReactNode }> = ({
  index,
  title,
  children,
}) => (
  <div className="flex gap-4">
    <span className="font-display text-lg font-bold text-neon/70 tabular-nums shrink-0 w-8">{index}</span>
    <div>
      <p className="text-xs font-bold text-white tracking-wide">{title}</p>
      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{children}</p>
    </div>
  </div>
);

export const EcosystemGuide: React.FC = () => {
  return (
    <div className="space-y-10">
      {/* How Staking / Burn work */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Staking */}
        <div className="glass pixel-corners p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            <h3 className="font-display text-sm font-bold text-white tracking-widest uppercase">
              How Staking Works
            </h3>
          </div>
          <div className="space-y-4">
            <StepRow index="01" title="Stake your NFTs">
              Connect your wallet, select any 404 Origin NFTs you own, approve the Vault once, and stake
              them. Your NFTs move into the Vault&apos;s custody — they are never burned or swapped for a
              different token, and only you can unstake them.
            </StepRow>
            <StepRow index="02" title="Earn every 24-hour cycle">
              Each staked NFT earns every reward token the admin has configured, at that token&apos;s own
              rate per NFT per completed 24-hour cycle. All eligibility is tracked on-chain by the block
              timestamp — the countdown shown on the Staking page is just a display.
            </StepRow>
            <StepRow index="03" title="Claim anytime">
              Claim all fully completed cycles whenever you like, for any of your staked NFTs, without
              unstaking. A cycle only counts once it&apos;s fully complete — no partial-cycle rewards, and
              no cycle can ever be claimed twice.
            </StepRow>
            <StepRow index="04" title="Unstake with no lock period">
              Unstake any time. If a cycle is still in progress you simply won&apos;t be paid for it — the
              exact NFT you staked is always returned to your wallet, never a different token.
            </StepRow>
          </div>
        </div>

        {/* Burn */}
        <div className="glass pixel-corners p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <h3 className="font-display text-sm font-bold text-white tracking-widest uppercase">
              How Burn Works
            </h3>
          </div>
          <div className="space-y-4">
            <StepRow index="01" title="Select NFTs to retire">
              Connect your wallet, load your real 404 Origin NFTs, and select one or more you want to
              permanently retire from the collection.
            </StepRow>
            <StepRow index="02" title="Approve & confirm">
              Approve the Burn Lab contract once, then confirm the burn. You can burn multiple NFTs in a
              single transaction.
            </StepRow>
            <StepRow index="03" title="Sent straight to the dead address">
              Each selected NFT is transferred directly to{" "}
              <code className="text-[10px] text-zinc-400 break-all">
                0x000000000000000000000000000000000000dEaD
              </code>
              . Burn Lab never holds your NFT in between — nothing is recoverable by anyone, including the
              contract admin.
            </StepRow>
            <StepRow index="04" title="Rewards pay out instantly">
              Every active configured reward token is paid to you in the same transaction, scaled by how
              many NFTs you burned. If a reward can&apos;t be fully covered, the whole burn safely reverts
              — nothing is lost.
            </StepRow>
          </div>
        </div>
      </div>

      {/* Weekly reward token rotation */}
      <div className="glass pixel-corners p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
          <h3 className="font-display text-sm font-bold text-white tracking-widest uppercase">
            Weekly Stock-Token Rewards
          </h3>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl">
          Once a week, the Staking Vault&apos;s reward configuration is refreshed with a different
          stock-linked token. Every stake earns whatever reward tokens are active in the Vault at the
          time each 24-hour cycle completes — the specific stock token rotates from week to week, so the
          reward you&apos;re earning today may not be the same one you earn next week. Current and past
          reward tokens are always visible on the{" "}
          <a href="/staking" className="text-neon underline">
            Staking
          </a>{" "}
          page, read live from the contract.
        </p>

        <div className="flex flex-wrap gap-3">
          {ROTATION_EXAMPLES.map((t) => (
            <div
              key={t.symbol}
              className="flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 pixel-corners"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.logo} alt={t.symbol} className="h-5 w-5 rounded-full object-contain bg-white/90" />
              <span className="text-xs font-bold text-white">${t.symbol}</span>
              <span className="text-[10px] text-zinc-500 hidden sm:inline">{t.name}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600">
          Illustrative examples of the kind of stock-linked reward tokens used in the rotation — the
          Staking page always shows exactly which ones are active right now.
        </p>
      </div>

      {/* Liquidity note */}
      <div className="glass pixel-corners p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neon" />
          <h3 className="font-display text-sm font-bold text-white tracking-widest uppercase">
            $ORIGIN Token Liquidity
          </h3>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl">
          95% of collection revenue is directed straight into $ORIGIN token liquidity — funding deeper,
          more stable markets for the token instead of sitting idle. The remaining share covers ongoing
          ecosystem costs, including funding the Staking Vault and Burn Lab reward pools shown live on
          this page.
        </p>
      </div>
    </div>
  );
};
