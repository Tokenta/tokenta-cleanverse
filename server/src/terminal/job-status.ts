import type { StoredJob } from "../jobs/store.js";
import { getProofAnchor } from "../verification/proof-anchor.js";
import { getSettlementNetworkConfig } from "./network-config.js";
import type { TerminalJobStatus } from "./types.js";

export function terminalJobIdFromEngine(jobId: string): string {
  return jobId.startsWith("tjob_") ? jobId : `tjob_${jobId}`;
}

export function resolveEngineJobId(terminalJobId: string): string {
  if (terminalJobId.startsWith("tjob_")) {
    const rest = terminalJobId.slice(5);
    if (rest.startsWith("vj_")) return rest;
    return terminalJobId;
  }
  return terminalJobId;
}

function lastStep(job: StoredJob): string | null {
  for (let i = job.events.length - 1; i >= 0; i--) {
    const ev = job.events[i];
    if (ev.step) return ev.step;
  }
  return null;
}

export function mapTerminalStatus(job: StoredJob): TerminalJobStatus {
  if (job.status === "QUEUED") return "queued";
  if (job.status === "CANCELLED") return "cancelled";
  if (job.status === "FAILED") return "failed";

  const anchor = job.proof?.proofHash ? getProofAnchor(job.proof.proofHash) : undefined;

  if (job.status === "PASSED" && job.proof) {
    if (anchor?.status === "PENDING") return "anchoring";
    if (anchor?.status === "ANCHORED") return "completed";
    if (anchor?.status === "FAILED") return "failed";
    return "completed";
  }

  if (job.status === "RUNNING") {
    const step = lastStep(job);
    if (step === "CONNECTIVITY" || step === "QUOTA") return "running";
    return "verifying";
  }

  return "queued";
}

export function settlementNetworkMeta(): { chainId: number; network: string } {
  const cfg = getSettlementNetworkConfig();
  return { chainId: cfg.chainId, network: cfg.network };
}
