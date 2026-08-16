import React from "react";
import { useWeb3 } from "../../context/Web3Context";

/**
 * Wraps every /admin page. Contract functions are already `onlyOwner`-protected
 * on-chain, but we also hide the controls in the UI unless the connected wallet
 * IS the contract owner, so a non-owner visitor just sees a connect/owner prompt
 * instead of buttons that would only revert anyway.
 */
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, isOwner, connectWallet, ownerAddress, walletConnectReady } = useWeb3();

  if (!walletConnectReady) {
    return (
      <div className="p-6 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
        WalletConnect Project ID not configured — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local.
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6 border border-white/10 glass text-center space-y-3">
        <p className="text-xs text-zinc-400">Connect the contract owner wallet to access the admin dashboard.</p>
        <button
          onClick={connectWallet}
          className="px-6 py-2.5 bg-neon text-black font-bold text-xs pixel-corners tracking-widest"
        >
          CONNECT WALLET
        </button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-6 border border-red-900/50 bg-red-950/20 text-red-400 text-xs space-y-1">
        <p>Connected wallet is not the contract owner.</p>
        <p className="text-zinc-500">Owner: {ownerAddress}</p>
      </div>
    );
  }

  return <>{children}</>;
};
