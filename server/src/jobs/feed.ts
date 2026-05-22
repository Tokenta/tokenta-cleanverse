import { jobStore } from "./store.js";

export interface VerifyFeedRow {
  ts: string;
  asset: string;
  step: string;
  hash: string;
  result: string;
  latency: string;
  method: string;
  jobId: string;
}

export function buildVerifyFeed(limit = 50): VerifyFeedRow[] {
  const rows: VerifyFeedRow[] = [];

  for (const job of jobStore.listJobs()) {
    const asset = job.listingId?.slice(-8).toUpperCase() ?? job.id.slice(-8).toUpperCase();
    const method = "DIRECT_KEY_TEST";

    for (const ev of job.events) {
      if (ev.type !== "step_completed" && ev.type !== "job_completed" && ev.type !== "job_failed") {
        continue;
      }
      const step = ev.step ?? "FINALIZE";
      const result =
        ev.type === "job_failed"
          ? "FAIL"
          : ev.proof?.terminalOutcome === "PASS"
            ? "PASS"
            : ev.proof?.terminalOutcome ?? "PENDING";
      const latencyMs = ev.proof?.probeManifest?.[0]?.latencyMs;
      rows.push({
        ts: formatTs(ev.timestamp),
        asset: `LST-${asset}`,
        step,
        hash: ev.proof?.proofHash
          ? `${ev.proof.proofHash.slice(0, 6)}…${ev.proof.proofHash.slice(-4)}`
          : "—",
        result: String(result),
        latency: latencyMs != null ? `${latencyMs}ms` : "—",
        method,
        jobId: job.id,
      });
    }
  }

  return rows.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, limit);
}

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toTimeString().slice(0, 12);
  } catch {
    return iso;
  }
}
