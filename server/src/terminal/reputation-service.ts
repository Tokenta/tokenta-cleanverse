import { listAudit, type AuditEntry } from "../security/audit-log.js";
import { jobStore } from "../jobs/store.js";
import { listingStore } from "../listings/store.js";
import { listProofAnchors } from "../verification/proof-anchor.js";

/** Proof-weighted execution trust — Tokenta Trust Layer (F5). */
export const REPUTATION_BASE_INTERNAL = 50;
export const REPUTATION_MIN_VERIFICATIONS = 3;
export const REPUTATION_MIN_ANCHORED = 1;

export type ReputationStatus = "UNVERIFIED" | "VERIFIED";
export type ReputationTier = "NONE" | "C" | "B" | "A" | "S";
export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH";

export interface ReputationFactor {
  key: string;
  label: string;
  weightPct: number;
  score: number | null;
}

export interface ReputationScoreView {
  status: ReputationStatus;
  tier: ReputationTier;
  composite: number | null;
  compositeDisplay: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  internalScore: number;
  percentileLabel: string | null;
  factors: ReputationFactor[];
  executionHistory: {
    verifiedRuns: number;
    anchoredReceipts: number;
    completedVerifications: number;
  };
  nextMilestone: string;
  complianceScore: number | null;
  compliance: {
    riskFactors: string[];
    positiveFactors: string[];
  };
}

export interface ReputationLedgerRow {
  ts: string;
  occurredAt: string;
  actor: string;
  event: string;
  delta: string;
  score: string;
}

