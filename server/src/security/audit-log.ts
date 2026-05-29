/** Cross-cutting — lock transitions, cache invalidations (engine §15 audit trail) */

export type AuditEventType =
  | "LOCK_TRANSITION"
  | "CACHE_INVALIDATE"
  | "OPS_OVERRIDE"
  | "ESCROW_FUND"
  | "ESCROW_RELEASE"
  | "BIND_VERIFICATION"
  | "LISTING_PUBLISHED";

export interface AuditEntry {
  type: AuditEventType;
  keyFingerprint?: string;
  listingId?: string;
  orderId?: string;
  jobId?: string;
  proofHash?: string;
  amountUsdc?: string;
  from?: string;
  to?: string;
  reason?: string;
  at: string;
}

const entries: AuditEntry[] = [];
const MAX = 500;

export function recordAudit(entry: Omit<AuditEntry, "at">): void {
  entries.push({ ...entry, at: new Date().toISOString() });
  if (entries.length > MAX) entries.shift();
}

export function listAudit(limit = 50, type?: AuditEventType): AuditEntry[] {
  const slice = entries.slice(-MAX).reverse();
  const filtered = type ? slice.filter((e) => e.type === type) : slice;
  return filtered.slice(0, Math.min(limit, MAX));
}

export function resetAuditForTest(): void {
  entries.length = 0;
}
