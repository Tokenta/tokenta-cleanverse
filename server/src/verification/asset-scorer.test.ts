import { describe, expect, it } from "vitest";
import { composeTerminalOutcome, scoreVerification } from "./asset-scorer.js";

describe("asset-scorer decision matrix", () => {
  it("high capability + high trust yields REVIEW not FAIL", () => {
    const outcome = composeTerminalOutcome(false, 0.85, 0.9, 0.1, false);
    expect(outcome).toBe("REVIEW");
    expect(outcome).not.toBe("FAIL");
  });

  it("scoreVerification: strong L2 + shared key -> REVIEW", () => {
    const result = scoreVerification({
      l1Pass: true,
      l2Pass: true,
      l2Skipped: false,
      rateHeadroomNorm: 0.9,
      repeatSampleOk: true,
      negativeProof: false,
      declaredQuantity: 50_000,
      remainingTokensHeader: 80_000,
      trustSignals: { sharedKey: true, grayMarket: true },
    });
    expect(result.capabilityScore).toBeGreaterThan(0.5);
    expect(result.trustScore).toBeGreaterThanOrEqual(0.8);
    expect(result.terminalOutcome).toBe("REVIEW");
    expect(result.terminalOutcome).not.toBe("FAIL");
  });
});
