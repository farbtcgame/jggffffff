"use client";

/**
 * Staking context — additive, separate contract/state from Web3Context.
 * Follows the same pattern as the Burn Lab integration inside
 * Web3Context.tsx (own contract instance, own tx state), but kept in its
 * own file/provider so the existing Web3Context is never touched.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./Web3Context";
import { WEB3_CONFIG, STAKING_CONTRACT_ADDRESS } from "../config/web3";
import STAKING_ABI from "../abi/NFTStaking.json";
import ERC721_MINIMAL_ABI from "../abi/ERC721Minimal.json";
import ERC20_ABI from "../abi/ERC20.json";

export type StakingTxState =
  | "IDLE"
  | "CHECKING_APPROVAL"
  | "APPROVAL_REQUIRED"
  | "CONFIRM_IN_WALLET"
  | "TRANSACTION_PENDING"
  | "STAKE_SUCCESSFUL"
  | "UNSTAKE_SUCCESSFUL"
  | "CLAIM_SUCCESSFUL"
  | "TRANSACTION_FAILED"
  | "TRANSACTION_REJECTED"
  | "WRONG_NETWORK";

export interface StakedNftInfo {
  tokenId: string;
  stakedAt: number;
  lastClaimAt: number;
  pendingReward: bigint;
}

interface StakingContextType {
  stakingConfigured: boolean;
  stakingOwnerAddress: string;
  isStakingOwner: boolean;
  rewardTokenAddress: string;
  rewardTokenSymbol: string;
  rewardTokenDecimals: number;
  rewardPerCycle: bigint;
  rewardPoolBalance: bigint;
  stakedTokens: StakedNftInfo[];
  stakedLoading: boolean;
  txState: StakingTxState;
  txHash: string | null;
  errorMessage: string | null;
  refreshStakingData: () => Promise<void>;
  checkStakingApproval: (ownerAddress: string) => Promise<boolean>;
  approveStaking: () => Promise<boolean>;
  stakeSelected: (tokenIds: string[]) => Promise<boolean>;
  unstakeSelected: (tokenIds: string[]) => Promise<boolean>;
  claimSelected: (tokenIds: string[]) => Promise<boolean>;
  // Admin
  setRewardTokenAdmin: (token: string) => Promise<boolean>;
  setRewardPerCycleAdmin: (amountRaw: bigint) => Promise<boolean>;
  fundRewardsAdmin: (token: string, amountRaw: bigint) => Promise<boolean>;
  withdrawRewardsAdmin: (token: string, amountRaw: bigint) => Promise<boolean>;
}

const StakingContext = createContext<StakingContextType | undefined>(undefined);

export const StakingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, signer, readErc20Meta } = useWeb3();

  const stakingConfigured = !!STAKING_CONTRACT_ADDRESS;

  const [stakingOwnerAddress, setStakingOwnerAddress] = useState(
    "0x0000000000000000000000000000000000000000"
  );
  const [rewardTokenAddress, setRewardTokenAddress] = useState("");
  const [rewardTokenSymbol, setRewardTokenSymbol] = useState("");
  const [rewardTokenDecimals, setRewardTokenDecimals] = useState(18);
  const [rewardPerCycle, setRewardPerCycleState] = useState<bigint>(BigInt(0));
  const [rewardPoolBalance, setRewardPoolBalance] = useState<bigint>(BigInt(0));
  const [stakedTokens, setStakedTokens] = useState<StakedNftInfo[]>([]);
  const [stakedLoading, setStakedLoading] = useState(false);

  const [txState, setTxState] = useState<StakingTxState>("IDLE");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isStakingOwner =
    !!account && account.toLowerCase() === stakingOwnerAddress.toLowerCase();

  const getReadProvider = () => new ethers.JsonRpcProvider(WEB3_CONFIG.RPC_URL);

  const getStakingReadContract = useCallback(() => {
    return new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, getReadProvider());
  }, []);

  const getStakingSignerContract = useCallback(async () => {
    if (!signer) throw new Error("Wallet not connected");
    return new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);
  }, [signer]);

  const refreshStakingData = useCallback(async () => {
    if (!stakingConfigured) return;
    setStakedLoading(true);
    try {
      const staking = getStakingReadContract();
      const [ownr, rToken, perCycle] = await Promise.all([
        staking.owner().catch(() => "0x0000000000000000000000000000000000000000"),
        staking.rewardToken().catch(() => ""),
        staking.rewardPerCycle().catch(() => BigInt(0)),
      ]);
      setStakingOwnerAddress(ownr);
      setRewardTokenAddress(rToken);
      setRewardPerCycleState(perCycle);

      if (rToken && rToken !== ethers.ZeroAddress) {
        const [meta, poolBal] = await Promise.all([
          readErc20Meta(rToken),
          staking.rewardTokenBalance(rToken).catch(() => BigInt(0)),
        ]);
        setRewardTokenSymbol(meta?.symbol || "");
        setRewardTokenDecimals(meta?.decimals ?? 18);
        setRewardPoolBalance(poolBal);
      } else {
        setRewardTokenSymbol("");
        setRewardPoolBalance(BigInt(0));
      }

      if (account) {
        const tokenIds: bigint[] = await staking.stakedTokensOf(account).catch(() => []);
        const infos: StakedNftInfo[] = await Promise.all(
          tokenIds.map(async (id) => {
            const [info, pending] = await Promise.all([
              staking.stakes(id),
              staking.pendingRewardForToken(id).catch(() => BigInt(0)),
            ]);
            return {
              tokenId: id.toString(),
              stakedAt: Number(info.stakedAt),
              lastClaimAt: Number(info.lastClaimAt),
              pendingReward: pending,
            };
          })
        );
        setStakedTokens(infos);
      } else {
        setStakedTokens([]);
      }
    } catch (err) {
      console.error("Error refreshing staking data:", err);
    } finally {
      setStakedLoading(false);
    }
  }, [stakingConfigured, account, getStakingReadContract, readErc20Meta]);

  useEffect(() => {
    if (!stakingConfigured) return;
    refreshStakingData();
    const interval = setInterval(refreshStakingData, 20000);
    return () => clearInterval(interval);
  }, [stakingConfigured, refreshStakingData]);

  const checkStakingApproval = async (ownerAddress: string): Promise<boolean> => {
    try {
      const nft = new ethers.Contract(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, ERC721_MINIMAL_ABI, getReadProvider());
      return await nft.isApprovedForAll(ownerAddress, STAKING_CONTRACT_ADDRESS);
    } catch (err) {
      console.error("Error checking staking NFT approval:", err);
      return false;
    }
  };

  const approveStaking = async (): Promise<boolean> => {
    if (!signer) return false;
    try {
      setTxState("CONFIRM_IN_WALLET");
      const nft = new ethers.Contract(WEB3_CONFIG.NFT_CONTRACT_ADDRESS, ERC721_MINIMAL_ABI, signer);
      const tx = await nft.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("IDLE");
      return true;
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(err.reason || err.message || "Approval failed");
      }
      return false;
    }
  };

  const stakeSelected = async (tokenIds: string[]): Promise<boolean> => {
    if (!account) return false;
    if (!stakingConfigured) {
      setTxState("TRANSACTION_FAILED");
      setErrorMessage("Staking contract address is not configured yet.");
      return false;
    }
    try {
      setTxState("CHECKING_APPROVAL");
      const approved = await checkStakingApproval(account);
      if (!approved) {
        setTxState("APPROVAL_REQUIRED");
        return false;
      }
      setTxState("CONFIRM_IN_WALLET");
      const staking = await getStakingSignerContract();
      const tx = await staking.stake(tokenIds.map((id) => BigInt(id)));
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("STAKE_SUCCESSFUL");
      await refreshStakingData();
      return true;
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(err.reason || err.message || "Stake transaction failed");
      }
      return false;
    }
  };

  const unstakeSelected = async (tokenIds: string[]): Promise<boolean> => {
    try {
      setTxState("CONFIRM_IN_WALLET");
      const staking = await getStakingSignerContract();
      const tx = await staking.unstake(tokenIds.map((id) => BigInt(id)));
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("UNSTAKE_SUCCESSFUL");
      await refreshStakingData();
      return true;
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(err.reason || err.message || "Unstake transaction failed");
      }
      return false;
    }
  };

  const claimSelected = async (tokenIds: string[]): Promise<boolean> => {
    try {
      setTxState("CONFIRM_IN_WALLET");
      const staking = await getStakingSignerContract();
      const tx = await staking.claimRewards(tokenIds.map((id) => BigInt(id)));
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("CLAIM_SUCCESSFUL");
      await refreshStakingData();
      return true;
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(err.reason || err.message || "Claim transaction failed");
      }
      return false;
    }
  };

  const callStakingAdminMethod = async (methodName: string, args: any[]): Promise<boolean> => {
    try {
      setTxState("CONFIRM_IN_WALLET");
      const staking = await getStakingSignerContract();
      const tx = await staking[methodName](...args);
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("IDLE");
      await refreshStakingData();
      return true;
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(err.reason || err.message || "Transaction failed");
      }
      return false;
    }
  };

  const setRewardTokenAdmin = (token: string) => callStakingAdminMethod("setRewardToken", [token]);
  const setRewardPerCycleAdmin = (amountRaw: bigint) => callStakingAdminMethod("setRewardPerCycle", [amountRaw]);
  const withdrawRewardsAdmin = (token: string, amountRaw: bigint) =>
    callStakingAdminMethod("withdrawRewardToken", [token, amountRaw]);

  const fundRewardsAdmin = async (token: string, amountRaw: bigint): Promise<boolean> => {
    if (!account || !signer) return false;
    try {
      const erc20 = new ethers.Contract(token, ERC20_ABI, signer);
      const allowance: bigint = await erc20.allowance(account, STAKING_CONTRACT_ADDRESS);
      if (allowance < amountRaw) {
        setTxState("CONFIRM_IN_WALLET");
        const approveTx = await erc20.approve(STAKING_CONTRACT_ADDRESS, amountRaw);
        setTxState("TRANSACTION_PENDING");
        await approveTx.wait();
      }
      return await callStakingAdminMethod("fundRewardToken", [token, amountRaw]);
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(err.reason || err.message || "Funding reward pool failed");
      }
      return false;
    }
  };

  return (
    <StakingContext.Provider
      value={{
        stakingConfigured,
        stakingOwnerAddress,
        isStakingOwner,
        rewardTokenAddress,
        rewardTokenSymbol,
        rewardTokenDecimals,
        rewardPerCycle,
        rewardPoolBalance,
        stakedTokens,
        stakedLoading,
        txState,
        txHash,
        errorMessage,
        refreshStakingData,
        checkStakingApproval,
        approveStaking,
        stakeSelected,
        unstakeSelected,
        claimSelected,
        setRewardTokenAdmin,
        setRewardPerCycleAdmin,
        fundRewardsAdmin,
        withdrawRewardsAdmin,
      }}
    >
      {children}
    </StakingContext.Provider>
  );
};

export function useStaking(): StakingContextType {
  const ctx = useContext(StakingContext);
  if (!ctx) throw new Error("useStaking must be used within a StakingProvider");
  return ctx;
}
