import { beforeEach, describe, expect, it } from "vitest";
import "../jobs/worker.js";
import app from "./server.js";
import { jobStore } from "../jobs/store.js";
import { pollJobUntilTerminal } from "../test/helpers.js";

describe("proof download", () => {
  beforeEach(() => {
    process.env.VERIFICATION_MOCK = "true";
    jobStore["jobs"].clear();
  });

  it("returns attachment when download=1", async () => {
    const create = await app.request("/api/v1/verification/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: "LISTING_DRAFT",
        provider: "openai",
        apiKey: "sk-mock-proof-dl",
        declaredQuantity: 3000,
      }),
    });
    const { jobId } = (await create.json()) as { jobId: string };
    const finished = await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
    );
    const hash = finished.proof!.proofHash;

    const res = await app.request(
      `/api/v1/verification/proofs/${hash}?download=1`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    const text = await res.text();
    expect(text).toContain("probeManifest");
    expect(text).toContain(hash);
  });
});
