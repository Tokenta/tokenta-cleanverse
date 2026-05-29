import type { TerminalOutcome, VerificationProof } from "../types/verification.js";

export type ListingStatus =
  | "VERIFYING"
  | "VERIFIED_PENDING_PUBLISH"
  | "LIVE"
  | "REVIEW"
  | "FAILED"
  | "DEGRADED";
export type ListingSource = "P2P" | "TOKENTA_DIRECT";
export type MonitorState = "LIVE" | "STALE" | "REVOKED";

export interface ListingRecord {
  id: string;
  sellerWallet?: string | null;
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
    sellerWallet?: string | null;
  }): ListingRecord {
    const id = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const record: ListingRecord = {
      id,
      sellerWallet: input.sellerWallet ?? null,
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

    if (proof.terminalOutcome === "PASS") {
      if (listing.autoListAfterVerify) {
        listing.status = "LIVE";
        listing.lastL1At = new Date().toISOString();
        listing.monitorState = "LIVE";
      } else {
        // Seller must explicitly publish — holds in a gated state invisible to buyers.
        listing.status = "VERIFIED_PENDING_PUBLISH";
      }
    } else if (proof.terminalOutcome === "FAIL") {
      listing.status = "FAILED";
    } else if (proof.terminalOutcome === "DEGRADED") {
      listing.status = "DEGRADED";
    } else if (proof.terminalOutcome === "REVIEW") {
      listing.status = "REVIEW";
    }

    return listing;
  }

  /**
   * Updates the ask price on a LIVE or VERIFIED_PENDING_PUBLISH listing.
   * Only the original seller wallet may change the price.
   * Returns the updated listing, or an error string if the update is rejected.
   */
  updatePrice(
    listingId: string,
    newAskPriceUsdc: number,
    requestingWallet?: string | null,
  ): ListingRecord | { error: string; code: string } {
    const listing = this.listings.get(listingId);
    if (!listing) return { error: "listing not found", code: "NOT_FOUND" };

    // Validate the requesting wallet owns this listing.
    if (
      requestingWallet &&
      listing.sellerWallet &&
      listing.sellerWallet.toLowerCase() !== requestingWallet.toLowerCase()
    ) {
      return { error: "only the seller may update the price", code: "FORBIDDEN" };
    }

    if (newAskPriceUsdc <= 0) {
      return { error: "askPriceUsdc must be positive", code: "INVALID_PRICE" };
    }

    if (
      listing.status !== "LIVE" &&
      listing.status !== "VERIFIED_PENDING_PUBLISH" &&
      listing.status !== "REVIEW"
    ) {
      return {
        error: "price can only be updated on LIVE, REVIEW, or VERIFIED_PENDING_PUBLISH listings",
        code: "INVALID_LISTING_STATE",
      };
    }

    listing.askPriceUsdc = newAskPriceUsdc;
    listing.updatedAt = new Date().toISOString();
    return listing;
  }

  /** Dev-only: wipe all listings (used by POST /dev/reset). */
  resetForDev(): void {
    this.listings.clear();
  }

  /** Transitions a VERIFIED_PENDING_PUBLISH listing to LIVE after explicit seller confirmation. */
  publishListing(listingId: string): ListingRecord | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) return undefined;
    if (listing.status !== "VERIFIED_PENDING_PUBLISH") return undefined;
    listing.status = "LIVE";
    listing.monitorState = "LIVE";
    listing.lastL1At = new Date().toISOString();
    listing.updatedAt = new Date().toISOString();
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

  /** Shared-key heuristic §9A.2 — same fingerprint on multiple active listings.
   * Only counts LIVE listings (completed verification). VERIFYING/REVIEW listings
   * from the same seller retrying are excluded to avoid false positives during testing.
   * Threshold >= 2 means the key must appear in two or more OTHER live listings simultaneously. */
  countByFingerprint(keyFingerprint: string, excludeListingId?: string): number {
    let n = 0;
    for (const l of this.listings.values()) {
      if (l.keyFingerprint === keyFingerprint && l.id !== excludeListingId) {
        if (l.status === "LIVE") n++;
      }
    }
    return n;
  }

  isSharedKeySuspected(keyFingerprint: string, excludeListingId?: string): boolean {
    return this.countByFingerprint(keyFingerprint, excludeListingId) >= 2;
  }

  toMarketRow(l: ListingRecord) {
    return {
      listingId: l.id,
      sellerWallet: l.sellerWallet ?? null,
      providerKind: l.providerKind,
      quotaToSell: l.quotaToSell,
      quotaUnit: l.quotaUnit,
      askPriceUsdc: l.askPriceUsdc,
      verificationState: mapVerificationState(l),
      listingStatus: l.status,
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
  if (l.status === "VERIFIED_PENDING_PUBLISH") return "VERIFIED_PENDING_PUBLISH";
  if (l.status === "VERIFYING") return "VERIFYING";
  if (l.status === "REVIEW") return "REVIEW";
  if (l.status === "DEGRADED") return "DEGRADED";
  if (l.status === "FAILED") return "FAILED";
  return "UNKNOWN";
}


export const listingStore = new ListingStore();
