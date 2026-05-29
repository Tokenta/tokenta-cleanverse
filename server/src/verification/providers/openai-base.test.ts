import { afterEach, describe, expect, it } from "vitest";
import { resolveOpenAiCompatibleBaseUrl } from "./openai-base.js";

describe("openai-base", () => {
  const prev = process.env.OPENAI_COMPATIBLE_BASE_URL;

  afterEach(() => {
    process.env.OPENAI_COMPATIBLE_BASE_URL = prev;
  });

  it("strips trailing /v1 from override so /v1/models is not doubled", () => {
    expect(
      resolveOpenAiCompatibleBaseUrl("openai_compatible", "https://gateway.example/v1/"),
    ).toBe("https://gateway.example");
  });

  it("uses env for custom provider", () => {
    process.env.OPENAI_COMPATIBLE_BASE_URL = "https://local.llm:8080/";
    expect(resolveOpenAiCompatibleBaseUrl("custom")).toBe("https://local.llm:8080");
  });

  it("defaults to api.openai.com for openai", () => {
    delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    expect(resolveOpenAiCompatibleBaseUrl("openai")).toBe("https://api.openai.com");
  });

  it("resolves deepseek slug to api.deepseek.com", () => {
    expect(resolveOpenAiCompatibleBaseUrl("openai_compatible", undefined, "deepseek")).toBe(
      "https://api.deepseek.com",
    );
  });

  it("throws when openai_compatible has no override or slug", () => {
    delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    expect(() => resolveOpenAiCompatibleBaseUrl("openai_compatible")).toThrow(
      "MISSING_COMPATIBLE_BASE_URL",
    );
  });
});
