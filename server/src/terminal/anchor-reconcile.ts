/**
 * Reconcile PENDING anchor records against Base Sepolia RPC receipts.
 */

import { createPublicClient, http, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import {
  getProofAnchor,
  listProofAnchors,
  type ProofAnchorRecord,
} from "../verification/proof-anchor.js";
import { settlementRpcUrl } from "./network-config.js";

export function listPendingAnchors(): ProofAnchorRecord[] {
  return listProofAnchors().filter(
    (a) => a.status === "PENDING" && a.txHash?.startsWith("0x"),
  );
}

export async function reconcilePendingAnchors(): Promise<{
  checked: number;
  confirmed: number;
  failed: number;
}> {
  const rpcUrl = settlementRpcUrl();
  const pending = listPendingAnchors();
  if (!rpcUrl || pending.length === 0) {
    return { checked: 0, confirmed: 0, failed: 0 };
  }

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  let confirmed = 0;
  let failed = 0;

  for (const rec of pending) {
    const hash = rec.txHash as Hex;
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt.status === "success") {
        rec.status = "ANCHORED";
        rec.anchoredAt = new Date().toISOString();
        rec.chainId = baseSepolia.id;
        confirmed += 1;
      } else {
        rec.status = "FAILED";
        failed += 1;
      }
    } catch {
      const tx = await client.getTransaction({ hash }).catch(() => null);
      if (!tx) {
        rec.status = "FAILED";
        rec.txHash = "tx not found on chain";
        failed += 1;
      }
    }
  }

  return { checked: pending.length, confirmed, failed };
}

export async function waitForAnchorReceipt(
  proofHash: string,
  timeoutMs = 45_000,
): Promise<ProofAnchorRecord | undefined> {
  const rec = getProofAnchor(proofHash);
  if (!rec?.txHash?.startsWith("0x")) return rec;

  const rpcUrl = settlementRpcUrl();
  if (!rpcUrl) return rec;

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: rec.txHash as Hex });
      if (receipt.status === "success") {
        rec.status = "ANCHORED";
        rec.anchoredAt = new Date().toISOString();
        rec.chainId = baseSepolia.id;
        return rec;
      }
      rec.status = "FAILED";
      return rec;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return rec;
}
