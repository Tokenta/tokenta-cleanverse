import { beforeEach, describe, expect, it } from "vitest";
import "../jobs/worker.js";
import app from "./server.js";
import { jobStore } from "../jobs/store.js";
import { resetAnchorsForTest } from "../verification/proof-anchor.js";
import { pollJobUntilTerminal } from "../test/helpers.js";

describe("proof anchor API", () => {
  beforeEach(() => {
    process.env.VERIFICATION_MOCK = "true";
    jobStore["jobs"].clear();
    resetAnchorsForTest();
  });

  it("returns NONE when no anchor registered", async () => {
    const res = await app.request("/api/v1/verification/proofs/0xdeadbeef/anchor");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("NONE");
  });

  it("POST registers anchor for existing proof", async () => {
    const jobRes = await app.request("/api/v1/verification/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        accessMethod: "DIRECT_KEY",
        context: "LISTING_DRAFT",
        declaredQuantity: 1000,
        unit: "TOKENS",
        apiKey: "sk-mock-test-key-for-anchor",
      }),
    });
    expect(jobRes.status).toBe(202);
    const { jobId } = (await jobRes.json()) as { jobId: string };
    const terminal = await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
    );
    const proofHash = terminal.proof?.proofHash;
    expect(proofHash).toBeDefined();

    const anchorRes = await app.request(
      `/api/v1/verification/proofs/${proofHash}/anchor`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmMock: true }),
      },
    );
    expect(anchorRes.status).toBe(202);
    const anchorBody = (await anchorRes.json()) as {
      anchor: { status: string; txHash?: string };
    };
    expect(anchorBody.anchor.status).toBe("ANCHORED");
    expect(anchorBody.anchor.txHash).toMatch(/^0xmock/);
  });
});
