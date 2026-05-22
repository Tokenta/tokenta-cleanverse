import { createHmac, timingSafeEqual } from "node:crypto";

export function isEscrowSignatureRequired(): boolean {
  return process.env.REQUIRE_ESCROW_SIGNATURE === "true" && !!process.env.ESCROW_SIGNATURE_SECRET;
}

export function signEscrowPayload(orderId: string, amountUsdc: string, action: string): string {
  const secret = process.env.ESCROW_SIGNATURE_SECRET ?? "dev-escrow-secret";
  return createHmac("sha256", secret)
    .update(`${orderId}:${amountUsdc}:${action}`)
    .digest("hex");
}

export function verifyEscrowSignature(
  orderId: string,
  amountUsdc: string,
  action: string,
  signature: string | undefined,
): boolean {
  if (!isEscrowSignatureRequired()) return true;
  if (!signature) return false;
  const expected = signEscrowPayload(orderId, amountUsdc, action);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
