/**
 * Mechanism §10 / engine §13 — proofHash on-chain anchor registry (dev scaffold).
 */

export type AnchorStatus = "NONE" | "PENDING" | "ANCHORED" | "FAILED";

export interface ProofAnchorRecord {
  proofHash: string;
  jobId?: string;
  listingId?: string;
  status: AnchorStatus;
  chainId?: number;
  txHash?: string;
  anchoredAt?: string;
  createdAt: string;
}

const anchors = new Map<string, ProofAnchorRecord>();

export function getProofAnchor(proofHash: string): ProofAnchorRecord | undefined {
  return anchors.get(proofHash);
}

export function listProofAnchors(): ProofAnchorRecord[] {
  return [...anchors.values()];
}

export function markAnchorPending(proofHash: string, txHash: string, chainId?: number): void {
  const rec = anchors.get(proofHash);
  if (!rec) return;
  rec.status = "PENDING";
  rec.txHash = txHash;
  rec.chainId = chainId;
}

export function registerProofAnchor(input: {
  proofHash: string;
  jobId?: string;
  listingId?: string;
}): ProofAnchorRecord {
  const existing = anchors.get(input.proofHash);
  if (existing) return existing;

  const record: ProofAnchorRecord = {
    proofHash: input.proofHash,
    jobId: input.jobId,
    listingId: input.listingId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  anchors.set(input.proofHash, record);
  return record;
}

/** Dev: simulate anchor confirmation after delay */
export async function confirmAnchorOnChain(
  proofHash: string,
): Promise<ProofAnchorRecord | undefined> {
  const rec = anchors.get(proofHash);
  if (!rec) return undefined;

  if (process.env.PROOF_ANCHOR_RPC_URL) {
    const { submitProofAnchorToL2 } = await import("./proof-anchor-l2.js");
    const result = await submitProofAnchorToL2(rec);
    if (result.ok && result.txHash) {
      rec.status = "ANCHORED";
      rec.chainId = Number(process.env.PROOF_ANCHOR_CHAIN_ID ?? process.env.SETTLEMENT_CHAIN_ID ?? 84532);
      rec.txHash = result.txHash;
      rec.anchoredAt = new Date().toISOString();
      return rec;
    }
    markAnchorFailed(proofHash, result.error);
    return rec;
  }

  return confirmMockAnchor(proofHash);
}

export function confirmMockAnchor(proofHash: string): ProofAnchorRecord | undefined {
  const rec = anchors.get(proofHash);
  if (!rec) return undefined;
  rec.status = "ANCHORED";
  rec.chainId = Number(process.env.PROOF_ANCHOR_CHAIN_ID ?? process.env.SETTLEMENT_CHAIN_ID ?? 84532);
  const contract = process.env.PROOF_ANCHOR_CONTRACT_ADDRESS;
  rec.txHash = contract
    ? `0xanchor-${contract.slice(2, 10)}-${proofHash.slice(0, 8)}`
    : `0xmock${proofHash.slice(0, 8)}${Date.now().toString(16)}`;
  rec.anchoredAt = new Date().toISOString();
  return rec;
}

export function markAnchorFailed(proofHash: string, reason?: string): void {
  const rec = anchors.get(proofHash);
  if (!rec) return;
  rec.status = "FAILED";
  rec.txHash = reason;
}

export function resetAnchorsForTest(): void {
  anchors.clear();
}

export function maybeAutoAnchor(proofHash: string, jobId?: string, listingId?: string): void {
  if (process.env.PROOF_ANCHOR_AUTO_MOCK !== "true") return;
  registerProofAnchor({ proofHash, jobId, listingId });
  setTimeout(() => void confirmAnchorOnChain(proofHash), 100);
}
