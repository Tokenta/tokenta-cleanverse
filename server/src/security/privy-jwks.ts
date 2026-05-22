/**
 * Privy JWT RS256 verification via JWKS (production path).
 */

import { createPublicKey, createVerify } from "node:crypto";

export interface JwkKey {
  kty: string;
  kid?: string;
  alg?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
}

interface JwksCache {
  keys: JwkKey[];
  fetchedAt: number;
}

let cache: JwksCache | null = null;
const CACHE_TTL_MS = Number(process.env.PRIVY_JWKS_CACHE_MS ?? 300_000);

export function isPrivyJwksVerifyEnabled(): boolean {
  return (
    process.env.PRIVY_JWT_VERIFY === "jwks" &&
    !!process.env.PRIVY_JWKS_URL
  );
}

export function resetJwksCacheForTest(): void {
  cache = null;
}

function base64UrlDecode(segment: string): Buffer {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  return Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export async function fetchJwks(url: string): Promise<JwkKey[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.keys;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys?: JwkKey[] };
  const keys = body.keys ?? [];
  cache = { keys, fetchedAt: now };
  return keys;
}

export function verifyRs256WithJwks(token: string, keys: JwkKey[]): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerB64!).toString("utf8")) as {
      alg?: string;
      kid?: string;
    };
  } catch {
    return false;
  }

  if (header.alg !== "RS256") return false;

  const candidates = keys.filter(
    (k) => k.kty === "RSA" && (!header.kid || k.kid === header.kid),
  );
  const data = `${headerB64}.${payloadB64}`;
  const sig = base64UrlDecode(sigB64!);

  for (const key of candidates) {
    if (!key.n || !key.e) continue;
    try {
      const pub = createPublicKey({
        key: { kty: "RSA", n: key.n, e: key.e },
        format: "jwk",
      });
      const ok = createVerify("RSA-SHA256").update(data).verify(pub, sig);
      if (ok) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export async function verifyPrivyJwtJwks(token: string): Promise<boolean> {
  const url = process.env.PRIVY_JWKS_URL;
  if (!url) return false;
  const keys = await fetchJwks(url);
  return verifyRs256WithJwks(token, keys);
}
