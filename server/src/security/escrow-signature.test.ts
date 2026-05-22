import { afterEach, describe, expect, it } from "vitest";
import { signEscrowPayload, verifyEscrowSignature } from "./escrow-signature.js";

describe("escrow-signature", () => {
  afterEach(() => {
    delete process.env.REQUIRE_ESCROW_SIGNATURE;
    delete process.env.ESCROW_SIGNATURE_SECRET;
  });

  it("optional when not required", () => {
    expect(verifyEscrowSignature("ord_1", "100", "FUND", undefined)).toBe(true);
  });

  it("verifies HMAC when required", () => {
    process.env.REQUIRE_ESCROW_SIGNATURE = "true";
    process.env.ESCROW_SIGNATURE_SECRET = "escrow-test";
    const sig = signEscrowPayload("ord_1", "100.5", "FUND");
    expect(verifyEscrowSignature("ord_1", "100.5", "FUND", sig)).toBe(true);
  });
});
