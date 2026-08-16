import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWeb3 } from '../context/Web3Context';
import { WEB3_CONFIG } from '../config/web3';

interface NavLink {
  label: string;
  path: string;
  /** Nav-item badge: a live countdown, or a static "pending / coming soon" tag. */
  badge?: 'pending';
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'Staking', path: '/staking' },
  { label: 'Burn Lab', path: '/burn' },
  { label: 'Exchange', path: '/exchange', badge: 'pending' },
  { label: 'Clock In', path: '/clock-in', badge: 'pending' },
  { label: 'Drop', path: '/drop', badge: 'pending' },
  // Admin is intentionally not listed here — it stays reachable only by
  // navigating directly to /admin (see pages/admin/*). Do not add it back
  // to this array; that would put a link to it in the public dropdown.
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, isCorrectNetwork, connectWallet, switchNetwork } = useWeb3();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const isActivePath = (path: string) => (path === '/' ? router.pathname === '/' : router.pathname.startsWith(path));
  const activeLink = NAV_LINKS.find((l) => isActivePath(l.path));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the dropdown on outside click and on route change.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [router.pathname]);

  const renderBadge = (badge?: NavLink['badge']) => {
    if (badge === 'pending') {
      return (
        <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold tracking-wider border border-white/10 text-zinc-500">
          PENDING
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-void text-zinc-200 font-mono antialiased">
      {/* Top navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled ? 'glass border-b border-white/10' : 'border-b border-transparent'
        }`}
      >
        <nav className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center border border-neon/40 bg-neon/10 text-neon text-[11px] font-bold font-mono transition-transform duration-500 group-hover:rotate-6">
              OP
              <span className="absolute -top-px -right-px h-1.5 w-1.5 bg-neon" />
            </span>
            <span className="font-display text-sm font-bold tracking-[0.18em] uppercase">
              Origin<span className="text-neon">Punk</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3" ref={menuRef}>
            {/* Wallet status / connect */}
            {!account ? (
              <button
                onClick={connectWallet}
                className="hidden sm:inline-flex bg-neon text-black pixel-corners font-mono px-5 py-2.5 text-[11px] font-bold tracking-[0.16em] uppercase transition-transform duration-300 hover:scale-[1.03]"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="hidden sm:flex flex-col items-end glass pixel-corners px-3 py-1.5">
                <span className="label-mono leading-none">{isCorrectNetwork ? WEB3_CONFIG.CHAIN_NAME : 'WRONG NETWORK'}</span>
                <span className="text-neon text-xs font-bold mt-0.5">{formatAddr(account)}</span>
              </div>
            )}

            {account && !isCorrectNetwork && (
              <button
                onClick={switchNetwork}
                className="hidden sm:inline-flex px-3 py-2.5 text-[10px] bg-red-950 text-red-400 border border-red-800 pixel-corners hover:bg-red-900"
              >
                Switch
              </button>
            )}

            {/* Dropdown menu trigger — replaces the old always-open sidebar list */}
            <div className="relative">
              <button
                aria-label="Menu"
                onClick={() => setMenuOpen((v) => !v)}
                className={`glass pixel-corners flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold tracking-[0.16em] uppercase transition-colors ${
                  menuOpen ? 'border-neon/50 text-neon' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse-glow" />
                {activeLink ? activeLink.label : 'Menu'}
                <span className={`transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {/* Dropdown panel */}
              <div
                className={`absolute right-0 mt-2 w-64 glass-strong pixel-corners overflow-hidden origin-top-right transition-all duration-300 ${
                  menuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="p-2">
                  {NAV_LINKS.map((link) => {
                    const isActive = isActivePath(link.path);
                    const isPending = link.badge === 'pending';
                    const content = (
                      <>
                        <span>{link.label}</span>
                        {renderBadge(link.badge)}
                      </>
                    );

                    if (isPending) {
                      return (
                        <span
                          key={link.path}
                          className="px-3 py-2.5 text-xs tracking-widest text-zinc-600 cursor-not-allowed flex items-center gap-2"
                          aria-disabled="true"
                        >
                          {content}
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={link.path}
                        href={link.path}
                        className={`px-3 py-2.5 text-xs tracking-widest transition-all flex items-center gap-2 pixel-corners ${
                          isActive
                            ? 'bg-white/[0.05] text-neon font-bold'
                            : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                        }`}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>

                <div className="border-t border-white/10 p-3 sm:hidden">
                  {!account ? (
                    <button
                      onClick={connectWallet}
                      className="w-full py-2.5 bg-neon text-black font-bold text-xs tracking-widest pixel-corners"
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <div className="glass pixel-corners px-3 py-2 text-center">
                      <span className="label-mono block">Connected</span>
                      <span className="text-neon text-xs font-bold">{formatAddr(account)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Main viewport */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-10">{children}</main>
    </div>
  );
};
