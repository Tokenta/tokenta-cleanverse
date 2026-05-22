/**
 * Integration: mock OpenAI HTTP fixtures (no live network).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openaiLiveness, openaiMicroProbe } from "./openai.js";

describe("OpenAI HTTP fixtures", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.VERIFICATION_MOCK = "false";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("liveness maps 401 to INVALID_KEY", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("unauthorized", { status: 401 }),
    ) as typeof fetch;

    const result = await openaiLiveness({
      apiKey: "sk-live-test",
      probeModelId: "gpt-4o-mini",
      maxTokens: 10,
      provider: "openai",
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("INVALID_KEY");
    expect(result.httpStatus).toBe(401);
  });

  it("liveness parses models list on 200", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/v1/models")) {
        return new Response(JSON.stringify({ data: [{ id: "gpt-4o-mini" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const result = await openaiLiveness({
      apiKey: "sk-live-test",
      probeModelId: "gpt-4o-mini",
      maxTokens: 10,
      provider: "openai",
    });

    expect(result.ok).toBe(true);
    expect(result.modelIds).toContain("gpt-4o-mini");
  });

  it("micro probe uses compatible base URL", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("https://gateway.local");
      expect(url).toContain("/v1/chat/completions");
      return new Response(
        JSON.stringify({ usage: { total_tokens: 42 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await openaiMicroProbe({
      apiKey: "sk-compat",
      probeModelId: "gpt-4o-mini",
      maxTokens: 5,
      provider: "openai_compatible",
      compatibleBaseUrl: "https://gateway.local",
    });

    expect(result.ok).toBe(true);
    expect(result.tokensUsed).toBe(42);
  });
});
