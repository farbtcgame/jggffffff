"use client";

/**
 * Clock In (VIP) context — additive, separate contract/state from
 * Web3Context, following the same pattern as StakingContext.tsx.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./Web3Context";
import { WEB3_CONFIG, CLOCK_IN_CONTRACT_ADDRESS, ALCHEMY_RPC_URL } from "../config/web3";
import CLOCK_IN_ABI from "../abi/ClockIn.json";
import ERC20_ABI from "../abi/ERC20.json";

export type ClockInTxState =
  | "IDLE"
  | "CONFIRM_IN_WALLET"
  | "TRANSACTION_PENDING"
  | "JOIN_SUCCESSFUL"
  | "CLAIM_SUCCESSFUL"
  | "TRANSACTION_FAILED"
  | "TRANSACTION_REJECTED"
  | "WRONG_NETWORK"
  | "INSUFFICIENT_BALANCE";

export interface VipLevelConfig {
  vipLevel: 1 | 2 | 3;
  feeToken: string;
  feeAmount: bigint;
  feeTokenSymbol: string;
  feeTokenDecimals: number;
  rewardToken: string;
  rewardTokenSymbol: string;
  rewardTokenDecimals: number;
  rewardAmountPerCycle: bigint;
  active: boolean;
}

export interface TokenRegistration {
  tokenId: string;
  vipLevel: number;
  active: boolean;
  pendingCycles: bigint;
  pendingAmount: bigint;
}

interface ClockInContextType {
  clockInConfigured: boolean;
  clockInOwnerAddress: string;
  isClockInOwner: boolean;
  vipConfigs: VipLevelConfig[];
  vipConfigsLoading: boolean;
  registrationsByToken: Record<string, TokenRegistration>;
  txState: ClockInTxState;
  txHash: string | null;
  errorMessage: string | null;
  refreshClockInData: (ownedTokenIds?: string[]) => Promise<void>;
  joinVip: (vipLevel: 1 | 2 | 3, tokenIds: string[]) => Promise<boolean>;
  claimVip: (tokenIds: string[]) => Promise<boolean>;
  // Admin
  configureVipAdmin: (
    vipLevel: 1 | 2 | 3,
    feeToken: string,
    feeAmountRaw: bigint,
    rewardToken: string,
    rewardAmountRaw: bigint,
    active: boolean
  ) => Promise<boolean>;
  setVipActiveAdmin: (vipLevel: 1 | 2 | 3, active: boolean) => Promise<boolean>;
  fundRewardsAdmin: (token: string, amountRaw: bigint) => Promise<boolean>;
  withdrawRewardsAdmin: (token: string, amountRaw: bigint) => Promise<boolean>;
  withdrawFeesAdmin: (token: string, amountRaw: bigint) => Promise<boolean>;
}

const ClockInContext = createContext<ClockInContextType | undefined>(undefined);

const EMPTY_VIP = (level: 1 | 2 | 3): VipLevelConfig => ({
  vipLevel: level,
  feeToken: "",
  feeAmount: BigInt(0),
  feeTokenSymbol: "",
  feeTokenDecimals: 18,
  rewardToken: "",
  rewardTokenSymbol: "",
  rewardTokenDecimals: 18,
  rewardAmountPerCycle: BigInt(0),
  active: false,
});

export const ClockInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, signer, readErc20Meta } = useWeb3();

  const clockInConfigured = !!CLOCK_IN_CONTRACT_ADDRESS;

  const [clockInOwnerAddress, setClockInOwnerAddress] = useState(
    "0x0000000000000000000000000000000000000000"
  );
  const [vipConfigs, setVipConfigs] = useState<VipLevelConfig[]>([
    EMPTY_VIP(1),
    EMPTY_VIP(2),
    EMPTY_VIP(3),
  ]);
  const [vipConfigsLoading, setVipConfigsLoading] = useState(false);
  const [registrationsByToken, setRegistrationsByToken] = useState<Record<string, TokenRegistration>>({});

  const [txState, setTxState] = useState<ClockInTxState>("IDLE");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isClockInOwner =
    !!account && account.toLowerCase() === clockInOwnerAddress.toLowerCase();

  // Read-only Clock In data (VIP configs, per-token registration/pending
  // reward) goes through Alchemy instead of the raw chain RPC — see the
  // ALCHEMY_RPC_URL comment in config/web3.ts. Clock In transactions still
  // go through the connected wallet's own `signer`, unaffected.
  const getReadProvider = () => new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);

  const getClockInReadContract = useCallback(() => {
    return new ethers.Contract(CLOCK_IN_CONTRACT_ADDRESS, CLOCK_IN_ABI, getReadProvider());
  }, []);

  const getClockInSignerContract = useCallback(async () => {
    if (!signer) throw new Error("Wallet not connected");
    return new ethers.Contract(CLOCK_IN_CONTRACT_ADDRESS, CLOCK_IN_ABI, signer);
  }, [signer]);

  const refreshClockInData = useCallback(
    async (ownedTokenIds: string[] = []) => {
      if (!clockInConfigured) return;
      setVipConfigsLoading(true);
      try {
        const clockIn = getClockInReadContract();
        const ownr = await clockIn.owner().catch(() => "0x0000000000000000000000000000000000000000");
        setClockInOwnerAddress(ownr);

        const levels: (1 | 2 | 3)[] = [1, 2, 3];
        const configs = await Promise.all(
          levels.map(async (level) => {
            const cfg = await clockIn.vipConfig(level).catch(() => null);
            if (!cfg || cfg.feeToken === ethers.ZeroAddress) return EMPTY_VIP(level);
            const [feeMeta, rewardMeta] = await Promise.all([
              readErc20Meta(cfg.feeToken),
              readErc20Meta(cfg.rewardToken),
            ]);
            return {
              vipLevel: level,
              feeToken: cfg.feeToken,
              feeAmount: cfg.feeAmount,
              feeTokenSymbol: feeMeta?.symbol || "",
              feeTokenDecimals: feeMeta?.decimals ?? 18,
              rewardToken: cfg.rewardToken,
              rewardTokenSymbol: rewardMeta?.symbol || "",
              rewardTokenDecimals: rewardMeta?.decimals ?? 18,
              rewardAmountPerCycle: cfg.rewardAmountPerCycle,
              active: cfg.active,
            } as VipLevelConfig;
          })
        );
        setVipConfigs(configs);

        if (ownedTokenIds.length > 0) {
          const entries = await Promise.all(
            ownedTokenIds.map(async (tokenId) => {
              const [reg, pending] = await Promise.all([
                clockIn.registrations(BigInt(tokenId)).catch(() => null),
                clockIn.pendingReward(BigInt(tokenId)).catch(() => [BigInt(0), BigInt(0)]),
              ]);
              const registration: TokenRegistration = {
                tokenId,
                vipLevel: reg ? Number(reg.vipLevel) : 0,
                active: reg ? reg.active && reg.registrant.toLowerCase() === (account || "").toLowerCase() : false,
                pendingCycles: pending[0],
                pendingAmount: pending[1],
              };
              return [tokenId, registration] as const;
            })
          );
          setRegistrationsByToken(Object.fromEntries(entries));
        } else {
          setRegistrationsByToken({});
        }
      } catch (err) {
        console.error("Error refreshing Clock In data:", err);
      } finally {
        setVipConfigsLoading(false);
      }
    },
    [clockInConfigured, account, getClockInReadContract, readErc20Meta]
  );

  useEffect(() => {
    if (!clockInConfigured) return;
    refreshClockInData();
    // Re-run on an interval only for VIP config (owned-token registration
    // status is refreshed explicitly by the Clock In page once it knows
    // which tokenIds the wallet owns).
    const interval = setInterval(() => refreshClockInData(), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockInConfigured]);

  const joinVip = async (vipLevel: 1 | 2 | 3, tokenIds: string[]): Promise<boolean> => {
    if (!account || !signer) return false;
    if (!clockInConfigured) {
      setTxState("TRANSACTION_FAILED");
      setErrorMessage("Clock In contract address is not configured yet.");
      return false;
    }
    try {
      const cfg = vipConfigs.find((c) => c.vipLevel === vipLevel);
      if (cfg && cfg.feeAmount > BigInt(0)) {
        const totalFee = cfg.feeAmount * BigInt(tokenIds.length);
        const erc20 = new ethers.Contract(cfg.feeToken, ERC20_ABI, signer);
        const [allowance, balance] = await Promise.all([
          erc20.allowance(account, CLOCK_IN_CONTRACT_ADDRESS),
          erc20.balanceOf(account),
        ]);
        if (balance < totalFee) {
          setTxState("INSUFFICIENT_BALANCE");
          return false;
        }
        if (allowance < totalFee) {
          setTxState("CONFIRM_IN_WALLET");
          const approveTx = await erc20.approve(CLOCK_IN_CONTRACT_ADDRESS, totalFee);
          setTxState("TRANSACTION_PENDING");
          await approveTx.wait();
        }
      }

      setTxState("CONFIRM_IN_WALLET");
      const clockIn = await getClockInSignerContract();
      const tx = await clockIn.join(vipLevel, tokenIds.map((id) => BigInt(id)));
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("JOIN_SUCCESSFUL");
      await refreshClockInData(tokenIds);
      return true;
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState("TRANSACTION_REJECTED");
      } else {
        setTxState("TRANSACTION_FAILED");
        setErrorMessage(err.reason || err.message || "Join transaction failed");
      }
      return false;
    }
  };

  const claimVip = async (tokenIds: string[]): Promise<boolean> => {
    try {
      setTxState("CONFIRM_IN_WALLET");
      const clockIn = await getClockInSignerContract();
      const tx = await clockIn.claim(tokenIds.map((id) => BigInt(id)));
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("CLAIM_SUCCESSFUL");
      await refreshClockInData(tokenIds);
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

  const callClockInAdminMethod = async (methodName: string, args: any[]): Promise<boolean> => {
    try {
      setTxState("CONFIRM_IN_WALLET");
      const clockIn = await getClockInSignerContract();
      const tx = await clockIn[methodName](...args);
      setTxState("TRANSACTION_PENDING");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("IDLE");
      await refreshClockInData();
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

  const configureVipAdmin = (
    vipLevel: 1 | 2 | 3,
    feeToken: string,
    feeAmountRaw: bigint,
    rewardToken: string,
    rewardAmountRaw: bigint,
    active: boolean
  ) => callClockInAdminMethod("configureVip", [vipLevel, feeToken, feeAmountRaw, rewardToken, rewardAmountRaw, active]);

  const setVipActiveAdmin = (vipLevel: 1 | 2 | 3, active: boolean) =>
    callClockInAdminMethod("setVipActive", [vipLevel, active]);

  const withdrawRewardsAdmin = (token: string, amountRaw: bigint) =>
    callClockInAdminMethod("withdrawRewardToken", [token, amountRaw]);

  const withdrawFeesAdmin = (token: string, amountRaw: bigint) =>
    callClockInAdminMethod("withdrawFees", [token, amountRaw]);

  const fundRewardsAdmin = async (token: string, amountRaw: bigint): Promise<boolean> => {
    if (!account || !signer) return false;
    try {
      const erc20 = new ethers.Contract(token, ERC20_ABI, signer);
      const allowance: bigint = await erc20.allowance(account, CLOCK_IN_CONTRACT_ADDRESS);
      if (allowance < amountRaw) {
        setTxState("CONFIRM_IN_WALLET");
        const approveTx = await erc20.approve(CLOCK_IN_CONTRACT_ADDRESS, amountRaw);
        setTxState("TRANSACTION_PENDING");
        await approveTx.wait();
      }
      return await callClockInAdminMethod("fundRewardToken", [token, amountRaw]);
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
    <ClockInContext.Provider
      value={{
        clockInConfigured,
        clockInOwnerAddress,
        isClockInOwner,
        vipConfigs,
        vipConfigsLoading,
        registrationsByToken,
        txState,
        txHash,
        errorMessage,
        refreshClockInData,
        joinVip,
        claimVip,
        configureVipAdmin,
        setVipActiveAdmin,
        fundRewardsAdmin,
        withdrawRewardsAdmin,
        withdrawFeesAdmin,
      }}
    >
      {children}
    </ClockInContext.Provider>
  );
};

export function useClockIn(): ClockInContextType {
  const ctx = useContext(ClockInContext);
  if (!ctx) throw new Error("useClockIn must be used within a ClockInProvider");
  return ctx;
}
