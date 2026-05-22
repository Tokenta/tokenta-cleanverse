/** Phase 3.4 — buyer-triggered verification must not consume seller quota without consent */

import type { CreateVerificationJobRequest, JobContext } from "../types/verification.js";

export type BuyerPolicyResult = { ok: true } | { ok: false; code: string; message: string };

/**
 * PRE_PURCHASE jobs use the key supplied in the request body (buyer-funded probe).
 * The platform must never load a seller's stored credential for this context.
 */
export function validateBuyerTriggeredJob(req: CreateVerificationJobRequest): BuyerPolicyResult {
  if (req.context !== "PRE_PURCHASE") return { ok: true };

  if (req.costLiability && req.costLiability !== "BUYER_TRIGGERED") {
    return {
      ok: false,
      code: "SELLER_QUOTA_CONSENT_REQUIRED",
      message: "PRE_PURCHASE must use costLiability BUYER_TRIGGERED",
    };
  }

  if (req.useSellerStoredKey) {
    return {
      ok: false,
      code: "SELLER_QUOTA_CONSENT_REQUIRED",
      message: "Buyer verification cannot use seller stored credentials without explicit consent",
    };
  }

  return { ok: true };
}

export function sellerNotificationForBuyerVerify(orderId: string): string {
  return (
    `Seller notice (order ${orderId}): A buyer may run a separate funded capacity check. ` +
    `This uses buyer-paid probes only and does not debit your listing quota unless you approved shared verification.`
  );
}

export function isUserTriggeredContext(context: JobContext): boolean {
  return (
    context === "LISTING_DRAFT" ||
    context === "TOKENTA_BUYBACK" ||
    context === "PRE_PURCHASE" ||
    context === "KEY_ROTATION"
  );
}
