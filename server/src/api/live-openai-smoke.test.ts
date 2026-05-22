/**
 * Optional CI smoke — requires OPENAI_API_KEY and skips when absent.
 */

import { describe, expect, it } from "vitest";
import "../jobs/worker.js";
import app from "./server.js";
import { jobStore } from "../jobs/store.js";
import { pollJobUntilTerminal } from "../test/helpers.js";

const liveKey = process.env.OPENAI_API_KEY;
const runLive = process.env.RUN_LIVE_OPENAI_SMOKE === "true" && !!liveKey;

describe.runIf(runLive)("live OpenAI smoke", () => {
  it("POST job with real sk-* completes without mock", async () => {
    process.env.VERIFICATION_MOCK = "false";
    jobStore["jobs"].clear();

    const create = await app.request("/api/v1/verification/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: "LISTING_DRAFT",
        provider: "openai",
        apiKey: liveKey,
        declaredQuantity: 500,
        claimedModel: "gpt-4o-mini",
        costLiability: "SELLER_PAID",
      }),
    });

    expect(create.status).toBe(202);
    const { jobId } = (await create.json()) as { jobId: string };
    const finished = await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
      90_000,
    );
    expect(finished.proof?.probeManifest?.length).toBeGreaterThan(0);
    expect(finished.proof?.proofHash).toBeTruthy();
  }, 120_000);
});
