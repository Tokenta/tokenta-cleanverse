import { describe, expect, it } from "vitest";
import { computeProofComposition } from "./proof-composition.js";
import type { StoredJob } from "../jobs/store.js";

function jobWithParadigms(paradigms: string[]): StoredJob {
  return {
    id: "vj_test",
    status: "PASSED",
    request: { apiKey: "", declaredQuantity: 1000, provider: "openai" },
    stepsCompleted: 5,
    stepsTotal: 5,
    events: [],
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    proof: {
      jobId: "vj_test",
      terminalOutcome: "PASS",
      capabilityScore: 0.9,
      trustScore: 0.9,
      complianceScore: 0.9,
      executionCapacityBand: "SUFFICIENT",
      confidence: "HIGH",
      estimatedExecutableQuantityRange: { min: 100, max: 200, band: "SMALL_1K_10K", unit: "tokens" },
      declaredAlignment: "CONSISTENT",
      declaredQuantity: 1000,
      probeModelId: "gpt-4o-mini",
      fallbackUsed: false,
      costLiability: "SELLER_PAID",
      verificationLockState: "UNLOCKED",
      probeManifest: paradigms.map((paradigm) => ({
        paradigm,
        endpoint: "/test",
        probeModelId: "m",
        httpStatus: 200,
        latencyMs: 10,
        tokensUsed: 1,
        requestsUsed: 1,
        maxTokensUsed: 1,
        result: "PASS" as const,
        timestamp: new Date().toISOString(),
        cached: false,
      })),
      totalTokensUsed: 10,
      totalRequestsUsed: paradigms.length,
      operationalEnvelopeLimit: 100,
      consentDisclosureCeiling: 100,
      cacheHit: false,
      proofHash: "0xabc",
      completedAt: new Date().toISOString(),
    },
  };
}

describe("proof-composition", () => {
  it("maps paradigms to composition buckets", () => {
    const r = computeProofComposition([
      jobWithParadigms(["A", "C", "L5", "F"]),
    ]);
    expect(r.zkProofPct).toBe(25);
    expect(r.teeAttestPct).toBe(25);
    expect(r.quotaChkPct).toBe(25);
    expect(r.signaturePct).toBe(25);
    expect(r.rows).toHaveLength(4);
  });
});
