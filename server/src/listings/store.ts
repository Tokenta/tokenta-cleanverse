import type { TerminalOutcome, VerificationProof } from "../types/verification.js";

export type ListingStatus = "VERIFYING" | "LIVE" | "REVIEW" | "FAILED" | "DEGRADED";
export type ListingSource = "P2P" | "TOKENTA_DIRECT";
export type MonitorState = "LIVE" | "STALE" | "REVOKED";

export interface ListingRecord {
  id: string;
  providerKind: string;
  quotaToSell: number;
  quotaUnit: string;
  askPriceUsdc: number;
  keyFingerprint: string;
  status: ListingStatus;
  autoListAfterVerify: boolean;
  listingSource: ListingSource;
  platformSubsidized: boolean;
  monitorState?: MonitorState;
  lastL1At?: string;
  revokeReason?: string;
  verificationJobId?: string;
  credentialRef?: string;
  claimedModel?: string;
  proofHash?: string;
  terminalOutcome?: TerminalOutcome;
  capabilityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export class ListingStore {
  private listings = new Map<string, ListingRecord>();

  create(input: {
    providerKind: string;
    quotaToSell: number;
    quotaUnit?: string;
    askPriceUsdc: number;
    keyFingerprint: string;
    autoListAfterVerify?: boolean;
    verificationJobId: string;
    listingSource?: ListingSource;
    platformSubsidized?: boolean;
  }): ListingRecord {
    const id = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const record: ListingRecord = {
      id,
      providerKind: input.providerKind,
      quotaToSell: input.quotaToSell,
      quotaUnit: input.quotaUnit ?? "tokens",
      askPriceUsdc: input.askPriceUsdc,
      keyFingerprint: input.keyFingerprint,
      status: "VERIFYING",
      autoListAfterVerify: input.autoListAfterVerify ?? true,
      listingSource: input.listingSource ?? "P2P",
      platformSubsidized: input.platformSubsidized ?? false,
      verificationJobId: input.verificationJobId,
      createdAt: now,
      updatedAt: now,
    };
    this.listings.set(id, record);
    return record;
  }

  get(id: string): ListingRecord | undefined {
    return this.listings.get(id);
  }

  setCredentialRef(listingId: string, ref: string): void {
    const l = this.listings.get(listingId);
    if (l) {
      l.credentialRef = ref;
      l.updatedAt = new Date().toISOString();
    }
  }

  bindVerification(listingId: string, proof: VerificationProof): ListingRecord | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) return undefined;

    listing.proofHash = proof.proofHash;
    listing.terminalOutcome = proof.terminalOutcome;
    listing.capabilityScore = proof.capabilityScore;
    if (proof.probeModelId) listing.claimedModel = proof.probeModelId;
    listing.updatedAt = new Date().toISOString();

    if (proof.terminalOutcome === "PASS" && listing.autoListAfterVerify) {
      listing.status = "LIVE";
      listing.lastL1At = new Date().toISOString();
      listing.monitorState = "LIVE";
    } else if (proof.terminalOutcome === "FAIL") {
      listing.status = "FAILED";
    } else if (proof.terminalOutcome === "DEGRADED") {
      listing.status = "DEGRADED";
    } else if (proof.terminalOutcome === "REVIEW") {
      listing.status = "REVIEW";
    }

    return listing;
  }

  listMine(): ListingRecord[] {
    return [...this.listings.values()].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  listLive(): ListingRecord[] {
    return this.listMine().filter(
      (l) =>
        (l.status === "LIVE" || l.status === "REVIEW") && l.monitorState !== "REVOKED",
    );
  }

  listForMonitor(): ListingRecord[] {
    return this.listMine().filter((l) => l.status === "LIVE" || l.status === "REVIEW");
  }

  /** Shared-key heuristic §9A.2 — same fingerprint on multiple active listings */
  countByFingerprint(keyFingerprint: string, excludeListingId?: string): number {
    let n = 0;
    for (const l of this.listings.values()) {
      if (l.keyFingerprint === keyFingerprint && l.id !== excludeListingId) {
        if (l.status === "LIVE" || l.status === "VERIFYING" || l.status === "REVIEW") n++;
      }
    }
    return n;
  }

  isSharedKeySuspected(keyFingerprint: string, excludeListingId?: string): boolean {
    return this.countByFingerprint(keyFingerprint, excludeListingId) >= 1;
  }

  toMarketRow(l: ListingRecord) {
    return {
      listingId: l.id,
      providerKind: l.providerKind,
      quotaToSell: l.quotaToSell,
      quotaUnit: l.quotaUnit,
      askPriceUsdc: l.askPriceUsdc,
      verificationState: mapVerificationState(l),
      terminalOutcome: l.terminalOutcome,
      proofHash: l.proofHash,
      capabilityScore: l.capabilityScore,
      updatedAt: l.updatedAt,
    };
  }
}

function mapVerificationState(l: ListingRecord): string {
  if (l.monitorState === "REVOKED" || (l.status === "FAILED" && l.revokeReason)) {
    return "REVOKED";
  }
  if (l.monitorState === "STALE") return "STALE";
  if (l.monitorState === "LIVE" || l.status === "LIVE") return "LIVE";
  if (l.status === "VERIFYING") return "VERIFYING";
  if (l.status === "REVIEW") return "REVIEW";
  if (l.status === "DEGRADED") return "DEGRADED";
  if (l.status === "FAILED") return "FAILED";
  return "UNKNOWN";
}


export const listingStore = new ListingStore();
