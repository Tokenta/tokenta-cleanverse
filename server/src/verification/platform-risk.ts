/**
 * Mechanism L5 — platform heuristics without additional seller-key provider calls.
 */

import type { JobContext, ProviderKind, ProbeRecord } from "../types/verification.js";
import { abuseJobCount24h } from "./abuse-guard.js";
import { isBlacklistedFingerprint } from "./blacklist.js";

export interface PlatformRiskInput {
  provider: ProviderKind;
  keyFingerprint: string;
  context: JobContext;
  sharedKey: boolean;
}

export interface PlatformRiskAssessment {
  grayMarket: boolean;
  highVelocity: boolean;
  blacklisted: boolean;
  trustSignals: { sharedKey?: boolean; grayMarket?: boolean };
  l5Record: ProbeRecord;
}

export function assessPlatformRisk(input: PlatformRiskInput): PlatformRiskAssessment {
  const customLike =
    input.provider === "custom" || input.provider === "openai_compatible";
  const jobs24h = abuseJobCount24h(input.keyFingerprint);
  // highVelocity is flagged for ops visibility but does NOT contribute to grayMarket.
  // grayMarket (spec §9A.2) means custom/reseller endpoint, not repeated test submissions.
  // Conflating the two pushed trustScore above 0.8 for developers testing the same key
  // multiple times, causing spurious REVIEW outcomes.
  const highVelocity = jobs24h >= 5 && input.context !== "LIVE";
  const blacklisted = isBlacklistedFingerprint(input.keyFingerprint);
  const grayMarket = customLike;

  const flags: string[] = [];
  if (customLike) flags.push("CUSTOM_ENDPOINT");
  if (input.sharedKey) flags.push("SHARED_KEY");
  if (highVelocity) flags.push("HIGH_VERIFY_VELOCITY");
  if (blacklisted) flags.push("BLACKLIST");

  const l5Record: ProbeRecord = {
    paradigm: "L5",
    endpoint: "PLATFORM_RISK_HEURISTICS",
    probeModelId: "n/a",
    httpStatus: 200,
    latencyMs: 0,
    tokensUsed: 0,
    requestsUsed: 0,
    maxTokensUsed: 0,
    result: blacklisted ? "FAIL" : "PASS",
    timestamp: new Date().toISOString(),
    cached: false,
    errorCode: flags.length ? flags.join(",") : undefined,
  };

  return {
    grayMarket,
    highVelocity,
    blacklisted,
    trustSignals: {
      sharedKey: input.sharedKey,
      grayMarket: grayMarket || undefined,
    },
    l5Record,
  };
}
