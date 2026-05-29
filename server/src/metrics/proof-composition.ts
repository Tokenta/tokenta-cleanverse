/**
 * F2.2 proof composition — derived from probe paradigms in finished jobs (engine §7.5).
 */

import type { StoredJob } from "../jobs/store.js";

export interface ProofCompositionBuckets {
  zkProofPct: number;
  teeAttestPct: number;
  signaturePct: number;
  quotaChkPct: number;
  connectivityPct: number;
  throughputPerSec: number;
}

export interface ProofCompositionRow {
  key: string;
  label: string;
  pct: number;
  throughputPerSec: number;
}

const LABELS: Record<keyof Omit<ProofCompositionBuckets, "throughputPerSec">, string> = {
  connectivityPct: "Connectivity (L1)",
  zkProofPct: "ZK-PROOF (Compute)",
  teeAttestPct: "TEE Attestation",
  signaturePct: "Signature Chain",
  quotaChkPct: "Quota Check",
};

function bucketForParadigm(paradigm: string): keyof Omit<ProofCompositionBuckets, "throughputPerSec"> {
  if (paradigm === "A" || paradigm === "G") return "connectivityPct";
  if (paradigm === "L5" || paradigm === "ZK") return "zkProofPct";
  if (paradigm === "TEE") return "teeAttestPct";
  if (paradigm === "F") return "signaturePct";
  if (paradigm === "C") return "quotaChkPct";
  return "signaturePct";
}

export function computeProofComposition(
  jobs: StoredJob[],
  windowMs = 3600_000,
): ProofCompositionBuckets & { rows: ProofCompositionRow[] } {
  const cutoff = Date.now() - windowMs;
  const counts = {
    connectivityPct: 0,
    zkProofPct: 0,
    teeAttestPct: 0,
    signaturePct: 0,
    quotaChkPct: 0,
  };
  let finishedInWindow = 0;

  for (const job of jobs) {
    if (job.status !== "PASSED" && job.status !== "FAILED") continue;
    const completed = job.completedAt ? new Date(job.completedAt).getTime() : 0;
    if (completed && completed < cutoff) continue;
    finishedInWindow++;
    for (const probe of job.proof?.probeManifest ?? []) {
      if (probe.result === "SKIP") continue;
      const bucket = bucketForParadigm(probe.paradigm);
      counts[bucket]++;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const buckets: ProofCompositionBuckets = {
    connectivityPct: pct(counts.connectivityPct),
    zkProofPct: pct(counts.zkProofPct),
    teeAttestPct: pct(counts.teeAttestPct),
    signaturePct: pct(counts.signaturePct),
    quotaChkPct: pct(counts.quotaChkPct),
    throughputPerSec:
      finishedInWindow > 0 && windowMs > 0
        ? Number((finishedInWindow / (windowMs / 1000)).toFixed(2))
        : 0,
  };

  const rows: ProofCompositionRow[] = (
    Object.keys(LABELS) as (keyof typeof LABELS)[]
  ).map((k) => ({
    key: k,
    label: LABELS[k],
    pct: buckets[k],
    throughputPerSec: buckets.throughputPerSec,
  }));

  return { ...buckets, rows };
}
