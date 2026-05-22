/**
 * Optional wallet session header — placeholder until Privy JWT integration.
 * WALLET_AUTH=true requires X-Wallet-Address on mutating /api/v1 routes.
 */

import type { Context, Next } from "hono";

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function isWalletAuthRequired(): boolean {
  return process.env.WALLET_AUTH === "true";
}

export async function walletAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  if (!isWalletAuthRequired()) {
    return next();
  }

  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  const wallet = c.req.header("X-Wallet-Address")?.trim();
  if (!wallet || !ETH_ADDRESS.test(wallet)) {
    return c.json({ error: "X-Wallet-Address required", code: "WALLET_REQUIRED" }, 401);
  }

  c.set("walletAddress", wallet.toLowerCase());
  return next();
}
