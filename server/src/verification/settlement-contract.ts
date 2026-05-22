/**
 * Tokenta settlement contract calldata (Phase 5).
 * Uses viem encodeFunctionData + data/tokenta-settlement-anchor.abi.json metadata.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeFunctionData, isHex, type Hex } from "viem";

const __dir = dirname(fileURLToPath(import.meta.url));

const ANCHOR_ABI = [
  {
    type: "function",
    name: "anchorProofHash",
    stateMutability: "nonpayable",
    inputs: [{ name: "proofHash", type: "bytes32" }],
    outputs: [{ name: "txHash", type: "bytes32" }],
  },
] as const;

export function loadSettlementAnchorAbi(): { contractName: string; functions: { name: string }[] } | null {
  try {
    const raw = readFileSync(
      join(__dir, "../../data/tokenta-settlement-anchor.abi.json"),
      "utf8",
    );
    return JSON.parse(raw) as { contractName: string; functions: { name: string }[] };
  } catch {
    return null;
  }
}

/** Normalize proof hash to 32-byte hex for anchorProofHash(bytes32). */
export function normalizeProofHashBytes32(proofHash: string): Hex {
  const raw = proofHash.startsWith("0x") ? proofHash.slice(2) : proofHash;
  if (!/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error("invalid proofHash hex");
  }
  const padded = raw.padStart(64, "0").slice(-64);
  return `0x${padded}` as Hex;
}

export function anchorProofCalldata(proofHash: string): Hex {
  const hash = normalizeProofHashBytes32(proofHash);
  return encodeFunctionData({
    abi: ANCHOR_ABI,
    functionName: "anchorProofHash",
    args: [hash],
  });
}

export function getSettlementContractName(): string | null {
  return loadSettlementAnchorAbi()?.contractName ?? null;
}

export function settlementContractPayload(record: {
  proofHash: string;
  jobId?: string;
  listingId?: string;
  chainId: number;
  contract: string;
}): Record<string, unknown> {
  const data = anchorProofCalldata(record.proofHash);
  return {
    method: "eth_sendRawTransaction",
    params: {
      chainId: record.chainId,
      to: record.contract,
      data,
      meta: {
        jobId: record.jobId,
        listingId: record.listingId,
        contractName: getSettlementContractName(),
        selector: data.slice(0, 10),
      },
    },
  };
}

/** True when calldata is valid 0x-prefixed hex (for RPC stub validation). */
export function isValidAnchorCalldata(data: string): boolean {
  return isHex(data) && data.length >= 10;
}
