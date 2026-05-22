import { afterEach, describe, expect, it } from "vitest";
import { resolveOpenAiCompatibleBaseUrl } from "./openai-base.js";

describe("openai-base", () => {
  const prev = process.env.OPENAI_COMPATIBLE_BASE_URL;

  afterEach(() => {
    process.env.OPENAI_COMPATIBLE_BASE_URL = prev;
  });

  it("uses override URL for openai_compatible", () => {
    expect(
      resolveOpenAiCompatibleBaseUrl("openai_compatible", "https://gateway.example/v1/"),
    ).toBe("https://gateway.example/v1");
  });

  it("uses env for custom provider", () => {
    process.env.OPENAI_COMPATIBLE_BASE_URL = "https://local.llm:8080/";
    expect(resolveOpenAiCompatibleBaseUrl("custom")).toBe("https://local.llm:8080");
  });

  it("defaults to api.openai.com for openai", () => {
    delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    expect(resolveOpenAiCompatibleBaseUrl("openai")).toBe("https://api.openai.com");
  });
});
