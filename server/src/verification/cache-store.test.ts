import { beforeEach, describe, expect, it } from "vitest";
import { VerificationCacheStore, buildCacheKey } from "./cache-store.js";
import { listAudit, resetAuditForTest } from "../security/audit-log.js";
import type { VerificationProof } from "../types/verification.js";

function stubProof(): VerificationProof {
  return {
    jobId: "vj_test",
    terminalOutcome: "PASS",
    capabilityScore: 0.8,
    trustScore: 0.1,
    complianceScore: 0.1,
    executionCapacityBand: "SUFFICIENT",
    confidence: "MEDIUM",
    estimatedExecutableQuantityRange: { min: 1000, max: 10000, band: "SMALL_1K_10K", unit: "tokens" },
    declaredAlignment: "CONSISTENT",
    declaredQuantity: 5000,
    probeModelId: "gpt-4o-mini",
    fallbackUsed: false,
    costLiability: "SELLER_PAID",
    verificationLockState: "UNLOCKED",
    probeManifest: [],
    totalTokensUsed: 10,
    totalRequestsUsed: 1,
    operationalEnvelopeLimit: 300,
    consentDisclosureCeiling: 300,
    cacheHit: false,
    proofHash: "0xabc",
    completedAt: new Date().toISOString(),
  };
}

describe("cache-store audit", () => {
  beforeEach(() => resetAuditForTest());

  it("records CACHE_INVALIDATE on fingerprint purge", () => {
    const store = new VerificationCacheStore();
    const fp = "fp_cache_audit";
    const key = buildCacheKey("openai", fp, "DIRECT_KEY", 5000, "gpt-4o-mini");
    store.put(key, stubProof(), 300);
    store.invalidateByFingerprint(fp);
    expect(listAudit(5).some((e) => e.type === "CACHE_INVALIDATE")).toBe(true);
  });
});
