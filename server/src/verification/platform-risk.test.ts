import { beforeEach, describe, expect, it } from "vitest";
import { assessPlatformRisk } from "./platform-risk.js";
import { recordJobStarted, resetStatsForTest } from "./abuse-guard.js";

describe("platform-risk L5", () => {
  beforeEach(() => resetStatsForTest());

  it("flags custom provider as gray market without HTTP", () => {
    const r = assessPlatformRisk({
      provider: "custom",
      keyFingerprint: "fp_custom",
      context: "LISTING_DRAFT",
      sharedKey: false,
    });
    expect(r.grayMarket).toBe(true);
    expect(r.l5Record.paradigm).toBe("L5");
    expect(r.l5Record.tokensUsed).toBe(0);
  });

  it("flags high verify velocity separately without inflating grayMarket", () => {
    const fp = "fp_velocity";
    // Threshold is >= 5 jobs in 24h
    for (let i = 0; i < 5; i++) recordJobStarted(fp);
    const r = assessPlatformRisk({
      provider: "openai",
      keyFingerprint: fp,
      context: "LISTING_DRAFT",
      sharedKey: false,
    });
    // highVelocity is flagged for ops visibility (in l5Record errorCode)
    expect(r.highVelocity).toBe(true);
    // grayMarket is about custom/reseller endpoints, NOT verify velocity.
    // Decoupling prevents trustScore from crossing 0.8 for repeated test submissions.
    expect(r.grayMarket).toBe(false);
    expect(r.trustSignals.grayMarket).toBeUndefined();
    expect(r.l5Record.errorCode).toContain("HIGH_VERIFY_VELOCITY");
  });
});
