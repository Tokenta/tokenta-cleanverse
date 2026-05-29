/**
 * useEscrowFunding — performs a REAL on-chain USDC transfer to the configured
 * escrow wallet and exposes the transaction lifecycle as a state machine the UI
 * can render.
 *
 * This is the Phase 1 (semi-onchain hybrid) implementation: there is no custom
 * escrow contract yet. The buyer simply signs an ERC-20 transfer to a Tokenta-
 * controlled Safe Multisig (`VITE_ESCROW_WALLET`). The backend reconciles the
 * transfer with the order ledger using the returned tx hash and triggers seller
 * payouts on release.
 *
 * State machine:
 *   idle         — no transaction in flight
 *   preparing    — running pre-flight checks (chain / balance / config)
 *   signing      — wallet popup open, awaiting user signature
 *   broadcasting — signed; wagmi is broadcasting the raw tx
 *   confirming   — tx in mempool, waiting for inclusion / confirmations
 *   confirmed    — tx mined successfully on Base Sepolia
 *   error        — wallet rejected, reverted, or insufficient balance
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseUnits, type Address, type Hash } from "viem";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { useWaitForTransactionReceipt } from "wagmi";

import {
  ACTIVE_CHAIN_ID,
  ERC20_ABI,
  ESCROW_WALLET,
  USDC_ADDRESS,
  USDC_DECIMALS,
  isEscrowConfigured,
} from "../web3/contracts";

export type EscrowFundingState =
  | "idle"
  | "preparing"
  | "signing"
  | "broadcasting"
  | "confirming"
  | "confirmed"
  | "error";

export interface EscrowFundingResult {
  state: EscrowFundingState;
  txHash: Hash | null;
  error: string | null;
  reset: () => void;
  /**
   * Submit a USDC transfer to the configured escrow wallet.
   * Returns the tx hash once the user has signed and wagmi has broadcast it.
   * Resolves to `null` if the user rejects or a precondition fails.
   */
  send: (amountUsdc: string) => Promise<Hash | null>;
}

export function useEscrowFunding(): EscrowFundingResult {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [state, setState] = useState<EscrowFundingState>("idle");
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [error, setError] = useState<string | null>(null);

  const receipt = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: Boolean(txHash) && state === "confirming" },
  });

  // Drive the state machine from receipt updates.
  useEffect(() => {
    if (!txHash || state !== "confirming") return;
    if (receipt.isSuccess) {
      if (receipt.data?.status === "success") {
        setState("confirmed");
      } else {
        setError("Transaction reverted on-chain.");
        setState("error");
      }
    } else if (receipt.isError) {
      setError(receipt.error?.message ?? "Failed to confirm transaction.");
      setState("error");
    }
  }, [receipt.isSuccess, receipt.isError, receipt.data, receipt.error, txHash, state]);

  const reset = useCallback(() => {
    setState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  const send = useCallback(
    async (amountUsdc: string): Promise<Hash | null> => {
      setError(null);
      setTxHash(null);

      // --- Pre-flight checks (cheap to fail) -------------------------------------
      setState("preparing");
      if (!isConnected || !address) {
        setError("Connect your wallet first.");
        setState("error");
        return null;
      }
      if (!isEscrowConfigured()) {
        setError(
          "Escrow wallet is not configured. Set VITE_ESCROW_WALLET in your environment.",
        );
        setState("error");
        return null;
      }
      const parsed = Number(amountUsdc);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Invalid amount.");
        setState("error");
        return null;
      }

      // --- Network switch (if user is not on Base Sepolia) -----------------------
      if (chainId !== ACTIVE_CHAIN_ID) {
        try {
          await switchChainAsync({ chainId: ACTIVE_CHAIN_ID });
        } catch (e) {
          setError(
            e instanceof Error
              ? `Wallet is on the wrong chain. ${e.message}`
              : "Wallet is on the wrong chain.",
          );
          setState("error");
          return null;
        }
      }

      // --- Sign + broadcast ------------------------------------------------------
      let amountWei: bigint;
      try {
        amountWei = parseUnits(amountUsdc, USDC_DECIMALS);
      } catch {
        setError("Could not parse amount to USDC base units.");
        setState("error");
        return null;
      }

      setState("signing");
      let hash: Hash;
      try {
        hash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [ESCROW_WALLET as Address, amountWei],
          chainId: ACTIVE_CHAIN_ID,
        });
      } catch (e) {
        // User-rejected requests in viem/wagmi are typed `UserRejectedRequestError`
        // (code 4001). All other failures (insufficient funds, RPC failure) fall
        // through to the generic branch.
        const message = e instanceof Error ? e.message : "Wallet rejected the transaction.";
        const rejected = /user (rejected|denied)/i.test(message);
        setError(rejected ? "You rejected the transaction in your wallet." : message);
        setState("error");
        return null;
      }

      setTxHash(hash);
      setState("broadcasting");

      // Defer to receipt watcher.
      // wagmi's `useWaitForTransactionReceipt` will pick up the hash and the
      // `useEffect` above transitions us to "confirmed" / "error".
      setState("confirming");
      return hash;
    },
    [address, isConnected, chainId, switchChainAsync, writeContractAsync],
  );

  return useMemo(
    () => ({ state, txHash, error, send, reset }),
    [state, txHash, error, send, reset],
  );
}
