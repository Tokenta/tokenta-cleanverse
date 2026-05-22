/** Mechanism §12 — LIVE | STALE | REVOKED monitor states */

import { listingStore } from "../listings/store.js";
import type { ListingRecord } from "../listings/store.js";

export type MonitorState = "LIVE" | "STALE" | "REVOKED";

const TTL_P2P_MS = Number(process.env.LIVE_MONITOR_TTL_P2P_MS ?? 30 * 60 * 1000);
const TTL_DIRECT_MS = Number(process.env.LIVE_MONITOR_TTL_DIRECT_MS ?? 5 * 60 * 1000);
const REVOKE_MULTIPLIER = 2;

export function monitorTtlMs(listing: ListingRecord): number {
  return listing.listingSource === "TOKENTA_DIRECT" ? TTL_DIRECT_MS : TTL_P2P_MS;
}

export function touchL1(listingId: string): void {
  const listing = listingStore.get(listingId);
  if (!listing) return;
  listing.lastL1At = new Date().toISOString();
  listing.monitorState = "LIVE";
  listing.updatedAt = listing.lastL1At;
}

export function markRevoked(listingId: string, reason?: string): void {
  const listing = listingStore.get(listingId);
  if (!listing) return;
  listing.monitorState = "REVOKED";
  listing.status = "FAILED";
  listing.updatedAt = new Date().toISOString();
  if (reason) listing.revokeReason = reason;
}

export function tickMonitorStates(): { live: number; stale: number; revoked: number } {
  let live = 0;
  let stale = 0;
  let revoked = 0;

  for (const listing of listingStore.listForMonitor()) {
    if (!listing.lastL1At) {
      if (listing.status === "LIVE") {
        listing.lastL1At = listing.updatedAt;
        listing.monitorState = "LIVE";
      }
      continue;
    }

    const age = Date.now() - new Date(listing.lastL1At).getTime();
    const ttl = monitorTtlMs(listing);

    if (age > ttl * REVOKE_MULTIPLIER) {
      listing.monitorState = "REVOKED";
      listing.status = "FAILED";
      revoked++;
    } else if (age > ttl) {
      listing.monitorState = "STALE";
      stale++;
    } else {
      listing.monitorState = "LIVE";
      live++;
    }
  }

  return { live, stale, revoked };
}

/** Dev/mock: refresh Tokenta Direct listings without seller key (heartbeat only). */
export function simulateDirectHeartbeats(): number {
  let n = 0;
  for (const listing of listingStore.listForMonitor()) {
    if (listing.listingSource !== "TOKENTA_DIRECT") continue;
    if (listing.monitorState === "REVOKED") continue;
    touchL1(listing.id);
    n++;
  }
  return n;
}
