import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTerminalOrder } from "../terminal/orders-store.js";
import "../jobs/worker.js";
import app from "./server.js";
import { resetAuditForTest } from "../security/audit-log.js";
import { signEscrowPayload } from "../security/escrow-signature.js";
import { resetEscrowsForTest } from "../orders/escrow.js";
import { pollJobUntilTerminal } from "../test/helpers.js";

vi.mock("../services/ComplianceOrchestrator.js", () => ({
  ComplianceOrchestrator: vi.fn().mockImplementation(() => ({
    evaluateTradeCompliance: vi.fn().mockResolvedValue({ overallDecision: "APPROVED" })
  }))
}));

vi.mock("../integrations/cleanverse/CVASettlementAdapter.js", () => ({
  CVASettlementAdapter: vi.fn().mockImplementation(() => ({
    evaluateSettlement: vi.fn().mockResolvedValue({ state: "APPROVED" }),
    prepareTransfer: vi.fn().mockReturnValue({ to: "0xMock", data: "0xMock", chainId: 10143 })
  })),
  SettlementState: { APPROVED: "APPROVED", POLICY_DENIED: "POLICY_DENIED" }
}));

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
    process.env.ESCROW_SIGNATURE_SECRET = "admin-audit-test";
    
    const { orderId } = createTerminalOrder({
      listingId: "mock-listing",
      buyerWallet: "0xBuyer",
      sellerWallet: "0xSeller",
      mode: "BUYOUT",
      quantity: 1,
      amountUsdc: "10.00"
    });

    const amount = "10.00";
    const fundSig = signEscrowPayload(orderId, amount, "fund");
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
