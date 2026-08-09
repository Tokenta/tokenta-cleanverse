import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTerminalOrder } from "../terminal/orders-store.js";
import app from "./server.js";
import { resetEscrowsForTest } from "../orders/escrow.js";
import { signEscrowPayload } from "../security/escrow-signature.js";

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

describe("escrow API", () => {
  beforeEach(() => {
    resetEscrowsForTest();
    delete process.env.REQUIRE_ESCROW_SIGNATURE;
  });

  it("funds and releases escrow", async () => {
    process.env.REQUIRE_ESCROW_SIGNATURE = "true";
    process.env.ESCROW_SIGNATURE_SECRET = "escrow-api-test";
    const { orderId } = createTerminalOrder({
      listingId: "mock-listing",
      buyerWallet: "0xBuyer",
      sellerWallet: "0xSeller",
      mode: "BUYOUT",
      quantity: 1,
      amountUsdc: "50.00"
    });

    const amount = "50.00";
    const fundSig = signEscrowPayload(orderId, amount, "fund");

    const fund = await app.request(`/api/v1/orders/${orderId}/escrow/fund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc: amount, signature: fundSig }),
    });
    expect(fund.status).toBe(201);

    const releaseSig = signEscrowPayload(orderId, amount, "release");
    const release = await app.request(`/api/v1/orders/${orderId}/escrow/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc: amount, signature: releaseSig }),
    });
    expect(release.status).toBe(200);
    const body = (await release.json()) as { escrow: { status: string } };
    expect(body.escrow.status).toBe("RELEASED");
  });
});
