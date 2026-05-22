/** Mechanism spec §5.3 — Google Gemini */

import type { ProbeRecord } from "../../types/verification.js";
import type { LivenessResult, MicroProbeResult, OpenAIProbeContext } from "./openai.js";

const DEFAULT_MODEL = "gemini-1.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

function mockLiveness(ctx: OpenAIProbeContext): LivenessResult {
  const model = ctx.probeModelId || DEFAULT_MODEL;
  return {
    ok: true,
    modelIds: [model, "gemini-1.5-pro", "gemini-2.0-flash-exp"],
    latencyMs: 140,
    httpStatus: 200,
    record: {
      paradigm: "A",
      endpoint: "GET /v1beta/models",
      probeModelId: model,
      httpStatus: 200,
      latencyMs: 140,
      tokensUsed: 0,
      requestsUsed: 1,
      maxTokensUsed: 0,
      result: "PASS",
      timestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

function mockMicro(ctx: OpenAIProbeContext): MicroProbeResult {
  const tokens = 28;
  return {
    ok: true,
    latencyMs: 720,
    httpStatus: 200,
    tokensUsed: tokens,
    headers: {
      "x-ratelimit-remaining-tokens": "8500",
      "x-ratelimit-limit-tokens": "1000000",
    },
    record: {
      paradigm: "C",
      endpoint: "POST /v1beta/models/:countTokens",
      probeModelId: ctx.probeModelId,
      httpStatus: 200,
      latencyMs: 720,
      tokensUsed: tokens,
      requestsUsed: 1,
      maxTokensUsed: ctx.maxTokens,
      result: "PASS",
      timestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

export async function geminiLiveness(ctx: OpenAIProbeContext): Promise<LivenessResult> {
  if (ctx.mock || ctx.apiKey.startsWith("sk-mock") || ctx.apiKey.startsWith("AIza-mock")) {
    return mockLiveness(ctx);
  }

  const start = Date.now();
  const res = await fetch(`${BASE}/models?key=${encodeURIComponent(ctx.apiKey)}`);
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const rateZero = res.status === 429;
    return {
      ok: false,
      modelIds: [],
      latencyMs,
      httpStatus: res.status,
      errorCode: res.status === 403 || res.status === 401 ? "INVALID_KEY" : rateZero ? "RATE_LIMIT_ZERO" : "RATE_LIMITED",
      record: failRecord("GET /v1beta/models", ctx.probeModelId, res.status, latencyMs),
    };
  }

  const data = (await res.json()) as { models?: { name: string }[] };
  const modelIds =
    data.models?.map((m) => m.name.replace("models/", "")).filter((id) => id.includes("gemini")) ?? [
      DEFAULT_MODEL,
    ];

  return {
    ok: true,
    modelIds: modelIds.length ? modelIds : [DEFAULT_MODEL],
    latencyMs,
    httpStatus: 200,
    record: {
      paradigm: "A",
      endpoint: "GET /v1beta/models",
      probeModelId: ctx.probeModelId,
      httpStatus: 200,
      latencyMs,
      tokensUsed: 0,
      requestsUsed: 1,
      maxTokensUsed: 0,
      result: "PASS",
      timestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

export async function geminiMicroProbe(ctx: OpenAIProbeContext): Promise<MicroProbeResult> {
  if (ctx.mock || ctx.apiKey.startsWith("sk-mock") || ctx.apiKey.startsWith("AIza-mock")) {
    return mockMicro(ctx);
  }

  const model = ctx.probeModelId || DEFAULT_MODEL;
  const start = Date.now();
  const url = `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(ctx.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "TOKENTA_VERIFY_v1 reply OK" }] }],
      generationConfig: { maxOutputTokens: Math.min(ctx.maxTokens, 5) },
    }),
  });
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    return {
      ok: false,
      latencyMs,
      httpStatus: res.status,
      tokensUsed: 0,
      headers: {},
      errorCode: res.status === 429 ? "RATE_LIMIT_ZERO" : res.status === 401 ? "INVALID_KEY" : "QUOTA_EXHAUSTED",
      record: failRecord(`POST /v1beta/models/${model}:generateContent`, model, res.status, latencyMs),
    };
  }

  const body = (await res.json()) as {
    usageMetadata?: { totalTokenCount?: number; promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const tokens =
    body.usageMetadata?.totalTokenCount ??
    ((body.usageMetadata?.promptTokenCount ?? 0) + (body.usageMetadata?.candidatesTokenCount ?? 0) || 25);

  return {
    ok: true,
    latencyMs,
    httpStatus: 200,
    tokensUsed: tokens,
    headers: {},
    record: {
      paradigm: "C",
      endpoint: `POST /v1beta/models/${model}:generateContent`,
      probeModelId: model,
      httpStatus: 200,
      latencyMs,
      tokensUsed: tokens,
      requestsUsed: 1,
      maxTokensUsed: ctx.maxTokens,
      result: "PASS",
      timestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

function failRecord(endpoint: string, model: string, status: number, latencyMs: number): ProbeRecord {
  return {
    paradigm: "A",
    endpoint,
    probeModelId: model,
    httpStatus: status,
    latencyMs,
    tokensUsed: 0,
    requestsUsed: 1,
    maxTokensUsed: 0,
    result: "FAIL",
    timestamp: new Date().toISOString(),
    cached: false,
  };
}

export function resolveGeminiProbeModel(claimed?: string, modelIds?: string[]): string {
  if (claimed && modelIds?.some((m) => m.includes(claimed) || claimed.includes(m))) return claimed;
  if (modelIds?.length) {
    const flash = modelIds.find((m) => m.includes("flash"));
    return flash ?? modelIds[0];
  }
  return DEFAULT_MODEL;
}
