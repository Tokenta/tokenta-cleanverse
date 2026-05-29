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
      if (
        ev.type !== "step_completed" &&
        ev.type !== "step_failed" &&
        ev.type !== "job_completed" &&
        ev.type !== "job_failed"
      ) {
        continue;
      }
      const step = ev.step ?? "FINALIZE";
      let result: string;
      if (ev.type === "step_failed") {
        result = ev.proof?.failureCode ?? "FAIL";
      } else if (ev.type === "job_failed") {
        result = ev.proof?.failureCode ?? ev.proof?.terminalOutcome ?? "FAIL";
      } else if (ev.type === "step_completed") {
        result =
          ev.message?.toLowerCase().includes("failed") === true
            ? (ev.proof?.failureCode ?? "FAIL")
            : "PASS";
      } else {
        result =
          ev.proof?.terminalOutcome === "PASS"
            ? "PASS"
            : ev.proof?.terminalOutcome ?? "PASS";
      }
      const latencyMs = ev.proof?.probeManifest?.[0]?.latencyMs;
      rows.push({
        ts: ev.timestamp,
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
