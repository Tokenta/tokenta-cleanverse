import { beforeEach, describe, expect, it } from "vitest";
import app from "./server.js";
import { resetEscrowsForTest } from "../orders/escrow.js";
import { signEscrowPayload } from "../security/escrow-signature.js";

describe("escrow API", () => {
  beforeEach(() => {
    resetEscrowsForTest();
    delete process.env.REQUIRE_ESCROW_SIGNATURE;
  });

  it("funds and releases escrow", async () => {
    process.env.REQUIRE_ESCROW_SIGNATURE = "true";
    process.env.ESCROW_SIGNATURE_SECRET = "escrow-api-test";
    const orderId = "ord_api_1";
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
