import { describe, expect, it } from "vitest";
import {
  anchorProofCalldata,
  isValidAnchorCalldata,
  normalizeProofHashBytes32,
  settlementContractPayload,
} from "./settlement-contract.js";

describe("settlement-contract", () => {
  it("builds viem-encoded calldata and RPC payload", () => {
    const hash = normalizeProofHashBytes32("abc123");
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/i);

    const data = anchorProofCalldata("abc123");
    expect(isValidAnchorCalldata(data)).toBe(true);
    expect(data).not.toMatch(/^0xa1b2c3d4/);
    expect(data.length).toBeGreaterThan(10);

    const payload = settlementContractPayload({
      proofHash: "abc123",
      chainId: 421614,
      contract: "0x0000000000000000000000000000000000000001",
    });
    expect(payload.method).toBe("eth_sendRawTransaction");
    const params = payload.params as { data: string; meta: { selector: string } };
    expect(params.data).toBe(data);
    expect(params.meta.selector).toBe(data.slice(0, 10));
  });
});
