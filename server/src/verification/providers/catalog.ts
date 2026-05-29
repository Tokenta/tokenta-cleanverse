/**
 * Canonical AI provider catalog for listing + verification routing.
 * Slugs are stored on listings; engine maps to ProviderKind + base URL + probe defaults.
 */

import type { ProviderKind } from "../../types/verification.js";

export type L1ProbeStrategy = "models" | "chat";

export interface AiProviderProfile {
  slug: string;
  label: string;
  kind: ProviderKind;
  defaultModel: string;
  /** OpenAI-compatible gateway host (no trailing /v1). */
  baseUrl?: string;
  l1Strategy: L1ProbeStrategy;
  region: "global" | "cn" | "both";
  /** Optional hint shown in terminal UI */
  hint?: string;
}

export const AI_PROVIDER_CATALOG: AiProviderProfile[] = [
  {
    slug: "openai",
    label: "OpenAI",
    kind: "openai",
    defaultModel: "gpt-4o-mini",
    l1Strategy: "models",
    region: "global",
  },
  {
    slug: "openai-compatible",
    label: "OpenAI-compatible (custom gateway)",
    kind: "openai_compatible",
    defaultModel: "gpt-4o-mini",
    l1Strategy: "models",
    region: "both",
    hint: "Set OPENAI_COMPATIBLE_BASE_URL on server or pass compatibleBaseUrl",
  },
  {
    slug: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    defaultModel: "claude-3-5-haiku-20241022",
    l1Strategy: "chat",
    region: "global",
  },
  {
    slug: "google",
    label: "Google AI (Gemini)",
    kind: "google",
    defaultModel: "gemini-1.5-flash",
    l1Strategy: "chat",
    region: "global",
  },
  {
    slug: "deepseek",
    label: "DeepSeek",
    kind: "openai_compatible",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    l1Strategy: "chat",
    region: "both",
  },
  {
    slug: "moonshot",
    label: "Moonshot (Kimi)",
    kind: "openai_compatible",
    baseUrl: "https://api.moonshot.cn",
    defaultModel: "moonshot-v1-8k",
    l1Strategy: "models",
    region: "cn",
  },
  {
    slug: "doubao",
    label: "Doubao (Volcengine Ark)",
    kind: "openai_compatible",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModel: "doubao-pro-32k",
    l1Strategy: "chat",
    region: "cn",
    hint: "Use your Ark endpoint id as claimedModel if required by Volcengine",
  },
  {
    slug: "minimax",
    label: "MiniMax",
    kind: "openai_compatible",
    baseUrl: "https://api.minimaxi.com",
    defaultModel: "MiniMax-Text-01",
    l1Strategy: "chat",
    region: "both",
  },
  {
    slug: "zhipu",
    label: "Zhipu GLM",
    kind: "openai_compatible",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
    l1Strategy: "chat",
    region: "cn",
  },
  {
    slug: "qwen",
    label: "Qwen (DashScope)",
    kind: "openai_compatible",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
    defaultModel: "qwen-turbo",
    l1Strategy: "models",
    region: "cn",
  },
  {
    slug: "baichuan",
    label: "Baichuan",
    kind: "openai_compatible",
    baseUrl: "https://api.baichuan-ai.com",
    defaultModel: "Baichuan4-Turbo",
    l1Strategy: "models",
    region: "cn",
  },
  {
    slug: "mistral",
    label: "Mistral",
    kind: "openai_compatible",
    baseUrl: "https://api.mistral.ai",
    defaultModel: "mistral-small-latest",
    l1Strategy: "models",
    region: "global",
  },
  {
    slug: "xai",
    label: "xAI (Grok)",
    kind: "openai_compatible",
    baseUrl: "https://api.x.ai",
    defaultModel: "grok-2-latest",
    l1Strategy: "models",
    region: "global",
  },
  {
    slug: "cohere",
    label: "Cohere",
    kind: "openai_compatible",
    baseUrl: "https://api.cohere.com/compatibility",
    defaultModel: "command-r-plus",
    l1Strategy: "models",
    region: "global",
  },
  {
    slug: "together",
    label: "Together AI",
    kind: "openai_compatible",
    baseUrl: "https://api.together.xyz",
    defaultModel: "meta-llama/Meta-Llama-3-8B-Instruct-Lite",
    l1Strategy: "models",
    region: "global",
  },
  {
    slug: "openrouter",
    label: "OpenRouter",
    kind: "openai_compatible",
    baseUrl: "https://openrouter.ai/api",
    defaultModel: "openai/gpt-4o-mini",
    l1Strategy: "models",
    region: "global",
  },
  {
    slug: "codex",
    label: "OpenAI Codex",
    kind: "openai",
    defaultModel: "gpt-4o-mini",
    l1Strategy: "models",
    region: "global",
    hint: "Codex-class models via OpenAI API",
  },
  {
    slug: "siliconflow",
    label: "SiliconFlow",
    kind: "openai_compatible",
    baseUrl: "https://api.siliconflow.cn",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    l1Strategy: "models",
    region: "cn",
  },
  {
    slug: "custom",
    label: "Custom REST endpoint",
    kind: "custom",
    defaultModel: "gpt-4o-mini",
    l1Strategy: "models",
    region: "both",
    hint: "Provide compatibleBaseUrl for your gateway",
  },
];

