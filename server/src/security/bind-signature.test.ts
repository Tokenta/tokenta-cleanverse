import { afterEach, describe, expect, it } from "vitest";
import { signBindPayload, verifyBindSignature } from "./bind-signature.js";

describe("bind-signature", () => {
  afterEach(() => {
    delete process.env.REQUIRE_BIND_SIGNATURE;
    delete process.env.BIND_SIGNATURE_SECRET;
  });

  it("allows bind when signature not required", () => {
    process.env.REQUIRE_BIND_SIGNATURE = "false";
    expect(verifyBindSignature("lst_1", "vj_1", undefined)).toBe(true);
  });

  it("verifies HMAC when required", () => {
    process.env.REQUIRE_BIND_SIGNATURE = "true";
    process.env.BIND_SIGNATURE_SECRET = "test-secret";
    const sig = signBindPayload("lst_1", "vj_1");
    expect(verifyBindSignature("lst_1", "vj_1", sig)).toBe(true);
    expect(verifyBindSignature("lst_1", "vj_1", "bad")).toBe(false);
  });
});
