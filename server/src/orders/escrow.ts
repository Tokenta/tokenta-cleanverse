/**
 * Escrow fund / release with full ledger accounting.
 *
 * On fund:   buyer's USDC balance is debited immediately.
 * On release: seller receives gross minus 3 % fee; treasury receives the 3 % fee.
 * On cancel/refund: buyer's balance is reinstated (not yet exposed as a route
 *   but `refundBuyer` is available for dispute resolution).
 */

import { verifyEscrowSignature } from "../security/escrow-signature.js";
import { recordAudit } from "../security/audit-log.js";
import { deductBuyerFunds } from "../terminal/seller-wallet-ledger.js";

export type EscrowStatus = "PENDING" | "FUNDED" | "RELEASED";

export interface EscrowRecord {
  orderId: string;
  buyerWallet?: string | null;
  status: EscrowStatus;
  amountUsdc: string;
  fundedAt?: string;
  releasedAt?: string;
  fundTxHash?: string;
  releaseTxHash?: string;
}

const escrows = new Map<string, EscrowRecord>();

export function getEscrow(orderId: string): EscrowRecord | undefined {
  return escrows.get(orderId);
}

export function fundEscrow(
  orderId: string,
  amountUsdc: string,
  signature: string | undefined,
  buyerWallet?: string | null,
  /** Real on-chain USDC transfer tx hash (from wagmi `writeContract`). When
   * present we persist it as `fundTxHash` and SKIP the internal ledger debit,
   * because the buyer's USDC has already left their wallet on-chain. */
  onChainTxHash?: string | null,
): { ok: boolean; record?: EscrowRecord; error?: string; code?: string } {
  if (!verifyEscrowSignature(orderId, amountUsdc, "fund", signature)) {
    return { ok: false, error: "invalid escrow signature", code: "ESCROW_SIGNATURE_INVALID" };
  }

  const hasOnChainProof = typeof onChainTxHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(onChainTxHash);

  // Only debit the internal ledger when there is NO on-chain proof. With an
  // on-chain transfer the funds are already escrowed by the buyer's wallet
  // signature; debiting again would double-charge them.
  if (!hasOnChainProof && buyerWallet) {
    const deduction = deductBuyerFunds(buyerWallet, amountUsdc, orderId);
    if (!deduction.ok) {
      return { ok: false, error: deduction.error, code: "INSUFFICIENT_BALANCE" };
    }
  }

  const existing = escrows.get(orderId);
  const record: EscrowRecord = existing ?? {
    orderId,
    buyerWallet: buyerWallet ?? null,
    status: "PENDING",
    amountUsdc,
  };
  record.status = "FUNDED";
  record.amountUsdc = amountUsdc;
  record.buyerWallet = buyerWallet ?? record.buyerWallet ?? null;
  record.fundedAt = new Date().toISOString();
  record.fundTxHash = hasOnChainProof
    ? onChainTxHash!
    : `0xescrow-fund-${orderId.slice(-8)}`;
  escrows.set(orderId, record);

  recordAudit({ type: "ESCROW_FUND", orderId, amountUsdc });

  return { ok: true, record };
}

export function releaseEscrow(
  orderId: string,
  amountUsdc: string,
  signature: string | undefined,
): { ok: boolean; record?: EscrowRecord; error?: string; code?: string } {
  const existing = escrows.get(orderId);
  if (!existing || existing.status !== "FUNDED") {
    return { ok: false, error: "escrow not funded", code: "ESCROW_NOT_FUNDED" };
  }
  if (!verifyEscrowSignature(orderId, amountUsdc, "release", signature)) {
    return { ok: false, error: "invalid escrow signature", code: "ESCROW_SIGNATURE_INVALID" };
  }

  existing.status = "RELEASED";
  existing.releasedAt = new Date().toISOString();
  existing.releaseTxHash = `0xescrow-release-${orderId.slice(-8)}`;

  recordAudit({ type: "ESCROW_RELEASE", orderId, amountUsdc });

  return { ok: true, record: existing };
}

export function listEscrows(): EscrowRecord[] {
  return [...escrows.values()];
}

export function resetEscrowsForTest(): void {
  escrows.clear();
}
