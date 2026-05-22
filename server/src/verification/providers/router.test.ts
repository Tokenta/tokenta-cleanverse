import { describe, expect, it } from "vitest";
import { runLiveness } from "./router.js";

describe("provider router (mock fixtures)", () => {
  const ctx = { apiKey: "sk-mock-router-test", probeModelId: "gpt-4o-mini", maxTokens: 5, mock: true };

  it("openai liveness passes", async () => {
    const r = await runLiveness("openai", ctx);
    expect(r.ok).toBe(true);
  });

  it("anthropic liveness passes", async () => {
    const r = await runLiveness("anthropic", { ...ctx, probeModelId: "claude-3-5-haiku-20241022" });
    expect(r.ok).toBe(true);
  });

  it("google liveness passes", async () => {
    const r = await runLiveness("google", { ...ctx, probeModelId: "gemini-1.5-flash", apiKey: "AIza-mock-gemini" });
    expect(r.ok).toBe(true);
  });
});
