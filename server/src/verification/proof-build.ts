import type { CostLiability, ProbeRecord, VerificationProof } from "../types/verification.js";
import { computeProbeEnvelope } from "./envelope.js";
import { globalLockStore } from "./lock-store.js";
import { proofHash } from "./fingerprint.js";
import { scoreVerification } from "./asset-scorer.js";
import type { RunJobInput } from "./job-input.js";

export function buildProof(
  jobId: string,
  declaredQuantity: number,
  fp: string,
  envelope: ReturnType<typeof computeProbeEnvelope>,
  costLiability: CostLiability,
  probes: ProbeRecord[],
  probeModelId: string,
  fallbackUsed: boolean,
  totalTokens: number,
  totalRequests: number,
  scores: ReturnType<typeof scoreVerification>,
  cacheHit: boolean,
  failureCode?: string,
  failureMessage?: string,
): VerificationProof {
  const payload = {
    jobId,
    scores,
    probes: probes.map((p) => ({ e: p.endpoint, t: p.tokensUsed })),
  };
  return {
    jobId,
    terminalOutcome: scores.terminalOutcome,
    capabilityScore: scores.capabilityScore,
    trustScore: scores.trustScore,
    complianceScore: scores.complianceScore,
    executionCapacityBand: scores.executionCapacityBand,
    confidence: scores.confidence,
    estimatedExecutableQuantityRange: scores.estimatedExecutableQuantityRange,
    declaredAlignment: scores.declaredAlignment,
    declaredQuantity,
    probeModelId,
    fallbackUsed,
    costLiability,
    verificationLockState: globalLockStore.get(fp),
    failureCode,
    failureMessage,
    probeManifest: probes,
    totalTokensUsed: totalTokens,
    totalRequestsUsed: totalRequests,
    operationalEnvelopeLimit: envelope.operationalMaxProbeTokens,
    consentDisclosureCeiling: envelope.consentDisclosureCeiling,
    cacheHit,
    proofHash: proofHash(payload),
    completedAt: new Date().toISOString(),
  };
}

export function finishFail(
  input: RunJobInput,
  fp: string,
  envelope: ReturnType<typeof computeProbeEnvelope>,
  costLiability: CostLiability,
  probes: ProbeRecord[],
  probeModelId: string,
  fallbackUsed: boolean,
  failureCode: string,
  failureMessage: string,
): VerificationProof {
  const scores = scoreVerification({
    l1Pass: false,
    l2Pass: false,
    l2Skipped: true,
    rateHeadroomNorm: 0,
    repeatSampleOk: false,
    negativeProof: true,
    declaredQuantity: input.declaredQuantity,
    trustSignals: {},
  });
  return buildProof(
    input.jobId,
    input.declaredQuantity,
    fp,
    envelope,
    costLiability,
    probes,
    probeModelId,
    fallbackUsed,
    probes.reduce((s, p) => s + p.tokensUsed, 0),
    probes.length,
    { ...scores, terminalOutcome: "FAIL" },
    false,
    failureCode,
    failureMessage,
  );
}

export function buildFailedProof(
  input: RunJobInput,
  fp: string,
  envelope: ReturnType<typeof computeProbeEnvelope>,
  costLiability: CostLiability,
  code: string,
  msg: string,
): VerificationProof {
  return finishFail(
    input,
    fp,
    envelope,
    costLiability,
    [],
    input.claimedModel ?? "gpt-4o-mini",
    false,
    code,
    msg,
  );
}
