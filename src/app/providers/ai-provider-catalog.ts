/** UI catalog — keep slugs aligned with server/src/verification/providers/catalog.ts */

export type AiProviderOption = {
  slug: string;
  label: string;
  defaultModel: string;
  region: "global" | "cn" | "both";
  hint?: string;
  requiresBaseUrl?: boolean;
};

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  { slug: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini", region: "global" },
  {
    slug: "openai-compatible",
    label: "OpenAI-compatible (custom gateway)",
    defaultModel: "gpt-4o-mini",
    region: "both",
    requiresBaseUrl: true,
  },
  { slug: "anthropic", label: "Anthropic", defaultModel: "claude-3-5-haiku-20241022", region: "global" },
  { slug: "google", label: "Google AI (Gemini)", defaultModel: "gemini-1.5-flash", region: "global" },
  { slug: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat", region: "both" },
  { slug: "moonshot", label: "Moonshot (Kimi)", defaultModel: "moonshot-v1-8k", region: "cn" },
  {
    slug: "doubao",
    label: "Doubao (Volcengine Ark)",
    defaultModel: "doubao-pro-32k",
    region: "cn",
    hint: "Use your Ark endpoint id as model if required",
  },
  { slug: "minimax", label: "MiniMax", defaultModel: "MiniMax-Text-01", region: "both" },
  { slug: "zhipu", label: "Zhipu GLM", defaultModel: "glm-4-flash", region: "cn" },
  { slug: "qwen", label: "Qwen (DashScope)", defaultModel: "qwen-turbo", region: "cn" },
  { slug: "baichuan", label: "Baichuan", defaultModel: "Baichuan4-Turbo", region: "cn" },
  { slug: "mistral", label: "Mistral", defaultModel: "mistral-small-latest", region: "global" },
  { slug: "xai", label: "xAI (Grok)", defaultModel: "grok-2-latest", region: "global" },
  { slug: "cohere", label: "Cohere", defaultModel: "command-r-plus", region: "global" },
  {
    slug: "together",
    label: "Together AI",
    defaultModel: "meta-llama/Meta-Llama-3-8B-Instruct-Lite",
    region: "global",
  },
  { slug: "openrouter", label: "OpenRouter", defaultModel: "openai/gpt-4o-mini", region: "global" },
  {
    slug: "codex",
    label: "OpenAI Codex",
    defaultModel: "gpt-4o-mini",
    region: "global",
    hint: "Codex-class models via OpenAI API",
  },
  { slug: "siliconflow", label: "SiliconFlow", defaultModel: "deepseek-ai/DeepSeek-V3", region: "cn" },
  {
    slug: "custom",
    label: "Custom REST endpoint",
    defaultModel: "gpt-4o-mini",
    region: "both",
    requiresBaseUrl: true,
  },
];

export function getProviderOption(slug: string): AiProviderOption {
  return AI_PROVIDER_OPTIONS.find((p) => p.slug === slug) ?? AI_PROVIDER_OPTIONS[1]!;
}

export function defaultModelForProvider(slug: string): string {
  return getProviderOption(slug).defaultModel;
}
