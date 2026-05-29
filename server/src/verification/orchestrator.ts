/** Runs L1-L3 pipeline per mechanism v0.4 */

import type {
  CostLiability,
  ProbeRecord,
  VerificationProof,
} from "../types/verification.js";
import { computeProbeEnvelope } from "./envelope.js";
import * as budget from "./budget-enforcer.js";
import { globalLockStore } from "./lock-store.js";
import { globalCacheStore, buildCacheKey, buildScopedCacheKey } from "./cache-store.js";
import { getEquivalentModel } from "./model-pin-registry.js";
import { keyFingerprint } from "./fingerprint.js";
import { scoreVerification, parseRateHeadroom } from "./asset-scorer.js";
import {
  defaultProbeModel,
  resolveProbeModelForProvider,
  runLiveness,
  runMicroProbe,
} from "./providers/router.js";
import { applyBuybackStrictGate, buybackFailureFromScores } from "./buyback-gate.js";
import { isBlacklistedFingerprint } from "./blacklist.js";
import { checkAbuseBeforeJob, recordJobStarted, recordMicroProbes } from "./abuse-guard.js";
import { listingStore } from "../listings/store.js";
import { runKeyRotationJob } from "./rotation-runner.js";
import { canRunScheduledL2, recordL2Probe } from "./l2-cadence.js";
import { isUserTriggeredContext } from "./buyer-verify-policy.js";
import { withProviderSlot } from "../jobs/provider-limiter.js";
import { assessPlatformRisk } from "./platform-risk.js";
import { appendAttestationProbes } from "./attestation-probes.js";
import { buildProof, buildFailedProof, finishFail } from "./proof-build.js";
import { resolveOpenAiCompatibleBaseUrl } from "./providers/openai-base.js";
import type { RunJobInput, StepCallback } from "./job-input.js";

export type { RunJobInput, StepCallback } from "./job-input.js";
export { finishFail, buildProof, buildFailedProof } from "./proof-build.js";

const MOCK_MODE = process.env.VERIFICATION_MOCK === "true";

function shouldRunL1Only(input: RunJobInput): boolean {
  if (input.context === "LIVE" || input.l1Only) return true;
  if (input.costLiability === "PLATFORM_SUBSIDIZED") return true;
  // LISTING_DRAFT always runs L2 so sellers get a capacity-backed PASS, not L1-only DEGRADED.
  return false;
}

export async function runVerificationJob(input: RunJobInput): Promise<VerificationProof> {
  if (input.context === "KEY_ROTATION") {
    return runKeyRotationJob(input, runStandardVerification);
  }
  return runStandardVerification(input);
}

