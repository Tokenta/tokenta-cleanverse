import { describe, expect, it, beforeEach } from "vitest";
import { listingStore } from "../listings/store.js";
import { tickMonitorStates, touchL1 } from "./state.js";

describe("live-monitor state", () => {
  beforeEach(() => {
    listingStore["listings"].clear();
  });

  it("marks STALE after P2P TTL", () => {
    const listing = listingStore.create({
      providerKind: "openai",
      quotaToSell: 10_000,
      askPriceUsdc: 1,
      keyFingerprint: "fp_test",
      verificationJobId: "vj_test",
      listingSource: "P2P",
    });
    listing.status = "LIVE";
    listing.lastL1At = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    listing.monitorState = "LIVE";

    const counts = tickMonitorStates();
    expect(listing.monitorState).toBe("STALE");
    expect(counts.stale).toBeGreaterThan(0);
  });

  it("touchL1 sets LIVE", () => {
    const listing = listingStore.create({
      providerKind: "openai",
      quotaToSell: 1000,
      askPriceUsdc: 1,
      keyFingerprint: "fp2",
      verificationJobId: "vj2",
    });
    listing.status = "LIVE";
    touchL1(listing.id);
    expect(listing.monitorState).toBe("LIVE");
    expect(listing.lastL1At).toBeDefined();
  });
});
