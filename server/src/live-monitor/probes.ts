/**
 * Mechanism §12 — scheduled P2P L1 using vault-stored seller credentials.
 */

import { listingStore, type ListingRecord } from "../listings/store.js";
import { jobStore } from "../jobs/store.js";
import { enqueueJob } from "../jobs/worker.js";
import { retrieveListingCredential } from "../security/credential-vault.js";
import { globalLockStore } from "../verification/lock-store.js";
import { checkAbuseBeforeJob } from "../verification/abuse-guard.js";
import { defaultProbeModel } from "../verification/providers/router.js";
import type { ProviderKind } from "../types/verification.js";
import { monitorTtlMs } from "./state.js";

const MAX_PER_TICK = Number(process.env.LIVE_MONITOR_MAX_PROBES_PER_TICK ?? 3);
const PROBE_AGE_RATIO = Number(process.env.LIVE_MONITOR_PROBE_AGE_RATIO ?? 0.85);
const P2P_PROBE_ENABLED = process.env.LIVE_MONITOR_P2P_PROBE !== "false";

function mapProviderKind(kind: string): ProviderKind {
  const k = kind.toLowerCase();
  if (k.includes("anthropic")) return "anthropic";
  if (k.includes("google") || k.includes("gemini")) return "google";
  if (k.includes("custom")) return "custom";
  return "openai";
}

export function listingNeedsL1Probe(listing: ListingRecord): boolean {
  if (listing.monitorState === "REVOKED") return false;
  if (listing.listingSource === "TOKENTA_DIRECT") return false;
  if (!listing.credentialRef) return false;
  if (!listing.lastL1At) return true;
  const age = Date.now() - new Date(listing.lastL1At).getTime();
  const ttl = monitorTtlMs(listing);
  return listing.monitorState === "STALE" || age >= ttl * PROBE_AGE_RATIO;
}

export function hasActiveLiveJobForListing(listingId: string): boolean {
  for (const job of jobStore.listJobs()) {
    if (job.listingId !== listingId) continue;
    if (job.request.context !== "LIVE") continue;
    if (job.status === "QUEUED" || job.status === "RUNNING") return true;
  }
  return false;
}

export async function runScheduledL1Probes(): Promise<{
  enqueued: number;
  skipped: number;
}> {
  if (!P2P_PROBE_ENABLED) return { enqueued: 0, skipped: 0 };

  let enqueued = 0;
  let skipped = 0;

  const candidates = listingStore
    .listForMonitor()
    .filter(listingNeedsL1Probe)
    .sort((a, b) => {
      const ageA = a.lastL1At ? Date.now() - new Date(a.lastL1At).getTime() : Infinity;
      const ageB = b.lastL1At ? Date.now() - new Date(b.lastL1At).getTime() : Infinity;
      return ageB - ageA;
    });

  for (const listing of candidates) {
    if (enqueued >= MAX_PER_TICK) break;

    if (hasActiveLiveJobForListing(listing.id)) {
      skipped++;
      continue;
    }

    const apiKey = listing.credentialRef
      ? await retrieveListingCredential(listing.credentialRef)
      : null;
    if (!apiKey) {
      skipped++;
      continue;
    }

    const fp = listing.keyFingerprint;
    if (globalLockStore.get(fp) === "TERMINAL_FAIL_LOCKED") {
      skipped++;
      continue;
    }

    const abuse = checkAbuseBeforeJob(fp);
    if (!abuse.allowed) {
      skipped++;
      continue;
    }

    const provider = mapProviderKind(listing.providerKind);
    const claimedModel =
      listing.claimedModel ?? defaultProbeModel(provider);

    const job = jobStore.create(
      {
        context: "LIVE",
        provider,
        apiKey,
        declaredQuantity: listing.quotaToSell,
        claimedModel,
        costLiability: listing.platformSubsidized
          ? "PLATFORM_SUBSIDIZED"
          : "SELLER_PAID",
        l1Only: true,
      },
      { listingId: listing.id, keyFingerprint: fp },
    );

    enqueueJob(job.id);
    enqueued++;
  }

  return { enqueued, skipped };
}
