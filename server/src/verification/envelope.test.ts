import { describe, it, expect } from "vitest";
import { computeProbeEnvelope } from "./envelope.js";
import * as budget from "./budget-enforcer.js";

describe("computeProbeEnvelope", () => {
  it("bounds large declared quantity (min of tier 200 and log scale)", () => {
    const e = computeProbeEnvelope(10_000_000);
    expect(e.operationalMaxProbeTokens).toBeLessThanOrEqual(200);
    expect(e.operationalMaxProbeTokens).toBeGreaterThan(0);
  });

  it("uses small envelope for tiny listings", () => {
    const e = computeProbeEnvelope(400);
    expect(e.operationalMaxProbeTokens).toBeLessThanOrEqual(20);
    expect(e.maxProbeCalls).toBe(1);
  });

  it("tier envelope for 500 declared", () => {
    const e = computeProbeEnvelope(500);
    expect(e.maxProbeCalls).toBeGreaterThanOrEqual(1);
    expect(e.operationalMaxProbeTokens).toBeLessThanOrEqual(25);
  });

  it("tier envelope for 10k declared", () => {
    const e = computeProbeEnvelope(10_000);
    expect(e.operationalMaxProbeTokens).toBeGreaterThan(10);
    expect(e.maxProbeCalls).toBeGreaterThanOrEqual(1);
  });

  it("tier envelope for 10M declared capped", () => {
    const e = computeProbeEnvelope(10_000_000);
    expect(e.operationalMaxProbeTokens).toBeLessThanOrEqual(200);
  });
});

describe("BudgetEnforcer calls before budget", () => {
  it("stops at maxProbeCalls despite envelope room", () => {
    const envelope = computeProbeEnvelope(10_000);
    const state = {
      probeCallCount: envelope.maxProbeCalls,
      livenessCallCount: 1,
      accumulatedTokens: 25,
      probeModelId: "gpt-4o-mini",
      lockState: "PROBE_ALLOWED" as const,
      cooldownActive: false,
    };
    expect(budget.shouldStopDespiteEnvelopeRoom(state, envelope)).toBe(true);
    expect(budget.canRunMicroProbe(state, envelope, 25)).toBe("MAX_PROBE_CALLS");
  });

  it("does not authorize extra probe when at maxProbeCalls", () => {
    const envelope = computeProbeEnvelope(400);
    const state = {
      probeCallCount: 1,
      livenessCallCount: 1,
      accumulatedTokens: 3,
      probeModelId: "gpt-4o-mini",
      lockState: "PROBE_ALLOWED" as const,
      cooldownActive: false,
    };
    expect(envelope.maxProbeCalls).toBe(1);
    expect(budget.canRunMicroProbe(state, envelope, 5)).toBe("MAX_PROBE_CALLS");
  });
});
