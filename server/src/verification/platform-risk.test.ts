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

  it("bumps gray market on high verify velocity", () => {
    const fp = "fp_velocity";
    recordJobStarted(fp);
    recordJobStarted(fp);
    recordJobStarted(fp);
    const r = assessPlatformRisk({
      provider: "openai",
      keyFingerprint: fp,
      context: "LISTING_DRAFT",
      sharedKey: false,
    });
    expect(r.highVelocity).toBe(true);
    expect(r.trustSignals.grayMarket).toBe(true);
  });
});
