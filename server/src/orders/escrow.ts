/**
 * Dev escrow fund/release stubs — engine order escrow routes with signature gate.
 */

import { verifyEscrowSignature } from "../security/escrow-signature.js";
import { recordAudit } from "../security/audit-log.js";

export type EscrowStatus = "PENDING" | "FUNDED" | "RELEASED";

export interface EscrowRecord {
  orderId: string;
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
): { ok: boolean; record?: EscrowRecord; error?: string; code?: string } {
  if (!verifyEscrowSignature(orderId, amountUsdc, "fund", signature)) {
    return { ok: false, error: "invalid escrow signature", code: "ESCROW_SIGNATURE_INVALID" };
  }

  const existing = escrows.get(orderId);
  const record: EscrowRecord = existing ?? {
    orderId,
    status: "PENDING",
    amountUsdc,
  };
  record.status = "FUNDED";
  record.amountUsdc = amountUsdc;
  record.fundedAt = new Date().toISOString();
  record.fundTxHash = `0xescrow-fund-${orderId.slice(-8)}`;
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
