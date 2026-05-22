import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fundEscrow, releaseEscrow, resetEscrowsForTest } from "./escrow.js";
import { signEscrowPayload } from "../security/escrow-signature.js";

describe("escrow", () => {
  beforeEach(() => resetEscrowsForTest());

  afterEach(() => {
    delete process.env.REQUIRE_ESCROW_SIGNATURE;
    delete process.env.ESCROW_SIGNATURE_SECRET;
  });

  it("funds and releases with signature when required", () => {
    process.env.REQUIRE_ESCROW_SIGNATURE = "true";
    process.env.ESCROW_SIGNATURE_SECRET = "escrow-test";
    const orderId = "ord_1";
    const amount = "100.50";
    const fundSig = signEscrowPayload(orderId, amount, "fund");
    const funded = fundEscrow(orderId, amount, fundSig);
    expect(funded.ok).toBe(true);
    expect(funded.record?.status).toBe("FUNDED");

    const releaseSig = signEscrowPayload(orderId, amount, "release");
    const released = releaseEscrow(orderId, amount, releaseSig);
    expect(released.ok).toBe(true);
    expect(released.record?.status).toBe("RELEASED");
  });
});
