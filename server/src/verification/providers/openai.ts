/** Mechanism spec §5.1 — OpenAI playbook */

import type { ProbeRecord } from "../../types/verification.js";
import type { ProviderKind } from "../../types/verification.js";
import { resolveOpenAiCompatibleBaseUrl, safeProviderFetch } from "./openai-base.js";
import { humanizeOpenAiCompatibleError, mapOpenAiCompatibleError } from "./openai-errors.js";

const CANONICAL_PROMPT = "TOKENTA_VERIFY_v1 reply OK";
const DEFAULT_MODEL = "gpt-4o-mini";

export interface OpenAIProbeContext {
  apiKey: string;
  probeModelId: string;
  maxTokens: number;
  mock?: boolean;
  provider?: ProviderKind;
  compatibleBaseUrl?: string;
  providerSlug?: string;
  l1Strategy?: "models" | "chat";
}

function apiBase(ctx: OpenAIProbeContext): string {
  return resolveOpenAiCompatibleBaseUrl(
    ctx.provider ?? "openai",
    ctx.compatibleBaseUrl,
    ctx.providerSlug,
  );
}

function isProbeTransportError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("PROBE_NETWORK_UNREACHABLE") ||
    msg.includes("PROBE_TIMEOUT") ||
    msg === "fetch failed"
  );
}

export interface LivenessResult {
  ok: boolean;
  modelIds: string[];
  latencyMs: number;
  httpStatus: number;
  errorCode?: string;
  /** Rate-limit headers from the L1 response (present when L1 used a chat probe) */
  headers?: Record<string, string>;
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

  if (ctx.l1Strategy === "chat") {
    return livenessViaChat(ctx);
  }

  const start = Date.now();
  const base = apiBase(ctx);
  const modelsUrl = `${base}/v1/models`;
  try {
    const res = await safeProviderFetch(modelsUrl, {
      headers: { Authorization: `Bearer ${ctx.apiKey}` },
    });
    const latencyMs = Date.now() - start;
    const httpStatus = res.status;

    if (!res.ok) {
      if (httpStatus === 404 || httpStatus === 405 || httpStatus === 401) {
        return livenessViaChat(ctx);
      }
      return failedLiveness(ctx, modelsUrl, res, latencyMs, httpStatus);
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
  } catch (e) {
    if (!isProbeTransportError(e)) {
      return livenessViaChat(ctx);
    }
    try {
      return await livenessViaChat(ctx);
    } catch (chatErr) {
      const modelsMsg = e instanceof Error ? e.message : String(e);
      const chatMsg = chatErr instanceof Error ? chatErr.message : String(chatErr);
      throw new Error(
        `${modelsMsg} Fallback chat probe also failed: ${chatMsg}`,
      );
    }
  }
}

async function failedLiveness(
  ctx: OpenAIProbeContext,
  probeUrl: string,
  res: Response,
  latencyMs: number,
  httpStatus: number,
): Promise<LivenessResult> {
  const errBody = await res.text().catch(() => "");
  const errorCode = mapOpenAiCompatibleError(httpStatus, errBody);
  return {
    ok: false,
    modelIds: [],
    latencyMs,
    httpStatus,
    errorCode,
    record: {
      paradigm: "A",
      endpoint:
        errBody.length > 0 && errBody.length < 120
          ? `GET /v1/models [${httpStatus}] ${errBody}`
          : `GET /v1/models [${httpStatus}]`,
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

async function livenessViaChat(ctx: OpenAIProbeContext): Promise<LivenessResult> {
  const micro = await openaiMicroProbe({ ...ctx, maxTokens: 1 });
  return {
    ok: micro.ok,
    modelIds: micro.ok ? [ctx.probeModelId] : [],
    latencyMs: micro.latencyMs,
    httpStatus: micro.httpStatus,
    errorCode: micro.errorCode,
    // Propagate rate-limit headers from L1 chat probe so orchestrator can
    // perform pre-L2 quota signal check (spec §7 step 5).
    headers: micro.headers,
    record: {
      ...micro.record,
      paradigm: "A",
      endpoint: "POST /v1/chat/completions (L1 chat probe)",
    },
  };
}

export async function openaiMicroProbe(ctx: OpenAIProbeContext): Promise<MicroProbeResult> {
  if (ctx.mock || ctx.apiKey === "mock" || ctx.apiKey.startsWith("sk-mock")) {
    return mockMicro(ctx);
  }

  const start = Date.now();
  const base = apiBase(ctx);
  const chatUrl = `${base}/v1/chat/completions`;
  let res: Response;
  try {
    res = await safeProviderFetch(chatUrl, {
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
  } catch (e) {
    const latencyMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      latencyMs,
      httpStatus: 0,
      tokensUsed: 0,
      headers: {},
      errorCode: msg.includes("PROBE_TIMEOUT") ? "PROBE_TIMEOUT" : "NETWORK_UNREACHABLE",
      record: {
        paradigm: "C",
        endpoint: "POST /v1/chat/completions",
        probeModelId: ctx.probeModelId,
        httpStatus: 0,
        latencyMs,
        tokensUsed: 0,
        requestsUsed: 0,
        maxTokensUsed: 0,
        result: "FAIL",
        timestamp: new Date().toISOString(),
        cached: false,
        errorCode: "NETWORK_UNREACHABLE",
      },
    };
  }
  const latencyMs = Date.now() - start;
  const httpStatus = res.status;
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  if (!res.ok) {
    const errBody = await res.text();
    const errorCode = mapOpenAiCompatibleError(httpStatus, errBody);
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
