/** Mechanism spec §5.1 — OpenAI playbook */

import type { ProbeRecord } from "../../types/verification.js";
import type { ProviderKind } from "../../types/verification.js";
import { resolveOpenAiCompatibleBaseUrl } from "./openai-base.js";

const CANONICAL_PROMPT = "TOKENTA_VERIFY_v1 reply OK";
const DEFAULT_MODEL = "gpt-4o-mini";

export interface OpenAIProbeContext {
  apiKey: string;
  probeModelId: string;
  maxTokens: number;
  mock?: boolean;
  provider?: ProviderKind;
  compatibleBaseUrl?: string;
}

function apiBase(ctx: OpenAIProbeContext): string {
  return resolveOpenAiCompatibleBaseUrl(ctx.provider ?? "openai", ctx.compatibleBaseUrl);
}

export interface LivenessResult {
  ok: boolean;
  modelIds: string[];
  latencyMs: number;
  httpStatus: number;
  errorCode?: string;
  record: ProbeRecord;
}

export interface MicroProbeResult {
  ok: boolean;
  latencyMs: number;
  httpStatus: number;
  tokensUsed: number;
  headers: Record<string, string>;
  errorCode?: string;
  record: ProbeRecord;
}

function mockLiveness(ctx: OpenAIProbeContext): LivenessResult {
  const t = Date.now();
  return {
    ok: true,
    modelIds: [ctx.probeModelId, "gpt-4o-mini", "gpt-3.5-turbo"],
    latencyMs: 120,
    httpStatus: 200,
    record: {
      paradigm: "A",
      endpoint: "GET /v1/models",
      probeModelId: ctx.probeModelId,
      httpStatus: 200,
      latencyMs: 120,
      tokensUsed: 0,
      requestsUsed: 1,
      maxTokensUsed: 0,
      result: "PASS",
      timestamp: new Date(t).toISOString(),
      cached: false,
    },
  };
}

function mockMicro(ctx: OpenAIProbeContext): MicroProbeResult {
  const input = 22;
  const output = Math.min(ctx.maxTokens, 5);
  return {
    ok: true,
    latencyMs: 890,
    httpStatus: 200,
    tokensUsed: input + output,
    headers: {
      "x-ratelimit-remaining-requests": "4999",
      "x-ratelimit-limit-requests": "5000",
      "x-ratelimit-remaining-tokens": "999000",
      "x-ratelimit-limit-tokens": "1000000",
    },
    record: {
      paradigm: "C",
      endpoint: "POST /v1/chat/completions",
      probeModelId: ctx.probeModelId,
      httpStatus: 200,
      latencyMs: 890,
      tokensUsed: input + output,
      requestsUsed: 1,
      maxTokensUsed: ctx.maxTokens,
      result: "PASS",
      timestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

export async function openaiLiveness(ctx: OpenAIProbeContext): Promise<LivenessResult> {
  if (ctx.mock || ctx.apiKey === "mock" || ctx.apiKey.startsWith("sk-mock")) {
    return mockLiveness(ctx);
  }

  const start = Date.now();
  const base = apiBase(ctx);
  const res = await fetch(`${base}/v1/models`, {
    headers: { Authorization: `Bearer ${ctx.apiKey}` },
  });
  const latencyMs = Date.now() - start;
  const httpStatus = res.status;

  if (!res.ok) {
    const err = await res.text();
    let errorCode = "INVALID_KEY";
    if (httpStatus === 401) errorCode = "INVALID_KEY";
    else if (httpStatus === 429) errorCode = "RATE_LIMITED";
    else if (httpStatus === 403) errorCode = "FORBIDDEN";
    return {
      ok: false,
      modelIds: [],
      latencyMs,
      httpStatus,
      errorCode,
      record: {
        paradigm: "A",
        endpoint: "GET /v1/models",
        probeModelId: ctx.probeModelId,
        httpStatus,
        latencyMs,
        tokensUsed: 0,
        requestsUsed: 1,
        maxTokensUsed: 0,
        result: "FAIL",
        timestamp: new Date().toISOString(),
        cached: false,
        errorCode,
      },
    };
  }

  const body = (await res.json()) as { data?: { id: string }[] };
  const modelIds = (body.data ?? []).map((m) => m.id);
  return {
    ok: true,
    modelIds,
    latencyMs,
    httpStatus,
    record: {
      paradigm: "A",
      endpoint: "GET /v1/models",
      probeModelId: ctx.probeModelId,
      httpStatus,
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

export async function openaiMicroProbe(ctx: OpenAIProbeContext): Promise<MicroProbeResult> {
  if (ctx.mock || ctx.apiKey === "mock" || ctx.apiKey.startsWith("sk-mock")) {
    return mockMicro(ctx);
  }

  const start = Date.now();
  const base = apiBase(ctx);
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ctx.probeModelId,
      messages: [{ role: "user", content: CANONICAL_PROMPT }],
      max_tokens: ctx.maxTokens,
      temperature: 0,
    }),
  });
  const latencyMs = Date.now() - start;
  const httpStatus = res.status;
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  if (!res.ok) {
    const errBody = await res.text();
    let errorCode = "QUOTA_EXHAUSTED";
    if (httpStatus === 401) errorCode = "INVALID_KEY";
    else if (httpStatus === 404) errorCode = "MODEL_NOT_ENTITLED";
    else if (errBody.includes("insufficient_quota")) errorCode = "QUOTA_EXHAUSTED";
    return {
      ok: false,
      latencyMs,
      httpStatus,
      tokensUsed: 0,
      headers,
      errorCode,
      record: {
        paradigm: "C",
        endpoint: "POST /v1/chat/completions",
        probeModelId: ctx.probeModelId,
        httpStatus,
        latencyMs,
        tokensUsed: 0,
        requestsUsed: 1,
        maxTokensUsed: ctx.maxTokens,
        result: "FAIL",
        timestamp: new Date().toISOString(),
        cached: false,
        errorCode,
      },
    };
  }

  const body = (await res.json()) as {
    usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
  };
  const tokensUsed = body.usage?.total_tokens ?? ctx.maxTokens + 20;

  return {
    ok: true,
    latencyMs,
    httpStatus,
    tokensUsed,
    headers,
    record: {
      paradigm: "C",
      endpoint: "POST /v1/chat/completions",
      probeModelId: ctx.probeModelId,
      httpStatus,
      latencyMs,
      tokensUsed,
      requestsUsed: 1,
      maxTokensUsed: ctx.maxTokens,
      result: "PASS",
      timestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

export function resolveProbeModel(claimed: string | undefined, modelIds: string[]): string {
  if (claimed && modelIds.includes(claimed)) return claimed;
  if (modelIds.includes(DEFAULT_MODEL)) return DEFAULT_MODEL;
  return modelIds[0] ?? DEFAULT_MODEL;
}
