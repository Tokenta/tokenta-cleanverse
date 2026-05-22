import { beforeEach, describe, expect, it } from "vitest";
import "../jobs/worker.js";
import app from "./server.js";
import { jobStore } from "../jobs/store.js";
import { listingStore } from "../listings/store.js";
import { listAudit, resetAuditForTest } from "../security/audit-log.js";
import { signBindPayload } from "../security/bind-signature.js";
import { pollJobUntilTerminal } from "../test/helpers.js";

const MOCK_KEY = "sk-mock-bind-audit-test";

describe("bind-verification audit", () => {
  beforeEach(() => {
    process.env.VERIFICATION_MOCK = "true";
    delete process.env.REQUIRE_BIND_SIGNATURE;
    jobStore["jobs"].clear();
    listingStore["listings"].clear();
    resetAuditForTest();
  });

  it("records BIND_VERIFICATION on successful bind", async () => {
    const create = await app.request("/api/v1/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: MOCK_KEY,
        quotaToSell: 10_000,
        askPriceUsdc: 5,
        providerKind: "openai",
        claimedModel: "gpt-4o-mini",
      }),
    });
    expect(create.status).toBe(202);
    const { listingId, jobId } = (await create.json()) as { listingId: string; jobId: string };

    await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
    );

    const bind = await app.request(`/api/v1/listings/${listingId}/bind-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    expect(bind.status).toBe(200);

    const audit = listAudit(20).find((e) => e.type === "BIND_VERIFICATION");
    expect(audit).toBeDefined();
    expect(audit?.listingId).toBe(listingId);
    expect(audit?.jobId).toBe(jobId);
    expect(audit?.proofHash).toBeTruthy();
  });

  it("records BIND_VERIFICATION when signature required", async () => {
    process.env.REQUIRE_BIND_SIGNATURE = "true";
    process.env.BIND_SIGNATURE_SECRET = "bind-audit-secret";

    const create = await app.request("/api/v1/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: MOCK_KEY,
        quotaToSell: 5_000,
        askPriceUsdc: 3,
        providerKind: "openai",
      }),
    });
    const { listingId, jobId } = (await create.json()) as { listingId: string; jobId: string };
    await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
    );

    const signature = signBindPayload(listingId, jobId);
    const bind = await app.request(`/api/v1/listings/${listingId}/bind-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, signature }),
    });
    expect(bind.status).toBe(200);
    expect(listAudit(10).some((e) => e.type === "BIND_VERIFICATION")).toBe(true);
  });
});
