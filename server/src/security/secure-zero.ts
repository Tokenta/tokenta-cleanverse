/** Best-effort in-memory secret zeroization after job finalize (§15). */

export function secureZero(value: string): void {
  if (typeof value !== "string" || value.length === 0) return;
  try {
    const buf = Buffer.from(value, "utf8");
    buf.fill(0);
  } catch {
    /* ignore */
  }
}

export function secureZeroFields(obj: { apiKey?: string; oldApiKey?: string }): void {
  if (obj.apiKey) secureZero(obj.apiKey);
  if (obj.oldApiKey) secureZero(obj.oldApiKey);
  obj.apiKey = "";
  obj.oldApiKey = "";
}
