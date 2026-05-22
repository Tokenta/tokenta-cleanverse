import { beforeEach, describe, expect, it } from "vitest";
import {
  registerProofAnchor,
  confirmMockAnchor,
  getProofAnchor,
  resetAnchorsForTest,
} from "./proof-anchor.js";

describe("proof-anchor", () => {
  beforeEach(() => resetAnchorsForTest());

  it("registers and confirms mock anchor", () => {
    const rec = registerProofAnchor({ proofHash: "0xabc123", jobId: "vj_1" });
    expect(rec.status).toBe("PENDING");
    const done = confirmMockAnchor("0xabc123");
    expect(done?.status).toBe("ANCHORED");
    expect(done?.txHash).toMatch(/^0xmock/);
    expect(getProofAnchor("0xabc123")?.anchoredAt).toBeDefined();
  });
});
