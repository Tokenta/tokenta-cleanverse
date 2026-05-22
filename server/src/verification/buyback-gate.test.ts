import { describe, expect, it } from "vitest";
import { applyBuybackStrictGate, buybackFailureFromScores } from "./buyback-gate.js";
import type { ScoreResult } from "./asset-scorer.js";

const base: ScoreResult = {
  capabilityScore: 0.7,
  trustScore: 0.1,
  complianceScore: 0.1,
  executionCapacityBand: "SUFFICIENT",
  confidence: "HIGH",
  estimatedExecutableQuantityRange: { min: 1000, max: 10000, band: "SMALL_1K_10K", unit: "tokens" },
  declaredAlignment: "OVERCLAIMED",
  terminalOutcome: "PASS",
};

describe("buyback-gate", () => {
  it("FAIL + QUANTITY_MISMATCH on HIGH confidence OVERCLAIMED", () => {
    const s = applyBuybackStrictGate(base, "TOKENTA_BUYBACK");
    expect(s.terminalOutcome).toBe("FAIL");
    const fail = buybackFailureFromScores(s, "TOKENTA_BUYBACK");
    expect(fail.code).toBe("QUANTITY_MISMATCH");
  });

  it("REVIEW on MEDIUM confidence OVERCLAIMED", () => {
    const s = applyBuybackStrictGate({ ...base, confidence: "MEDIUM" }, "TOKENTA_BUYBACK");
    expect(s.terminalOutcome).toBe("REVIEW");
  });

  it("no change for LISTING_DRAFT", () => {
    const s = applyBuybackStrictGate(base, "LISTING_DRAFT");
    expect(s.terminalOutcome).toBe("PASS");
  });
});
