import { describe, expect, it } from "vitest";
import { mapOpenAiCompatibleError } from "./openai-errors.js";

describe("openai-errors", () => {
  it("maps insufficient balance to QUOTA_EXHAUSTED", () => {
    expect(
      mapOpenAiCompatibleError(
        402,
        '{"error":{"message":"Insufficient Balance","type":"invalid_request_error"}}',
      ),
    ).toBe("QUOTA_EXHAUSTED");
  });

  it("maps 401 to INVALID_KEY", () => {
    expect(mapOpenAiCompatibleError(401, "unauthorized")).toBe("INVALID_KEY");
  });
});
