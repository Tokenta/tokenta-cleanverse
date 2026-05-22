/**
 * Privy wallet JWT — dev HS256 verify or decode-only. Production: JWKS (Privy docs).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import {
  isPrivyJwksVerifyEnabled,
  verifyPrivyJwtJwks,
} from "./privy-jwks.js";

export function isPrivyJwtMode(): boolean {
  return process.env.PRIVY_JWT_MODE === "true";
}

export function isPrivyJwtVerifyEnabled(): boolean {
  return (
    process.env.PRIVY_JWT_VERIFY === "true" &&
    !!process.env.PRIVY_JWT_DEV_SECRET
  );
}

export function isPrivyJwtVerifyActive(): boolean {
  return isPrivyJwtVerifyEnabled() || isPrivyJwksVerifyEnabled();
}

function base64UrlDecode(segment: string): Buffer {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  return Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function verifyHs256(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, sig] = parts;
  const data = `${header}.${payload}`;
  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig!, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function decodeWalletFromPayload(payload: Record<string, unknown>): string | null {
  const wallet =
    (payload.wallet_address as string) ??
    (payload.sub as string) ??
    (payload.address as string);
  if (wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return wallet.toLowerCase();
  }
  return null;
}

export function decodeWalletFromJwt(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]!).toString("utf8")) as Record<
      string,
      unknown
    >;
    return decodeWalletFromPayload(payload);
  } catch {
    return null;
  }
}

export async function verifyPrivyJwt(
  token: string,
): Promise<{ ok: boolean; wallet: string | null }> {
  if (isPrivyJwksVerifyEnabled()) {
    try {
      const valid = await verifyPrivyJwtJwks(token);
      if (!valid) return { ok: false, wallet: null };
    } catch {
      return { ok: false, wallet: null };
    }
  } else if (isPrivyJwtVerifyEnabled()) {
    const secret = process.env.PRIVY_JWT_DEV_SECRET!;
    if (!verifyHs256(token, secret)) {
      return { ok: false, wallet: null };
    }
  }
  return { ok: true, wallet: decodeWalletFromJwt(token) };
}

/** When PRIVY_JWT_MODE=true, Bearer JWT sets wallet if X-Wallet-Address absent. */
export async function privyJwtMiddleware(c: Context, next: Next): Promise<Response | void> {
  if (!isPrivyJwtMode()) return next();

  const existing = c.get("walletAddress") as string | undefined;
  if (existing) return next();

  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token === process.env.API_DEV_TOKEN) return next();

  const { ok, wallet } = await verifyPrivyJwt(token);
  if (!ok) {
    return c.json({ error: "invalid privy jwt", code: "PRIVY_JWT_INVALID" }, 401);
  }
  if (wallet) c.set("walletAddress", wallet);
  return next();
}

/** Build a dev HS256 JWT for tests (PRIVY_JWT_DEV_SECRET). */
export function signDevPrivyJwt(wallet: string, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({ wallet_address: wallet, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}
