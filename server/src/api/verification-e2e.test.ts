/**
 * Automated E2E — POST job -> terminal state with VERIFICATION_MOCK=true.
 */

import { beforeEach, describe, expect, it } from "vitest";
import "../jobs/worker.js";
import app from "./server.js";
import { jobStore } from "../jobs/store.js";
import { listingStore } from "../listings/store.js";
import { pollJobUntilTerminal } from "../test/helpers.js";

const MOCK_KEY = "sk-mock-e2e-vertical-slice";

describe("verification API E2E", () => {
  beforeEach(() => {
    process.env.VERIFICATION_MOCK = "true";
    jobStore["jobs"].clear();
    listingStore["listings"].clear();
  });

  it("POST /verification/jobs completes with probeManifest (mock)", async () => {
    const create = await app.request("/api/v1/verification/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: "LISTING_DRAFT",
        provider: "openai",
        apiKey: MOCK_KEY,
        declaredQuantity: 10_000,
        claimedModel: "gpt-4o-mini",
        costLiability: "SELLER_PAID",
      }),
    });

    expect(create.status).toBe(202);
    const { jobId } = (await create.json()) as { jobId: string };
    expect(jobId).toBeTruthy();

    const finished = await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
    );

    expect(["PASSED", "FAILED", "REVIEW", "DEGRADED"]).toContain(finished.terminalOutcome);
    expect(finished.proof?.probeManifest?.length).toBeGreaterThan(0);
    expect(finished.proof?.proofHash).toMatch(/^0x|^[a-f0-9]/i);
  });

  it("POST /listings returns job + listing ids", async () => {
    const res = await app.request("/api/v1/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: MOCK_KEY,
        quotaToSell: 25_000,
        askPriceUsdc: 12.5,
        providerKind: "openai",
        claimedModel: "gpt-4o-mini",
      }),
    });

    expect(res.status).toBe(202);
    const body = (await res.json()) as { listingId: string; jobId: string };
    expect(body.listingId).toBeTruthy();
    expect(body.jobId).toBeTruthy();

    const job = await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      body.jobId,
    );
    expect(job.terminalOutcome).toBeDefined();
  });

  it("GET /verification/feed includes completed job events", async () => {
    const create = await app.request("/api/v1/verification/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: "LISTING_DRAFT",
        provider: "openai",
        apiKey: MOCK_KEY,
        declaredQuantity: 5000,
      }),
    });
    const { jobId } = (await create.json()) as { jobId: string };
    await pollJobUntilTerminal((id) => app.request(`/api/v1/verification/jobs/${id}`), jobId);

    const feed = await app.request("/api/v1/verification/feed");
    expect(feed.status).toBe(200);
    const { rows } = (await feed.json()) as { rows: { jobId: string }[] };
    expect(rows.some((r) => r.jobId === jobId)).toBe(true);
  });
});
