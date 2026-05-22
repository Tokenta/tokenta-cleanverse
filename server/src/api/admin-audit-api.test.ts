import { beforeEach, describe, expect, it } from "vitest";
import "../jobs/worker.js";
import app from "./server.js";
import { resetAuditForTest } from "../security/audit-log.js";
import { signEscrowPayload } from "../security/escrow-signature.js";
import { resetEscrowsForTest } from "../orders/escrow.js";
import { pollJobUntilTerminal } from "../test/helpers.js";

const MOCK_KEY = "sk-mock-admin-audit-api";

describe("admin audit-log API", () => {
  beforeEach(() => {
    resetAuditForTest();
    resetEscrowsForTest();
    delete process.env.REQUIRE_BIND_SIGNATURE;
    delete process.env.REQUIRE_ESCROW_SIGNATURE;
    process.env.VERIFICATION_MOCK = "true";
  });

  it("GET /admin/audit-log returns bind and escrow events", async () => {
    const listingRes = await app.request("/api/v1/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: MOCK_KEY,
        quotaToSell: 5000,
        askPriceUsdc: 4,
        providerKind: "openai",
      }),
    });
    const { listingId, jobId } = (await listingRes.json()) as { listingId: string; jobId: string };
    await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
    );

    await app.request(`/api/v1/listings/${listingId}/bind-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });

    process.env.REQUIRE_ESCROW_SIGNATURE = "true";
    process.env.ESCROW_SIGNATURE_SECRET = "audit-api-escrow";
    const orderId = "ord_audit_1";
    const amount = "25.00";
    await app.request(`/api/v1/orders/${orderId}/escrow/fund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountUsdc: amount,
        signature: signEscrowPayload(orderId, amount, "fund"),
      }),
    });

    const all = await app.request("/api/v1/admin/audit-log");
    expect(all.status).toBe(200);
    const allBody = (await all.json()) as { entries: { type: string }[] };
    const types = new Set(allBody.entries.map((e) => e.type));
    expect(types.has("BIND_VERIFICATION")).toBe(true);
    expect(types.has("ESCROW_FUND")).toBe(true);

    const bindOnly = await app.request("/api/v1/admin/audit-log?type=BIND_VERIFICATION");
    const bindBody = (await bindOnly.json()) as { entries: { type: string }[] };
    expect(bindBody.entries.every((e) => e.type === "BIND_VERIFICATION")).toBe(true);
    expect(bindBody.entries.length).toBeGreaterThan(0);
  });
});
