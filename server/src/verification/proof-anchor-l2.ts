/**
 * Optional L2 anchor submit — POST JSON to PROOF_ANCHOR_RPC_URL (dev/staging stub).
 */

import type { ProofAnchorRecord } from "./proof-anchor.js";
import { settlementContractPayload } from "./settlement-contract.js";

export async function submitProofAnchorToL2(
  record: ProofAnchorRecord,
): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  const rpc = process.env.PROOF_ANCHOR_RPC_URL;
  if (!rpc) {
    return { ok: false, error: "PROOF_ANCHOR_RPC_URL not configured" };
  }

  const chainId = Number(process.env.PROOF_ANCHOR_CHAIN_ID ?? process.env.SETTLEMENT_CHAIN_ID ?? 84532);
  const contract = process.env.PROOF_ANCHOR_CONTRACT_ADDRESS ?? "";
  const useContract = process.env.PROOF_ANCHOR_USE_CONTRACT === "true" && !!contract;

  try {
    const body = useContract
      ? settlementContractPayload({
          proofHash: record.proofHash,
          jobId: record.jobId,
          listingId: record.listingId,
          chainId,
          contract,
        })
      : {
          method: "tokenta_anchorProof",
          params: {
            proofHash: record.proofHash,
            jobId: record.jobId,
            listingId: record.listingId,
            chainId,
            contract,
          },
        };

    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: `RPC ${res.status}` };
    }
    const resBody = (await res.json()) as { txHash?: string; result?: { txHash?: string } };
    const txHash = resBody.txHash ?? resBody.result?.txHash;
    if (!txHash) return { ok: false, error: "no txHash in RPC response" };
    return { ok: true, txHash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "rpc error" };
  }
}
