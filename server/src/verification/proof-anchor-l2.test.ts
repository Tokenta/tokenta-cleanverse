import { afterEach, describe, expect, it, vi } from "vitest";
import { submitProofAnchorToL2 } from "./proof-anchor-l2.js";
import type { ProofAnchorRecord } from "./proof-anchor.js";
import { isValidAnchorCalldata } from "./settlement-contract.js";

describe("proof-anchor-l2", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PROOF_ANCHOR_RPC_URL;
    delete process.env.PROOF_ANCHOR_USE_CONTRACT;
    delete process.env.PROOF_ANCHOR_CONTRACT_ADDRESS;
  });

  it("submits contract calldata when PROOF_ANCHOR_USE_CONTRACT=true", async () => {
    let capturedBody: Record<string, unknown> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return {
          ok: true,
          json: async () => ({ txHash: "0xcontracttx" }),
        };
      }) as typeof fetch,
    );

    process.env.PROOF_ANCHOR_RPC_URL = "https://rpc.example/anchor";
    process.env.PROOF_ANCHOR_USE_CONTRACT = "true";
    process.env.PROOF_ANCHOR_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000001";

    const rec: ProofAnchorRecord = {
      proofHash: "0xdeadbeef",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    const r = await submitProofAnchorToL2(rec);
    expect(r.ok).toBe(true);
    expect(capturedBody.method).toBe("eth_sendRawTransaction");
    const params = capturedBody.params as { data: string };
    expect(isValidAnchorCalldata(params.data)).toBe(true);
  });

  it("submits to RPC and returns txHash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ txHash: "0xrealtx123" }),
      })) as typeof fetch,
    );

    process.env.PROOF_ANCHOR_RPC_URL = "https://rpc.example/anchor";
    const rec: ProofAnchorRecord = {
      proofHash: "0xabc",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    const r = await submitProofAnchorToL2(rec);
    expect(r.ok).toBe(true);
    expect(r.txHash).toBe("0xrealtx123");
  });
});