export async function runStandardVerification(input: RunJobInput): Promise<VerificationProof> {
  const fp = keyFingerprint(input.apiKey);
  const envelope = computeProbeEnvelope(input.declaredQuantity);

  const costLiability: CostLiability =
    input.context === "PRE_PURCHASE"
      ? (input.costLiability ?? "BUYER_TRIGGERED")
      : (input.costLiability ?? "SELLER_PAID");

  if (input.context === "PRE_PURCHASE" && !input.payerPaysFee) {
    return buildFailedProof(
      input,
      fp,
      envelope,
      costLiability,
      "VERIFICATION_FEE_UNPAID",
      "Buyer verification fee must be paid before L2 probes",
    );
  }

  if (isBlacklistedFingerprint(fp)) {
    return buildFailedProof(
      input,
      fp,
      envelope,
      costLiability,
      "BLACKLIST_KEY",
      "API key fingerprint is blocklisted",
    );
  }

  const abuse = checkAbuseBeforeJob(fp, false);
  if (!abuse.allowed) {
    return buildFailedProof(input, fp, envelope, costLiability, abuse.code, abuse.message);
  }
  recordJobStarted(fp);

  const sharedKey = listingStore.isSharedKeySuspected(fp, input.listingId);
  const accessMethod = "DIRECT_KEY";

  const lockState = globalLockStore.get(fp);
  if (!globalLockStore.canProbeL2(fp, false) && lockState === "TERMINAL_FAIL_LOCKED") {
    return buildFailedProof(input, fp, envelope, costLiability, "VERIFICATION_LOCKED", "Key locked from prior failure");
  }

  let probeModelId = defaultProbeModel(input.provider, input.claimedModel);
  const baseCacheKey = buildCacheKey(
    input.provider,
    fp,
    accessMethod,
    input.declaredQuantity,
    probeModelId,
  );
  const cacheKey = buildScopedCacheKey(baseCacheKey, input.orderId, input.buyerId);
  const cached = globalCacheStore.get(cacheKey);
  if (cached) {
    input.onStep?.("CONNECTIVITY", "Cache hit — skipped probes");
    input.onStep?.("FINALIZE", "Returning cached proof");
    return cached;
  }

  globalLockStore.set(fp, "PROBE_ALLOWED");

  const probes: ProbeRecord[] = [];
  let accumulatedTokens = 0;
  let probeCallCount = 0;
  let livenessCallCount = 0;
  let fallbackUsed = false;

  const budgetState = (): budget.BudgetState => ({
    probeCallCount,
    livenessCallCount,
    accumulatedTokens,
    probeModelId,
    lockState: globalLockStore.get(fp),
    cooldownActive: globalLockStore.get(fp) === "COOLDOWN_LOCKED",
  });

  input.onStep?.(
    "CONNECTIVITY",
    `L1 probe → ${resolveOpenAiCompatibleBaseUrl(input.provider, input.compatibleBaseUrl, input.providerSlug)} (${input.providerSlug ?? input.provider})`,
  );
  const l1Deny = budget.canRunLiveness(budgetState(), envelope);
  if (l1Deny) {
    return finishFail(input, fp, envelope, costLiability, probes, probeModelId, fallbackUsed, "VERIFICATION_REFUSED_UNSAFE", l1Deny);
  }

  livenessCallCount++;
  const probeCtx = {
    apiKey: input.apiKey,
    probeModelId,
    maxTokens: envelope.maxTokensPerProbe,
    mock: MOCK_MODE,
    provider: input.provider,
    compatibleBaseUrl: input.compatibleBaseUrl,
    providerSlug: input.providerSlug,
    l1Strategy: input.l1Strategy,
  };
  let l1;
  try {
    l1 = await withProviderSlot(() => runLiveness(input.provider, probeCtx));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finishFail(
      input,
      fp,
      envelope,
      costLiability,
      probes,
      probeModelId,
      fallbackUsed,
      "NETWORK_UNREACHABLE",
      msg,
    );
  }
  probes.push(l1.record);

  if (!l1.ok) {
    globalLockStore.applyFailure(fp, l1.errorCode ?? "INVALID_KEY");
    const probeBase = resolveOpenAiCompatibleBaseUrl(
      input.provider,
      input.compatibleBaseUrl,
      input.providerSlug,
    );
    const detail =
      l1.errorCode === "NETWORK_UNREACHABLE"
        ? `Provider endpoint unreachable at ${probeBase} — check VPN, firewall, or base URL`
        : humanizeOpenAiCompatibleError(
            l1.errorCode ?? "INVALID_KEY",
            probeBase,
            l1.record.endpoint,
          );
    return finishFail(
      input,
      fp,
      envelope,
      costLiability,
      probes,
      probeModelId,
      fallbackUsed,
      l1.errorCode ?? "INVALID_KEY",
      detail,
    );
  }

  probeModelId = resolveProbeModelForProvider(input.provider, input.claimedModel, l1.modelIds);
  globalLockStore.set(fp, "L2_LOCKED");

  let l2Pass = false;
  let l2Skipped = false;
  let negativeProof = false;
  // Seed rateHeaders from L1 chat probe if available (spec §7 step 5 pre-L2 check).
  let rateHeaders: Record<string, string> = l1.headers ?? {};
  let remainingTokens: number | null = null;

  // Pre-L2 quota signal: if L1 response already shows remaining-tokens = 0,
  // skip the micro-probe and immediately signal QUOTA_EXHAUSTED (spec §7 step 5).
  const l1RemTok = rateHeaders["x-ratelimit-remaining-tokens"] ??
    rateHeaders["anthropic-ratelimit-tokens-remaining"];
  if (l1RemTok !== undefined && parseFloat(l1RemTok) === 0) {
    input.onStep?.("QUOTA", "Pre-L2 header check: remaining-tokens=0 — skipping micro-probe");
    negativeProof = true;
    globalLockStore.applyFailure(fp, "QUOTA_EXHAUSTED");
    return finishFail(
      input, fp, envelope, costLiability, probes, probeModelId, fallbackUsed,
      "QUOTA_EXHAUSTED",
      "Rate-limit header shows zero remaining tokens. Account balance or quota is exhausted.",
    );
  }

  const l1Only = shouldRunL1Only(input);
  const estProbeTokens = envelope.maxTokensPerProbe + 22;
  const l2Deny = l1Only ? "L1_ONLY_POLICY" : budget.canRunMicroProbe(budgetState(), envelope, estProbeTokens);

  if (l1Only) {
    l2Skipped = true;
    input.onStep?.("QUOTA", "L2 skipped — L1-only policy (LIVE / platform subsidized)");
  } else if (!l1Only) {
    const manualTrigger =
      isUserTriggeredContext(input.context) && input.context !== "LIVE";
    const cadence = canRunScheduledL2(fp, {
      manualTrigger,
      forceL2: input.forceL2,
    });
    if (!cadence.allowed) {
      l2Skipped = true;
      input.onStep?.("QUOTA", "reason" in cadence ? cadence.reason : "L2 cadence limit");
    }
  }

  if (!l2Skipped && l2Deny === "ENVELOPE_EXCEEDED" && input.allowPartialVerify) {
    l2Skipped = true;
    input.onStep?.("QUOTA", "L2 skipped — partial verify");
  } else if (!l2Skipped && l2Deny) {
    if (l2Deny === "LOCK_BLOCKS_L2") {
      return finishFail(input, fp, envelope, costLiability, probes, probeModelId, fallbackUsed, "VERIFICATION_LOCKED", "L2 blocked by lock");
    }
    l2Skipped = true;
  } else if (!l2Skipped) {
    input.onStep?.("QUOTA", "L2 capacity sample");
    probeCallCount++;
    let l2 = await withProviderSlot(() =>
      runMicroProbe(input.provider, {
        apiKey: input.apiKey,
        probeModelId,
        maxTokens: envelope.maxTokensPerProbe,
        mock: MOCK_MODE,
        provider: input.provider,
        compatibleBaseUrl: input.compatibleBaseUrl,
        providerSlug: input.providerSlug,
        l1Strategy: input.l1Strategy,
      }),
    );
    probes.push(l2.record);
    accumulatedTokens += l2.tokensUsed;
    rateHeaders = l2.headers;

    if (!l2.ok && l2.errorCode === "MODEL_NOT_ENTITLED") {
      const pinProvider =
        input.provider === "openai_compatible" ? "openai" : input.provider;
      const equiv = getEquivalentModel(
        pinProvider as "openai" | "anthropic" | "google" | "openai_compatible",
        probeModelId,
      );
      if (equiv && probeCallCount < envelope.maxProbeCalls) {
        probeModelId = equiv;
        fallbackUsed = true;
        probeCallCount++;
        l2 = await withProviderSlot(() =>
          runMicroProbe(input.provider, {
            apiKey: input.apiKey,
            probeModelId: equiv,
            maxTokens: envelope.maxTokensPerProbe,
            mock: MOCK_MODE,
            provider: input.provider,
            compatibleBaseUrl: input.compatibleBaseUrl,
            providerSlug: input.providerSlug,
            l1Strategy: input.l1Strategy,
          }),
        );
        probes.push(l2.record);
        accumulatedTokens += l2.tokensUsed;
        rateHeaders = l2.headers;
      }
    }

    if (!l2.ok) {
      negativeProof = l2.errorCode === "QUOTA_EXHAUSTED";
      globalLockStore.applyFailure(fp, l2.errorCode ?? "QUOTA_EXHAUSTED");
      return finishFail(input, fp, envelope, costLiability, probes, probeModelId, fallbackUsed, l2.errorCode ?? "QUOTA_EXHAUSTED", "Capacity sample failed");
    }
    l2Pass = true;
    recordL2Probe(fp);
    // Merge L2 headers over L1 headers so the best available rate signal wins.
    rateHeaders = { ...rateHeaders, ...l2.headers };
    const rem =
      rateHeaders["x-ratelimit-remaining-tokens"] ??
      rateHeaders["anthropic-ratelimit-tokens-remaining"];
    if (rem) remainingTokens = parseFloat(rem);
    if (
      MOCK_MODE &&
      input.context === "TOKENTA_BUYBACK" &&
      input.declaredQuantity >= 50_000
    ) {
      remainingTokens = Math.floor(input.declaredQuantity * 0.12);
    }
  }

  input.onStep?.("RATE_LIMIT", "L3 rate signals (headers)");
  const rateNorm = parseRateHeadroom(rateHeaders);

  input.onStep?.("RISK_ANALYSIS", "L5 platform risk + scoring");
  const platformRisk = assessPlatformRisk({
    provider: input.provider,
    keyFingerprint: fp,
    context: input.context,
    sharedKey,
  });
  probes.push(platformRisk.l5Record);
  appendAttestationProbes(probes);

  if (platformRisk.blacklisted) {
    return finishFail(
      input,
      fp,
      envelope,
      costLiability,
      probes,
      probeModelId,
      fallbackUsed,
      "BLACKLIST_KEY",
      "Key fingerprint blacklisted",
    );
  }

  let scores = scoreVerification({
    l1Pass: true,
    l2Pass,
    l2Skipped,
    rateHeadroomNorm: rateNorm,
    repeatSampleOk: l2Pass && !l2Skipped,
    negativeProof,
    declaredQuantity: input.declaredQuantity,
    remainingTokensHeader: remainingTokens,
    trustSignals: platformRisk.trustSignals,
  });
  scores = applyBuybackStrictGate(scores, input.context);
  const buybackFail = buybackFailureFromScores(scores, input.context);

  try {
    recordMicroProbes(fp, probeCallCount);
  } catch {
    globalLockStore.applyCooldown(fp);
    return finishFail(
      input,
      fp,
      envelope,
      costLiability,
      probes,
      probeModelId,
      fallbackUsed,
      "VERIFICATION_ABUSE_COOLDOWN",
      "Probe limit exceeded for key",
    );
  }

  const proof = buildProof(
    input.jobId,
    input.declaredQuantity,
    fp,
    envelope,
    costLiability,
    probes,
    probeModelId,
    fallbackUsed,
    accumulatedTokens,
    livenessCallCount + probeCallCount,
    scores,
    false,
    buybackFail.code,
    buybackFail.message,
  );

  input.onStep?.("FINALIZE", `Outcome: ${scores.terminalOutcome}`);

  if (scores.terminalOutcome === "FAIL") {
    globalLockStore.applyFailure(fp, proof.failureCode ?? "QUOTA_EXHAUSTED");
  } else if (scores.terminalOutcome === "DEGRADED") {
    globalLockStore.applyDegraded(fp);
    globalCacheStore.put(cacheKey, proof, 300);
  } else if (scores.terminalOutcome === "PASS") {
    globalLockStore.applyPass(fp);
    globalCacheStore.put(cacheKey, proof, input.context === "PRE_PURCHASE" ? 300 : 1800);
  } else {
    globalCacheStore.put(cacheKey, proof, 300);
  }

  proof.verificationLockState = globalLockStore.get(fp);
  return proof;
}
