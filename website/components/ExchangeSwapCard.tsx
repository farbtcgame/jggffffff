import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import {
  WEB3_CONFIG,
  SWAP_ROUTER_ADDRESS,
  SWAP_TOKEN_ADDRESS,
  SWAP_TOKEN_SYMBOL,
  ALCHEMY_RPC_URL,
} from "../config/web3";

const ERC20_READ_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

/**
 * Exchange / SWAP interface. Reads live native + token balances for the
 * connected wallet on Robinhood Chain MAINNET. Swap execution is gated
 * behind NEXT_PUBLIC_SWAP_ROUTER_ADDRESS being configured — until a router
 * contract is deployed and set, the interface stays fully visible and
 * usable for quoting/entry but reports its configuration state honestly
 * instead of simulating a transaction.
 */
export const ExchangeSwapCard: React.FC = () => {
  const { account, chainId, isCorrectNetwork, connectWallet, switchNetwork } = useWeb3();

  const [nativeBalance, setNativeBalance] = useState<string>("0");
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [tokenSymbol, setTokenSymbol] = useState<string>(SWAP_TOKEN_SYMBOL);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"RH_TO_TOKEN" | "TOKEN_TO_RH">("RH_TO_TOKEN");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadBalances() {
      if (!account || !isCorrectNetwork) {
        setNativeBalance("0");
        setTokenBalance("0");
        return;
      }
      try {
        // Read-only balance calls go through Alchemy — see the
        // ALCHEMY_RPC_URL comment in config/web3.ts.
        const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
        const native = await provider.getBalance(account);
        if (cancelled) return;
        setNativeBalance(ethers.formatEther(native));

        if (SWAP_TOKEN_ADDRESS) {
          const token = new ethers.Contract(SWAP_TOKEN_ADDRESS, ERC20_READ_ABI, provider);
          const [sym, dec, bal] = await Promise.all([
            token.symbol().catch(() => SWAP_TOKEN_SYMBOL),
            token.decimals().catch(() => 18),
            token.balanceOf(account).catch(() => BigInt(0)),
          ]);
          if (cancelled) return;
          setTokenSymbol(sym);
          setTokenBalance(ethers.formatUnits(bal, dec));
        }
      } catch (err) {
        console.error("Error loading Exchange balances:", err);
      }
    }
    loadBalances();
    return () => {
      cancelled = true;
    };
  }, [account, isCorrectNetwork, chainId]);

  const fromSymbol = direction === "RH_TO_TOKEN" ? WEB3_CONFIG.CURRENCY_SYMBOL : tokenSymbol;
  const toSymbol = direction === "RH_TO_TOKEN" ? tokenSymbol : WEB3_CONFIG.CURRENCY_SYMBOL;
  const fromBalance = direction === "RH_TO_TOKEN" ? nativeBalance : tokenBalance;

  const handleFlip = () => {
    setDirection((d) => (d === "RH_TO_TOKEN" ? "TOKEN_TO_RH" : "RH_TO_TOKEN"));
    setStatus(null);
  };

  const handleSwap = async () => {
    setStatus(null);

    if (!account) {
      await connectWallet();
      return;
    }
    if (!isCorrectNetwork) {
      await switchNetwork();
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setStatus("Enter an amount to swap.");
      return;
    }
    if (!SWAP_ROUTER_ADDRESS) {
      setStatus(
        "Swap execution isn't wired up yet — the router contract address hasn't been configured for Robinhood Chain MAINNET."
      );
      return;
    }

    // Router is configured — actual execution wiring is intentionally left
    // for the router integration step (ABI + method signature depend on
    // the specific router deployed).
    setStatus("Router configured. Connect the router's swap method here to go live.");
  };

  return (
    <div className="border border-white/10 glass p-5 md:p-6 space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-display text-sm font-bold text-white tracking-widest uppercase">Swap</h3>
        <span className="text-[10px] text-zinc-500 tracking-wider">{WEB3_CONFIG.CHAIN_NAME}</span>
      </div>

      {/* FROM */}
      <div className="border border-white/10 bg-black/30 p-4 space-y-2">
        <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
          <span>From</span>
          <span>
            Balance: {Number(fromBalance).toFixed(4)} {fromSymbol}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-transparent text-lg font-bold text-white outline-none placeholder:text-zinc-700"
          />
          <span className="px-3 py-1.5 border border-white/10 text-xs font-bold text-neon tracking-wide pixel-corners">
            {fromSymbol}
          </span>
        </div>
      </div>

      {/* FLIP */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleFlip}
          className="h-8 w-8 flex items-center justify-center border border-white/10 bg-black/30 text-zinc-400 hover:text-neon hover:border-neon/50 transition-colors"
          aria-label="Flip swap direction"
        >
          ↓↑
        </button>
      </div>

      {/* TO */}
      <div className="border border-white/10 bg-black/30 p-4 space-y-2">
        <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
          <span>To (estimated)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-lg font-bold text-zinc-600">
            {SWAP_ROUTER_ADDRESS ? "—" : "Router not configured"}
          </span>
          <span className="px-3 py-1.5 border border-white/10 text-xs font-bold text-neon tracking-wide pixel-corners">
            {toSymbol}
          </span>
        </div>
      </div>

      {status && (
        <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-[11px] leading-relaxed">
          {status}
        </div>
      )}

      <button
        type="button"
        onClick={handleSwap}
        className="w-full py-3 bg-neon text-black font-bold uppercase tracking-wider hover:shadow-glow transition-shadow"
      >
        {!account ? "Connect Wallet" : !isCorrectNetwork ? "Switch to Robinhood Chain" : "Swap"}
      </button>

      <p className="text-[10px] text-zinc-600 leading-relaxed">
        Exchange is configured for Robinhood Chain MAINNET only. Trades execute directly against the
        connected wallet — always verify the amount and token before confirming in your wallet.
      </p>
    </div>
  );
};
