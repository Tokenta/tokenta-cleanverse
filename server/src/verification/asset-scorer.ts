/** Mechanism spec §6.2, §9A, §9B */

import type {
  DeclaredAlignment,
  EstimatedExecutableQuantityRange,
  ExecutionCapacityBand,
  ProbeRecord,
  TerminalOutcome,
} from "../types/verification.js";

export interface ScoreInput {
  l1Pass: boolean;
  l2Pass: boolean;
  l2Skipped: boolean;
  rateHeadroomNorm: number;
  repeatSampleOk: boolean;
  negativeProof: boolean;
  declaredQuantity: number;
  remainingTokensHeader?: number | null;
  trustSignals: { sharedKey?: boolean; grayMarket?: boolean };
}

export interface ScoreResult {
  capabilityScore: number;
  trustScore: number;
  complianceScore: number;
  executionCapacityBand: ExecutionCapacityBand;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  estimatedExecutableQuantityRange: EstimatedExecutableQuantityRange;
  declaredAlignment: DeclaredAlignment;
  terminalOutcome: TerminalOutcome;
}

export function computeCapabilityScore(input: ScoreInput): number {
  if (input.negativeProof) return 0.1;
  let score = 0;
  if (input.l1Pass) score += 0.15;
  if (input.l2Pass) score += 0.35;
  else if (input.l2Skipped && input.l1Pass) score += 0.2;
  score += input.rateHeadroomNorm * 0.15;
  if (input.repeatSampleOk) score += 0.1;
  return Math.min(1, score);
}

export function computeTrustScore(signals: ScoreInput["trustSignals"]): number {
  let t = 0.1;
  if (signals.sharedKey) t += 0.5;
  if (signals.grayMarket) t += 0.35;
  return Math.min(1, t);
}

export function computeComplianceScore(grayMarket: boolean): number {
  return grayMarket ? 0.6 : 0.1;
}

function bandFromScore(score: number): ExecutionCapacityBand {
  if (score < 0.25) return "INSUFFICIENT";
  if (score < 0.5) return "UNKNOWN";
  if (score < 0.8) return "SUFFICIENT";
  return "ABUNDANT";
}

export function computeQuantityRange(
  capabilityScore: number,
  declaredQuantity: number,
  l2Pass: boolean,
  remainingTokens?: number | null,
): { range: EstimatedExecutableQuantityRange; alignment: DeclaredAlignment } {
  const unit = "tokens";

  if (!l2Pass) {
    return {
      range: { min: null, max: null, band: "UNKNOWN", unit },
      alignment: "UNVERIFIABLE",
    };
  }

  let range: EstimatedExecutableQuantityRange = {
    min: 1_000,
    max: 10_000,
    band: "SMALL_1K_10K",
    unit,
  };

  if (remainingTokens != null && remainingTokens > 0) {
    if (remainingTokens >= declaredQuantity * 0.5) {
      range = bandForDeclared(declaredQuantity);
    } else {
      range = {
        min: 0,
        max: Math.max(remainingTokens, 1000),
        band: "MICRO_0_1K",
        unit,
      };
    }
  }

  const alignment = inferAlignment(declaredQuantity, range);
  if (capabilityScore >= 0.8 && range.band !== "UNKNOWN") {
    return { range: narrowRange(range, declaredQuantity), alignment };
  }
  return { range, alignment };
}

function bandForDeclared(q: number): EstimatedExecutableQuantityRange {
  if (q < 1_000) return { min: 0, max: 1_000, band: "MICRO_0_1K", unit: "tokens" };
  if (q < 10_000) return { min: 1_000, max: 10_000, band: "SMALL_1K_10K", unit: "tokens" };
  if (q < 100_000) return { min: 10_000, max: 100_000, band: "MEDIUM_10K_100K", unit: "tokens" };
  if (q < 1_000_000) return { min: 100_000, max: 1_000_000, band: "LARGE_100K_1M", unit: "tokens" };
  return { min: 1_000_000, max: null, band: "XL_1M_PLUS", unit: "tokens" };
}

function narrowRange(
  r: EstimatedExecutableQuantityRange,
  declared: number,
): EstimatedExecutableQuantityRange {
  const d = bandForDeclared(declared);
  return {
    min: r.min != null && d.min != null ? Math.min(r.min, d.min) : r.min,
    max: r.max != null && d.max != null ? Math.max(r.max, d.max) : d.max ?? r.max,
    band: d.band,
    unit: r.unit,
  };
}

function inferAlignment(
  declared: number,
  range: EstimatedExecutableQuantityRange,
): DeclaredAlignment {
  if (range.band === "UNKNOWN") return "UNVERIFIABLE";
  if (range.max != null && declared > range.max * 1.2) return "OVERCLAIMED";
  if (range.min != null && declared < range.min * 0.5) return "UNDERCLAIMED";
  return "CONSISTENT";
}

export function composeTerminalOutcome(
  hardFail: boolean,
  capabilityScore: number,
  trustScore: number,
  complianceScore: number,
  l2Skipped: boolean,
): TerminalOutcome {
  if (hardFail) return "FAIL";
  if (l2Skipped || (capabilityScore >= 0.25 && capabilityScore < 0.5)) return "DEGRADED";
  if (trustScore >= 0.8 || complianceScore >= 0.8) return "REVIEW";
  if (capabilityScore >= 0.5) return "PASS";
  if (capabilityScore < 0.25) return "FAIL";
  return "DEGRADED";
}

export function scoreVerification(input: ScoreInput): ScoreResult {
  const capabilityScore = computeCapabilityScore(input);
  const trustScore = computeTrustScore(input.trustSignals);
  const complianceScore = computeComplianceScore(!!input.trustSignals.grayMarket);
  const executionCapacityBand = bandFromScore(capabilityScore);
  const { range, alignment } = computeQuantityRange(
    capabilityScore,
    input.declaredQuantity,
    input.l2Pass,
    input.remainingTokensHeader,
  );

  let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (input.repeatSampleOk && capabilityScore > 0.8) confidence = "HIGH";
  else if (input.l2Pass && capabilityScore >= 0.55) confidence = "MEDIUM";

  const hardFail = input.negativeProof;
  const terminalOutcome = composeTerminalOutcome(
    hardFail,
    capabilityScore,
    trustScore,
    complianceScore,
    input.l2Skipped,
  );

  return {
    capabilityScore,
    trustScore,
    complianceScore,
    executionCapacityBand,
    confidence,
    estimatedExecutableQuantityRange: range,
    declaredAlignment: alignment,
    terminalOutcome,
  };
}

export function parseRateHeadroom(headers: Record<string, string>): number {
  const rem = headers["x-ratelimit-remaining-tokens"];
  const lim = headers["x-ratelimit-limit-tokens"];
  if (rem && lim) {
    const r = parseFloat(rem);
    const l = parseFloat(lim);
    if (l > 0) return Math.min(1, r / l);
  }
  const remReq = headers["x-ratelimit-remaining-requests"];
  const limReq = headers["x-ratelimit-limit-requests"];
  if (remReq && limReq) {
    const r = parseFloat(remReq);
    const l = parseFloat(limReq);
    if (l > 0) return Math.min(1, r / l);
  }
  return 0.3;
}
