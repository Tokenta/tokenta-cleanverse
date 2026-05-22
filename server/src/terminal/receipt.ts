import type { StoredJob } from "../jobs/store.js";
import { getProofAnchor } from "../verification/proof-anchor.js";
import { getTerminalSession } from "./session-store.js";
import { mapTerminalStatus, settlementNetworkMeta, terminalJobIdFromEngine } from "./job-status.js";
import { BASE_SEPOLIA_EXPLORER } from "./network-config.js";

export function buildExecutionReceipt(
  job: StoredJob,
  sessionId?: string | null,
): Record<string, unknown> {
  const tid = terminalJobIdFromEngine(job.id);
  const anchorRec = job.proof?.proofHash ? getProofAnchor(job.proof.proofHash) : undefined;
  const { chainId, network } = settlementNetworkMeta();
  const session = sessionId ? getTerminalSession(sessionId) : undefined;
  const verified =
    job.proof != null &&
    ["PASS", "REVIEW", "DEGRADED"].includes(job.proof.terminalOutcome);

  const tokens = job.proof?.totalTokensUsed ?? 0;
  const estimatedUsdc = (tokens * 0.000006).toFixed(4);

  return {
    receiptVersion: "1.0",
    job_id: job.id,
    terminal_job_id: tid,
    session_id: sessionId ?? null,
    wallet_address: session?.walletAddress ?? null,
    provider: job.request.provider,
    model: job.proof?.probeModelId ?? job.request.claimedModel ?? "—",
    verified,
    terminal_outcome: job.proof?.terminalOutcome ?? null,
    status: mapTerminalStatus(job),
    proof_hash: job.proof?.proofHash ?? null,
    proof_url: job.proof?.proofHash
      ? `/api/v1/terminal/proof/${job.proof.proofHash}`
      : null,
    anchor: {
      network,
      chain_id: chainId,
      contract: process.env.SETTLEMENT_CONTRACT_ADDRESS ?? process.env.PROOF_ANCHOR_CONTRACT_ADDRESS ?? null,
      anchor_tx: anchorRec?.txHash?.startsWith("0x") ? anchorRec.txHash : null,
      anchor_status: anchorRec?.status?.toLowerCase() ?? "none",
      anchored_at: anchorRec?.anchoredAt ?? null,
      explorer_tx_url:
        anchorRec?.txHash?.startsWith("0x")
          ? `${BASE_SEPOLIA_EXPLORER}/tx/${anchorRec.txHash}`
          : null,
    },
    cost: {
      liability: job.request.costLiability ?? "SELLER_PAID",
      tokens_used: tokens,
      estimated_usdc: estimatedUsdc,
      currency: "USDC",
    },
    timing: {
      queued_at: job.createdAt,
      started_at: job.startedAt ?? null,
      completed_at: job.completedAt ?? null,
      duration_ms: job.durationMs ?? null,
    },
    scores: job.proof
      ? {
          capability: job.proof.capabilityScore,
          trust: job.proof.trustScore,
          compliance: job.proof.complianceScore,
        }
      : null,
    signature: null,
  };
}
