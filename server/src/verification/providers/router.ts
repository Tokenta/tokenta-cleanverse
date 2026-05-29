/** Provider-agnostic L1/L2 dispatch */

import type { ProviderKind } from "../../types/verification.js";
import type { LivenessResult, MicroProbeResult, OpenAIProbeContext } from "./openai.js";
import { openaiLiveness, openaiMicroProbe, resolveProbeModel } from "./openai.js";
import { anthropicLiveness, anthropicMicroProbe } from "./anthropic.js";
import { geminiLiveness, geminiMicroProbe, resolveGeminiProbeModel } from "./gemini.js";

export function defaultProbeModel(provider: ProviderKind, claimed?: string): string {
  switch (provider) {
    case "anthropic":
      return claimed ?? "claude-3-5-haiku-20241022";
    case "google":
      return claimed ?? "gemini-1.5-flash";
    case "openai_compatible":
    case "custom":
      return claimed ?? "gpt-4o-mini";
    default:
      return claimed ?? "gpt-4o-mini";
  }
}

export async function runLiveness(
  provider: ProviderKind,
  ctx: OpenAIProbeContext,
): Promise<LivenessResult> {
  switch (provider) {
    case "anthropic":
      return anthropicLiveness(ctx);
    case "google":
      return geminiLiveness(ctx);
    case "openai_compatible":
    case "custom":
      return openaiLiveness({ ...ctx, provider });
    default:
      return openaiLiveness({ ...ctx, provider: "openai" });
  }
}

export async function runMicroProbe(
  provider: ProviderKind,
  ctx: OpenAIProbeContext,
): Promise<MicroProbeResult> {
  switch (provider) {
    case "anthropic":
      return anthropicMicroProbe(ctx);
    case "google":
      return geminiMicroProbe(ctx);
    case "openai_compatible":
    case "custom":
      return openaiMicroProbe({ ...ctx, provider });
    default:
      return openaiMicroProbe({ ...ctx, provider: "openai" });
  }
}

export function resolveProbeModelForProvider(
  provider: ProviderKind,
  claimed: string | undefined,
  modelIds: string[],
): string {
  switch (provider) {
    case "google":
      return resolveGeminiProbeModel(claimed, modelIds);
    case "anthropic":
      return claimed && modelIds.includes(claimed) ? claimed : modelIds[0] ?? defaultProbeModel(provider);
    default:
      return resolveProbeModel(claimed, modelIds);
  }
}