const FACTOR_WEIGHTS: { key: string; label: string; weightPct: number }[] = [
  { key: "EXEC-RELIABILITY", label: "Execution Reliability", weightPct: 35 },
  { key: "VERIFY-INTEGRITY", label: "Verification Integrity", weightPct: 25 },
  { key: "SETTLEMENT", label: "Settlement Integrity", weightPct: 20 },
  { key: "OPS-STABILITY", label: "Operational Stability", weightPct: 10 },
  { key: "TENURE", label: "Historical Tenure", weightPct: 10 },
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function logScaledDelta(baseDelta: number, priorEvents: number): number {
  return baseDelta / (1 + Math.log10(Math.max(1, priorEvents)));
}

function tierFromComposite(composite: number): ReputationTier {
  if (composite >= 92) return "S";
  if (composite >= 85) return "A";
  if (composite >= 75) return "B";
  return "C";
}

function confidenceFromSignals(signals: {
  anchored: number;
  passVerifications: number;
  escrowReleases: number;
  tenureDays: number;
}): { level: ConfidenceLevel; score: number } {
  const raw =
    signals.anchored * 18 +
    signals.passVerifications * 4 +
    signals.escrowReleases * 6 +
    Math.min(signals.tenureDays, 365) * 0.05;
  const score = clamp(Math.round(raw), 0, 100);
  let level: ConfidenceLevel = "LOW";
  if (score >= 75) level = "VERY HIGH";
  else if (score >= 50) level = "HIGH";
  else if (score >= 25) level = "MEDIUM";
  return { level, score };
}

function decayMultiplier(lastActivityIso: string | null): number {
  if (!lastActivityIso) return 1;
  const days = (Date.now() - new Date(lastActivityIso).getTime()) / 86_400_000;
  if (days >= 90) return 0.92;
  if (days >= 30) return 0.97;
  return 1;
}

interface TrustSignals {
  finished: ReturnType<typeof jobStore.listJobs>;
  passed: number;
  failed: number;
  anchored: number;
  bindCount: number;
  escrowFund: number;
  escrowRelease: number;
  listings: number;
  lastActivity: string | null;
}

function collectTrustSignals(): TrustSignals {
  const jobs = jobStore.listJobs();
  const finished = jobs.filter((j) => j.status === "PASSED" || j.status === "FAILED");
  const passed = finished.filter((j) => j.proof?.terminalOutcome === "PASS").length;
  const failed = finished.length - passed;
  const anchored = listProofAnchors().filter((a) => a.status === "ANCHORED").length;
  const bindCount = listAudit(200, "BIND_VERIFICATION").length;
  const escrowFund = listAudit(200, "ESCROW_FUND").length;
  const escrowRelease = listAudit(200, "ESCROW_RELEASE").length;
  const listings = listingStore.listLive().length;

  const times = [
    ...finished.map((j) => j.completedAt ?? j.createdAt),
    ...listAudit(200).map((e) => e.at),
    ...listProofAnchors()
      .filter((a) => a.anchoredAt)
      .map((a) => a.anchoredAt!),
  ].filter(Boolean);
  const lastActivity = times.length ? times.sort().at(-1)! : null;

  return {
    finished,
    passed,
    failed,
    anchored,
    bindCount,
    escrowFund,
    escrowRelease,
    listings,
    lastActivity,
  };
}

function computeFactorScores(s: TrustSignals): ReputationFactor[] {
  const passRate = s.finished.length ? (s.passed / s.finished.length) * 100 : 0;
  const execReliability = clamp(
    55 + passRate * 0.35 + logScaledDelta(s.passed * 2, s.passed) - s.failed * 8,
    0,
    100,
  );
  const verifyIntegrity = clamp(
    50 + passRate * 0.4 + s.anchored * 5 + s.bindCount * 3,
    0,
    100,
  );
  const disputePenalty = Math.max(0, s.escrowFund - s.escrowRelease) * 5;
  const settlement = clamp(70 + s.escrowRelease * 4 - disputePenalty, 0, 100);
  const opsStability = clamp(75 + Math.min(s.listings, 10) * 2 + (s.passed > 0 ? 10 : 0), 0, 100);
  const tenure = clamp(50 + Math.min(s.finished.length * 4, 30) + Math.min(s.anchored * 3, 15), 0, 100);

  const scores = [execReliability, verifyIntegrity, settlement, opsStability, tenure];
  return FACTOR_WEIGHTS.map((f, i) => ({
    key: f.key,
    label: f.label,
    weightPct: f.weightPct,
    score: Number(scores[i]!.toFixed(1)),
  }));
}

function weightedComposite(factors: ReputationFactor[]): number {
  let sum = 0;
  let w = 0;
  for (const f of factors) {
    if (f.score == null) continue;
    sum += f.score * f.weightPct;
    w += f.weightPct;
  }
  return w ? Number((sum / w).toFixed(1)) : REPUTATION_BASE_INTERNAL;
}

function isReputationUnlocked(s: TrustSignals): boolean {
  return s.passed >= REPUTATION_MIN_VERIFICATIONS && s.anchored >= REPUTATION_MIN_ANCHORED;
}

interface LedgerEvent {
  occurredAt: string;
  actor: string;
  event: string;
  delta: number;
}

function buildLedgerEvents(): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  let idx = 0;

  for (const job of jobStore.listJobs()) {
    if (!job.proof) continue;
    const at = job.completedAt ?? job.createdAt;
    if (job.proof.terminalOutcome === "PASS") {
      events.push({
        occurredAt: at,
        actor: job.request.provider.toUpperCase(),
        event: "PASS-VERIFICATION",
        delta: logScaledDelta(1.2, idx++),
      });
    } else {
      events.push({
        occurredAt: at,
        actor: job.request.provider.toUpperCase(),
        event: "VERIFY-FAIL",
        delta: logScaledDelta(-4, idx++),
      });
    }
  }

  for (const anchor of listProofAnchors()) {
    if (anchor.status !== "ANCHORED" || !anchor.anchoredAt) continue;
    events.push({
      occurredAt: anchor.anchoredAt,
      actor: anchor.listingId?.slice(0, 12) ?? "ANCHOR",
      event: "ANCHORED-RECEIPT",
      delta: logScaledDelta(3, idx++),
    });
  }

  for (const entry of listAudit(200)) {
    const mapped = auditToLedgerEvent(entry, idx);
    if (mapped) {
      events.push(mapped.event);
      idx = mapped.nextIdx;
    }
  }

  return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

function auditToLedgerEvent(
  entry: AuditEntry,
  idx: number,
): { event: LedgerEvent; nextIdx: number } | null {
  const actor = entry.orderId?.slice(0, 12) ?? entry.listingId?.slice(0, 12) ?? "TOKENTA";
  if (entry.type === "BIND_VERIFICATION") {
    return {
      event: {
        occurredAt: entry.at,
        actor,
        event: "BIND-PROOF",
        delta: logScaledDelta(1, idx),
      },
      nextIdx: idx + 1,
    };
  }
  if (entry.type === "ESCROW_FUND") {
    return {
      event: {
        occurredAt: entry.at,
        actor,
        event: "ESCROW-FUND",
        delta: logScaledDelta(0.4, idx),
      },
      nextIdx: idx + 1,
    };
  }
  if (entry.type === "ESCROW_RELEASE") {
    return {
      event: {
        occurredAt: entry.at,
        actor,
        event: "ESCROW-SETTLED",
        delta: logScaledDelta(0.8, idx),
      },
      nextIdx: idx + 1,
    };
  }
  return null;
}

function replayInternalScore(events: LedgerEvent[], decay: number): number {
  let score = REPUTATION_BASE_INTERNAL;
  for (const ev of events) {
    score = clamp(score + ev.delta * decay, 0, 100);
  }
  return Number(score.toFixed(2));
}

export function buildReputationScore(walletAddress?: string | null): ReputationScoreView {
  const signals = collectTrustSignals();
  const unlocked = isReputationUnlocked(signals);
  const decay = decayMultiplier(signals.lastActivity);
  const ledgerEvents = buildLedgerEvents();
  const internalScore = replayInternalScore(ledgerEvents, decay);

  const rawFactors = computeFactorScores(signals);
  const compositeFromFactors = weightedComposite(rawFactors);
  const compositeBlended = Number(
    (compositeFromFactors * 0.6 + internalScore * 0.4).toFixed(1),
  );

  const { level: confidence, score: confidenceScore } = confidenceFromSignals({
    anchored: signals.anchored,
    passVerifications: signals.passed,
    escrowReleases: signals.escrowRelease,
    tenureDays: signals.finished.length,
  });

  const verifiedRuns = signals.passed;
  const nextMilestone = unlocked
    ? "Maintain anchored receipts and clean escrow settlement"
    : `Complete ${Math.max(0, REPUTATION_MIN_VERIFICATIONS - signals.passed)} more verification(s) and ${Math.max(0, REPUTATION_MIN_ANCHORED - signals.anchored)} anchored receipt(s)`;

  const walletLabel = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  if (!unlocked) {
    return {
      status: "UNVERIFIED",
      tier: "NONE",
      composite: null,
      compositeDisplay: "--",
      confidence,
      confidenceScore,
      internalScore: REPUTATION_BASE_INTERNAL,
      percentileLabel: null,
      factors: FACTOR_WEIGHTS.map((f) => ({
        key: f.key,
        label: f.label,
        weightPct: f.weightPct,
        score: null,
      })),
      executionHistory: {
        verifiedRuns,
        anchoredReceipts: signals.anchored,
        completedVerifications: signals.finished.length,
      },
      nextMilestone,
      complianceScore: null,
      compliance: {
        riskFactors: ["Insufficient execution history — reputation not yet computed"],
        positiveFactors: [
          verifiedRuns > 0
            ? `${verifiedRuns} verified run(s) recorded`
            : "Run your first verification to begin trust accumulation",
          signals.anchored > 0
            ? `${signals.anchored} anchored receipt(s) on file`
            : "Anchor a receipt to unlock composite trust score",
          walletLabel ? `Wallet ${walletLabel} linked` : "Connect wallet to bind trust vector",
        ].filter(Boolean),
      },
    };
  }

  const composite = compositeBlended;
  const tier = tierFromComposite(composite);
  const percentileLabel =
    tier === "S" ? "top 2%" : tier === "A" ? "top 8%" : tier === "B" ? "top 22%" : "building";

  return {
    status: "VERIFIED",
    tier,
    composite,
    compositeDisplay: composite.toFixed(1),
    confidence,
    confidenceScore,
    internalScore,
    percentileLabel,
    factors: rawFactors,
    executionHistory: {
      verifiedRuns,
      anchoredReceipts: signals.anchored,
      completedVerifications: signals.finished.length,
    },
    nextMilestone,
    complianceScore: clamp(composite - signals.failed * 3 + signals.anchored * 2, 0, 100),
    compliance: {
      riskFactors:
        signals.failed > 0
          ? [`${signals.failed} verification failure(s) (-${signals.failed * 3} compliance pts)`]
          : ["No active verification failures"],
      positiveFactors: [
        signals.anchored > 0
          ? `${signals.anchored} anchored receipt(s) (+proof-weighted trust)`
          : "",
        signals.passed > 0 ? `${signals.passed} PASS execution(s) on ledger` : "",
        signals.escrowRelease > 0 ? `${signals.escrowRelease} clean escrow release(s)` : "",
        walletLabel ? `Wallet ${walletLabel} linked` : "",
      ].filter(Boolean),
    },
  };
}

export function buildReputationLedger(limit = 50): ReputationLedgerRow[] {
  const decay = decayMultiplier(collectTrustSignals().lastActivity);
  const events = buildLedgerEvents();
  let running = REPUTATION_BASE_INTERNAL;
  const rows: ReputationLedgerRow[] = [];

  for (const ev of events) {
    running = clamp(running + ev.delta * decay, 0, 100);
    const d = ev.delta >= 0 ? `+${ev.delta.toFixed(2)}` : ev.delta.toFixed(2);
    rows.push({
      occurredAt: ev.occurredAt,
      ts: ev.occurredAt.slice(0, 16).replace("T", " "),
      actor: ev.actor,
      event: ev.event,
      delta: d,
      score: running.toFixed(2),
    });
  }

  return rows.reverse().slice(0, limit);
}
