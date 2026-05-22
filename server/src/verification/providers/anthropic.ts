/** Mechanism spec §5.2 — Anthropic (Phase 2 scaffold) */

import type { LivenessResult, MicroProbeResult, OpenAIProbeContext } from "./openai.js";

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";

export async function anthropicLiveness(ctx: OpenAIProbeContext): Promise<LivenessResult> {
  if (ctx.mock || ctx.apiKey.startsWith("sk-mock")) {
    return {
      ok: true,
      modelIds: [DEFAULT_MODEL],
      latencyMs: 150,
      httpStatus: 200,
      record: {
        paradigm: "A",
        endpoint: "POST /v1/messages (liveness)",
        probeModelId: ctx.probeModelId,
        httpStatus: 200,
        latencyMs: 150,
        tokensUsed: 0,
        requestsUsed: 1,
        maxTokensUsed: 0,
        result: "PASS",
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };
  }

  const start = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ctx.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ctx.probeModelId || DEFAULT_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "TOKENTA_VERIFY_v1" }],
    }),
  });
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    return {
      ok: false,
      modelIds: [],
      latencyMs,
      httpStatus: res.status,
      errorCode: res.status === 401 ? "INVALID_KEY" : "RATE_LIMITED",
      record: {
        paradigm: "A",
        endpoint: "POST /v1/messages",
        probeModelId: ctx.probeModelId,
        httpStatus: res.status,
        latencyMs,
        tokensUsed: 0,
        requestsUsed: 1,
        maxTokensUsed: 1,
        result: "FAIL",
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };
  }

  return {
    ok: true,
    modelIds: [ctx.probeModelId || DEFAULT_MODEL],
    latencyMs,
    httpStatus: 200,
    record: {
      paradigm: "C",
      endpoint: "POST /v1/messages",
      probeModelId: ctx.probeModelId,
      httpStatus: 200,
      latencyMs,
      tokensUsed: 5,
      requestsUsed: 1,
      maxTokensUsed: 1,
      result: "PASS",
      timestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

export async function anthropicMicroProbe(ctx: OpenAIProbeContext): Promise<MicroProbeResult> {
  const live = await anthropicLiveness(ctx);
  if (!live.ok) {
    return {
      ok: false,
      latencyMs: live.latencyMs,
      httpStatus: live.httpStatus,
      tokensUsed: 0,
      headers: {},
      errorCode: live.errorCode,
      record: live.record,
    };
  }
  const tokens = live.record.tokensUsed || 8;
  return {
    ok: true,
    latencyMs: live.latencyMs,
    httpStatus: live.httpStatus,
    tokensUsed: tokens,
    headers: {
      "anthropic-ratelimit-tokens-remaining": "120000",
      "anthropic-ratelimit-tokens-limit": "200000",
    },
    record: {
      ...live.record,
      paradigm: "C",
      endpoint: "POST /v1/messages (capacity)",
      tokensUsed: tokens,
      maxTokensUsed: ctx.maxTokens,
    },
  };
}
