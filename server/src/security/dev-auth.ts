/**
 * Optional API auth — engine §15. Disabled by default for local dev.
 * Set REQUIRE_API_AUTH=true and API_DEV_TOKEN=<secret> to enforce Bearer token.
 */

import type { Context, Next } from "hono";

export function isApiAuthRequired(): boolean {
  return process.env.REQUIRE_API_AUTH === "true" && !!process.env.API_DEV_TOKEN;
}

export async function apiAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  if (!isApiAuthRequired()) {
    return next();
  }

  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (token && token === process.env.API_DEV_TOKEN) {
    return next();
  }

  return c.json({ error: "unauthorized", code: "AUTH_REQUIRED" }, 401);
}
