import { describe, expect, it } from "vitest";
import { validateBuyerTriggeredJob } from "./buyer-verify-policy.js";

describe("buyer-verify-policy", () => {
  it("rejects PRE_PURCHASE with seller stored key flag", () => {
    const r = validateBuyerTriggeredJob({
      context: "PRE_PURCHASE",
      provider: "openai",
      apiKey: "sk-mock-test-key-12345",
      declaredQuantity: 1000,
      useSellerStoredKey: true,
      payerPaysFee: true,
    });
    expect(r.ok).toBe(false);
  });

  it("allows PRE_PURCHASE with buyer key", () => {
    const r = validateBuyerTriggeredJob({
      context: "PRE_PURCHASE",
      provider: "openai",
      apiKey: "sk-mock-test-key-12345",
      declaredQuantity: 1000,
      payerPaysFee: true,
    });
    expect(r.ok).toBe(true);
  });
});
