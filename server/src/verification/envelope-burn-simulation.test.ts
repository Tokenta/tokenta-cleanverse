/**
 * Mechanism §4A.2 — token burn simulation sheet (envelope tiers).
 */

import { describe, expect, it } from "vitest";
import { computeProbeEnvelope } from "./envelope.js";

/** Representative declared quantities from mechanism burn table. */
const BURN_TABLE: Array<{
  declared: number;
  maxOperational: number;
  maxCalls: number;
}> = [
  { declared: 400, maxOperational: 12, maxCalls: 1 },
  { declared: 750, maxOperational: 20, maxCalls: 2 },
  { declared: 5_000, maxOperational: 40, maxCalls: 2 },
  { declared: 50_000, maxOperational: 75, maxCalls: 3 },
  { declared: 500_000, maxOperational: 120, maxCalls: 3 },
  { declared: 5_000_000, maxOperational: 200, maxCalls: 3 },
];

describe("envelope burn simulation §4A.2", () => {
  it.each(BURN_TABLE)(
    "declared $declared stays within operational ceiling $maxOperational",
    ({ declared, maxOperational, maxCalls }) => {
      const e = computeProbeEnvelope(declared);
      expect(e.operationalMaxProbeTokens).toBeLessThanOrEqual(maxOperational);
      expect(e.maxProbeCalls).toBeLessThanOrEqual(maxCalls);
      expect(e.consentDisclosureCeiling).toBeLessThanOrEqual(5000);
      expect(e.consentDisclosureCeiling).toBeGreaterThan(0);
    },
  );

  it("consent ceiling is nonlinear (not fixed 3% of huge listings)", () => {
    const small = computeProbeEnvelope(1_000);
    const huge = computeProbeEnvelope(10_000_000);
    expect(huge.consentDisclosureCeiling).toBe(5000);
    expect(small.consentDisclosureCeiling).toBeLessThan(5000);
  });
});
