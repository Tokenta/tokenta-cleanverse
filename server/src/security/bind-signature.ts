import { createHmac, timingSafeEqual } from "node:crypto";

export function isBindSignatureRequired(): boolean {
  return process.env.REQUIRE_BIND_SIGNATURE === "true" && !!process.env.BIND_SIGNATURE_SECRET;
}

export function signBindPayload(listingId: string, jobId: string): string {
  const secret = process.env.BIND_SIGNATURE_SECRET ?? "dev-bind-secret";
  return createHmac("sha256", secret).update(`${listingId}:${jobId}`).digest("hex");
}

export function verifyBindSignature(
  listingId: string,
  jobId: string,
  signature: string | undefined,
): boolean {
  if (!isBindSignatureRequired()) return true;
  if (!signature) return false;
  const expected = signBindPayload(listingId, jobId);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
