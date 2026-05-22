import { jobStore, type StoredJob } from "../jobs/store.js";
import { getProofAnchor } from "../verification/proof-anchor.js";
import type { TerminalJobView } from "./types.js";
import {
  mapTerminalStatus,
  resolveEngineJobId,
  settlementNetworkMeta,
  terminalJobIdFromEngine,
} from "./job-status.js";

function lastStep(job: StoredJob): string | null {
  for (let i = job.events.length - 1; i >= 0; i--) {
    if (job.events[i]?.step) return job.events[i].step!;
  }
  return null;
}

export function buildTerminalJobView(job: StoredJob): TerminalJobView {
  const tid = terminalJobIdFromEngine(job.id);
  const status = mapTerminalStatus(job);
  const { chainId, network } = settlementNetworkMeta();
  const anchorRec = job.proof?.proofHash ? getProofAnchor(job.proof.proofHash) : undefined;

  return {
    terminalJobId: tid,
    jobId: job.id,
    status,
    progress: {
      step: lastStep(job),
      stepsCompleted: job.stepsCompleted,
      stepsTotal: job.stepsTotal,
      percent: Math.round((job.stepsCompleted / Math.max(job.stepsTotal, 1)) * 100),
    },
    terminalOutcome: job.proof?.terminalOutcome ?? null,
    proofHash: job.proof?.proofHash ?? null,
    anchor: {
      chainId,
      network,
      status: anchorRec?.status?.toLowerCase() ?? "none",
      txHash: anchorRec?.txHash?.startsWith("0x") ? anchorRec.txHash : null,
    },
    receiptUrl: `/api/v1/terminal/receipt/${tid}`,
    proofUrl: job.proof?.proofHash ? `/api/v1/terminal/proof/${job.proof.proofHash}` : null,
    streamUrl: `/api/v1/terminal/job/${tid}/events`,
    startedAt: job.startedAt ?? null,
    updatedAt: job.completedAt ?? job.startedAt ?? job.createdAt,
    listingId: job.listingId,
    orderId: job.request.orderId,
  };
}

export function getJobByTerminalId(terminalJobId: string): StoredJob | undefined {
  const engineId = resolveEngineJobId(terminalJobId);
  return jobStore.get(engineId) ?? jobStore.get(terminalJobId);
}
