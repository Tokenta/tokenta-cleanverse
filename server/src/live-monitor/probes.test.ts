import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listingStore } from "../listings/store.js";
import {
  listingNeedsL1Probe,
  hasActiveLiveJobForListing,
  runScheduledL1Probes,
} from "./probes.js";
import {
  resetVaultForTest,
  storeListingCredential,
} from "../security/credential-vault.js";
import { jobStore } from "../jobs/store.js";

describe("live-monitor probes", () => {
  const prevVault = process.env.DEV_CREDENTIAL_VAULT;
  const prevMock = process.env.VERIFICATION_MOCK;

  beforeEach(() => {
    listingStore["listings"].clear();
    jobStore["jobs"].clear();
    resetVaultForTest();
    process.env.DEV_CREDENTIAL_VAULT = "true";
    process.env.VERIFICATION_MOCK = "true";
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env.DEV_CREDENTIAL_VAULT = prevVault;
    process.env.VERIFICATION_MOCK = prevMock;
    resetVaultForTest();
    vi.useRealTimers();
  });

  it("needs probe when STALE and has credentialRef", async () => {
    const listing = listingStore.create({
      providerKind: "openai",
      quotaToSell: 5000,
      askPriceUsdc: 1,
      keyFingerprint: "fp_probe",
      verificationJobId: "vj_x",
      listingSource: "P2P",
    });
    listing.status = "LIVE";
    listing.monitorState = "STALE";
    listing.lastL1At = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    await storeListingCredential(listing.id, "sk-mock-probe-key");
    listingStore.setCredentialRef(listing.id, `listing/${listing.id}`);

    expect(listingNeedsL1Probe(listing)).toBe(true);
  });

  it("enqueues LIVE job for due P2P listing", async () => {
    const listing = listingStore.create({
      providerKind: "openai",
      quotaToSell: 5000,
      askPriceUsdc: 1,
      keyFingerprint: "fp_enqueue",
      verificationJobId: "vj_y",
      listingSource: "P2P",
    });
    listing.status = "LIVE";
    listing.monitorState = "STALE";
    listing.lastL1At = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    await storeListingCredential(listing.id, "sk-mock-scheduled");
    listingStore.setCredentialRef(listing.id, `listing/${listing.id}`);

    const result = await runScheduledL1Probes();
    expect(result.enqueued).toBe(1);
    expect(hasActiveLiveJobForListing(listing.id)).toBe(true);
    const jobs = jobStore.listJobs();
    expect(jobs.some((j) => j.request.context === "LIVE" && j.listingId === listing.id)).toBe(
      true,
    );
  });
});
