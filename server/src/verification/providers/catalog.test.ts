import { describe, expect, it } from "vitest";
import { resolveAiProvider, resolveVerificationProvider } from "./catalog.js";

describe("ai provider catalog", () => {
  it("defaults empty provider to DeepSeek", () => {
    expect(resolveAiProvider("").slug).toBe("deepseek");
    expect(resolveVerificationProvider("").compatibleBaseUrl).toBe("https://api.deepseek.com");
  });

  it("resolves DeepSeek slug", () => {
    const p = resolveAiProvider("deepseek");
    expect(p.kind).toBe("openai_compatible");
    expect(p.baseUrl).toBe("https://api.deepseek.com");
    expect(p.defaultModel).toBe("deepseek-chat");
    expect(p.l1Strategy).toBe("chat");
  });

  it("resolves legacy OpenAI-compatible label", () => {
    const p = resolveAiProvider("OpenAI-compatible");
    expect(p.slug).toBe("openai-compatible");
  });

  it("resolves Moonshot / Kimi aliases", () => {
    expect(resolveAiProvider("Moonshot (Kimi)").slug).toBe("moonshot");
    expect(resolveAiProvider("kimi").slug).toBe("moonshot");
  });

  it("resolveVerificationProvider passes base URL for MiniMax", () => {
    const r = resolveVerificationProvider("minimax");
    expect(r.kind).toBe("openai_compatible");
    expect(r.compatibleBaseUrl).toContain("minimaxi.com");
    expect(r.l1Strategy).toBe("chat");
  });

  it("resolveVerificationProvider uses override base URL for custom", () => {
    const r = resolveVerificationProvider("custom", {
      compatibleBaseUrl: "https://my.gateway.example",
    });
    expect(r.compatibleBaseUrl).toBe("https://my.gateway.example");
  });
});
