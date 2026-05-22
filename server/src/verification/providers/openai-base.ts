/** OpenAI-compatible API base URL (engine §5.4, mechanism §13) */

import type { ProviderKind } from "../../types/verification.js";

export function resolveOpenAiCompatibleBaseUrl(
  provider: ProviderKind,
  override?: string,
): string {
  if (override?.trim()) {
    return override.trim().replace(/\/$/, "");
  }
  if (provider === "openai_compatible" || provider === "custom") {
    const env = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim();
    if (env) return env.replace(/\/$/, "");
  }
  return "https://api.openai.com";
}