const bySlug = new Map(AI_PROVIDER_CATALOG.map((p) => [p.slug, p]));

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9-]/g, "");
}

/** Resolve UI label, slug, or legacy provider string to a catalog profile. */
export function resolveAiProvider(input?: string | null): AiProviderProfile {
  if (!input?.trim()) return bySlug.get("deepseek")!;

  const raw = input.trim();
  const slug = normalizeSlug(raw);

  const direct = bySlug.get(slug);
  if (direct) return direct;

  const legacyAliases: Record<string, string> = {
    openai: "openai",
    "openai-compatible": "openai-compatible",
    openai_compatible: "openai-compatible",
    "google-ai": "google",
    gemini: "google",
    "google-ai-gemini": "google",
    "custom-rest-endpoint": "custom",
    "moonshot-kimi": "moonshot",
    kimi: "moonshot",
    "doubao-bytedance-volcengine": "doubao",
    "doubao-volcengine-ark": "doubao",
    "zhipu-glm": "zhipu",
    "qwen-dashscope": "qwen",
    "qwen-alibaba-dashscope": "qwen",
    "xai-grok": "xai",
    "openai-codex": "codex",
  };

  const alias = legacyAliases[slug];
  if (alias && bySlug.has(alias)) return bySlug.get(alias)!;

  if (slug.includes("anthropic")) return bySlug.get("anthropic")!;
  if (slug.includes("google") || slug.includes("gemini")) return bySlug.get("google")!;
  if (slug.includes("deepseek")) return bySlug.get("deepseek")!;
  if (slug.includes("moonshot") || slug.includes("kimi")) return bySlug.get("moonshot")!;
  if (slug.includes("doubao") || slug.includes("volcengine")) return bySlug.get("doubao")!;
  if (slug.includes("minimax")) return bySlug.get("minimax")!;
  if (slug.includes("zhipu") || slug.includes("glm")) return bySlug.get("zhipu")!;
  if (slug.includes("qwen") || slug.includes("dashscope")) return bySlug.get("qwen")!;
  if (slug.includes("baichuan")) return bySlug.get("baichuan")!;
  if (slug.includes("mistral")) return bySlug.get("mistral")!;
  if (slug.includes("grok") || slug.includes("xai")) return bySlug.get("xai")!;
  if (slug.includes("cohere")) return bySlug.get("cohere")!;
  if (slug.includes("together")) return bySlug.get("together")!;
  if (slug.includes("openrouter")) return bySlug.get("openrouter")!;
  if (slug.includes("siliconflow")) return bySlug.get("siliconflow")!;
  if (slug.includes("codex")) return bySlug.get("codex")!;
  if (slug.includes("custom")) return bySlug.get("custom")!;

  return bySlug.get("openai-compatible")!;
}

export function listAiProviders(): AiProviderProfile[] {
  return [...AI_PROVIDER_CATALOG];
}

export interface ResolvedVerificationProvider {
  profile: AiProviderProfile;
  kind: ProviderKind;
  compatibleBaseUrl?: string;
  defaultModel: string;
  l1Strategy: L1ProbeStrategy;
  listingProviderKind: string;
}

export function resolveVerificationProvider(
  providerInput?: string | null,
  opts?: { compatibleBaseUrl?: string; claimedModel?: string },
): ResolvedVerificationProvider {
  const profile = resolveAiProvider(providerInput);
  const compatibleBaseUrl =
    opts?.compatibleBaseUrl?.trim() ||
    profile.baseUrl ||
    (profile.kind === "custom" || profile.slug === "openai-compatible"
      ? process.env.OPENAI_COMPATIBLE_BASE_URL?.trim()
      : undefined);

  return {
    profile,
    kind: profile.kind,
    compatibleBaseUrl: compatibleBaseUrl || undefined,
    defaultModel: opts?.claimedModel?.trim() || profile.defaultModel,
    l1Strategy: profile.l1Strategy,
    listingProviderKind: profile.slug,
  };
}

/** @deprecated Use resolveVerificationProvider */
export function mapProviderInput(pk: string): ProviderKind {
  return resolveAiProvider(pk).kind;
}
