/** OpenAI-compatible API base URL (engine §5.4, mechanism §13) */

import type { ProviderKind } from "../../types/verification.js";
import { resolveVerificationProvider } from "./catalog.js";

/** Strip trailing slash and a single trailing /v1 so paths like /v1/models are not doubled. */
export function normalizeOpenAiApiBase(url: string): string {
  let base = url.trim().replace(/\/$/, "");
  if (base.endsWith("/v1")) base = base.slice(0, -3);
  return base;
}

export function resolveOpenAiCompatibleBaseUrl(
  provider: ProviderKind,
  override?: string,
  providerSlug?: string,
): string {
  if (override?.trim()) {
    return normalizeOpenAiApiBase(override);
  }
  if (providerSlug?.trim()) {
    const resolved = resolveVerificationProvider(providerSlug);
    if (resolved.compatibleBaseUrl?.trim()) {
      return normalizeOpenAiApiBase(resolved.compatibleBaseUrl);
    }
  }
  if (provider === "openai") {
    return "https://api.openai.com";
  }
  if (provider === "openai_compatible" || provider === "custom") {
    const env = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim();
    if (env) return normalizeOpenAiApiBase(env);
    throw new Error(
      "MISSING_COMPATIBLE_BASE_URL: select a provider (e.g. deepseek) or set a gateway base URL",
    );
  }
  return "https://api.openai.com";
}

const DEFAULT_PROBE_TIMEOUT_MS = Number(process.env.PROBE_HTTP_TIMEOUT_MS ?? 30_000);

function transportCauseMessage(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  const parts = [e.message];
  const cause = (e as Error & { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message && cause.message !== e.message) {
    parts.push(cause.message);
  }
  return parts.join(" — ");
}

export function formatProbeTransportError(url: string, e: unknown): string {
  const detail = transportCauseMessage(e);
  const proxyHint =
    process.env.HTTPS_PROXY || process.env.HTTP_PROXY
      ? " (proxy env is set)"
      : "";
  return (
    `PROBE_NETWORK_UNREACHABLE: cannot reach ${url}${proxyHint}. ` +
    `${detail}. ` +
    `Check VPN/firewall, provider base URL, or set HTTPS_PROXY if required.`
  );
}

export async function safeProviderFetch(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`PROBE_TIMEOUT: request to ${url} timed out after ${timeoutMs}ms`);
    }
    if (e instanceof Error && e.message.includes("Cannot convert argument to a ByteString")) {
      throw new Error(
        "INVALID_KEY_FORMAT: API key contains non-ASCII characters (likely pasted text or hidden whitespace). Re-paste only the raw key.",
      );
    }
    if (
      e instanceof Error &&
      (e.message === "fetch failed" ||
        e.message.includes("ENOTFOUND") ||
        e.message.includes("ECONNREFUSED") ||
        e.message.includes("ECONNRESET") ||
        e.message.includes("ETIMEDOUT") ||
        e.message.includes("certificate") ||
        e.message.includes("TLS") ||
        e.cause)
    ) {
      throw new Error(formatProbeTransportError(url, e));
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
