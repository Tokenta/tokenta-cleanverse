import { jobStore } from "../jobs/store.js";
import { enqueueJob } from "../jobs/worker.js";
import { listingStore } from "../listings/store.js";
import { keyFingerprint } from "../verification/fingerprint.js";
import { checkAbuseBeforeJob } from "../verification/abuse-guard.js";
import { persistListingCreate } from "../db/repository.js";
import { storeListingCredential } from "../security/credential-vault.js";
import { validateBuyerTriggeredJob } from "../verification/buyer-verify-policy.js";
import { sellerNotificationForBuyerVerify } from "../verification/buyer-verify-policy.js";
import { isDbPersistenceEnabled } from "../db/prisma.js";
import type { CreateVerificationJobRequest, ProviderKind } from "../types/verification.js";
import type { TerminalRunMode } from "./types.js";
import { terminalJobIdFromEngine } from "./job-status.js";

export function modeToContext(mode: TerminalRunMode): CreateVerificationJobRequest["context"] {
  switch (mode) {
    case "buyback":
      return "TOKENTA_BUYBACK";
    case "pre_purchase":
      return "PRE_PURCHASE";
    case "rotation":
      return "KEY_ROTATION";
    case "live":
      return "LIVE";
    case "listing":
    case "verify":
    default:
      return "LISTING_DRAFT";
  }
}

export function mapProviderInput(pk: string): ProviderKind {
  const m: Record<string, ProviderKind> = {
    openai: "openai",
    "openai-compatible": "openai",
    anthropic: "anthropic",
    google: "google",
    gemini: "google",
  };
  return m[pk.toLowerCase()] ?? "openai";
}

export type RunJobResult =
  | { ok: true; jobId: string; terminalJobId: string; extra?: Record<string, unknown> }
  | { ok: false; status: number; error: string; code?: string };

export function createEngineJobFromTerminalRun(body: {
  mode: TerminalRunMode;
  provider?: string;
  declaredQuantity: number;
  claimedModel?: string;
  costLiability?: string;
  listingId?: string;
  orderId?: string;
  apiKey: string;
  oldApiKey?: string;
  buybackOfferId?: string;
  payerPaysFee?: boolean;
  buyerId?: string;
  sellerListingId?: string;
  l1Only?: boolean;
}): RunJobResult {
  const context = modeToContext(body.mode);

  if (context === "KEY_ROTATION") {
    if (!body.orderId) return { ok: false, status: 400, error: "orderId required for rotation" };
    if (!body.oldApiKey || body.oldApiKey.length < 8) {
      return { ok: false, status: 400, error: "oldApiKey required (min 8 chars)" };
    }
  }

  if (context === "PRE_PURCHASE") {
    if (!body.orderId) return { ok: false, status: 400, error: "orderId required for pre_purchase" };
    body.payerPaysFee = true;
  }

  const buyerPolicy = validateBuyerTriggeredJob({
    context,
    orderId: body.orderId,
    payerPaysFee: body.payerPaysFee,
    apiKey: body.apiKey,
    declaredQuantity: body.declaredQuantity,
    provider: mapProviderInput(body.provider ?? "openai"),
  });
  if (!buyerPolicy.ok) {
    return { ok: false, status: 400, error: buyerPolicy.message, code: buyerPolicy.code };
  }

  if (!body.apiKey || body.apiKey.length < 8) {
    return { ok: false, status: 400, error: "apiKey required (min 8 chars)" };
  }
  if (!body.declaredQuantity || body.declaredQuantity < 1) {
    return { ok: false, status: 400, error: "declaredQuantity required" };
  }

  const provider = mapProviderInput(body.provider ?? "openai");
  const fp = keyFingerprint(body.apiKey);
  const abuse = checkAbuseBeforeJob(fp);
  if (!abuse.allowed) {
    return { ok: false, status: 429, error: abuse.message ?? "rate limited", code: abuse.code };
  }

  const costLiability =
    context === "PRE_PURCHASE"
      ? "BUYER_TRIGGERED"
      : context === "LIVE"
        ? (body.costLiability ?? "PLATFORM_SUBSIDIZED")
        : (body.costLiability ?? "SELLER_PAID");

  const job = jobStore.create(
    {
      context,
      provider,
      apiKey: body.apiKey,
      oldApiKey: body.oldApiKey,
      declaredQuantity: body.declaredQuantity,
      claimedModel: body.claimedModel ?? "gpt-4o-mini",
      costLiability,
      buybackOfferId: body.buybackOfferId,
      orderId: body.orderId,
      buyerId: body.buyerId,
      sellerListingId: body.sellerListingId,
      payerPaysFee: body.payerPaysFee,
      listingId: body.listingId,
      l1Only: context === "LIVE" ? true : body.l1Only,
    },
    { listingId: body.listingId, keyFingerprint: fp },
  );

  enqueueJob(job.id);

  const extra: Record<string, unknown> = { context };
  if (context === "PRE_PURCHASE" && body.orderId) {
    extra.sellerNotification = sellerNotificationForBuyerVerify(body.orderId);
  }

  return {
    ok: true,
    jobId: job.id,
    terminalJobId: terminalJobIdFromEngine(job.id),
    extra,
  };
}

export async function createListingAndJob(body: {
  apiKey: string;
  quotaToSell: number;
  askPriceUsdc: number;
  providerKind?: string;
  claimedModel?: string;
  autoListAfterVerify?: boolean;
}): RunJobResult & { listingId?: string } {
  if (!body.apiKey || body.apiKey.length < 8) {
    return { ok: false, status: 400, error: "apiKey required" };
  }

  const fp = keyFingerprint(body.apiKey);
  const abuse = checkAbuseBeforeJob(fp);
  if (!abuse.allowed) {
    return { ok: false, status: 429, error: abuse.message ?? "rate limited", code: abuse.code };
  }

  const pk = body.providerKind ?? "openai";
  const provider = mapProviderInput(pk);

  const jobRequest: CreateVerificationJobRequest = {
    context: "LISTING_DRAFT",
    provider,
    apiKey: body.apiKey,
    declaredQuantity: Number(body.quotaToSell),
    claimedModel: body.claimedModel ?? "gpt-4o-mini",
    costLiability: "SELLER_PAID",
    askPriceUsdc: Number(body.askPriceUsdc),
    autoListAfterVerify: body.autoListAfterVerify ?? true,
  };

  const job = jobStore.create(jobRequest, { keyFingerprint: fp });
  const listing = listingStore.create({
    providerKind: pk,
    quotaToSell: jobRequest.declaredQuantity,
    askPriceUsdc: Number(body.askPriceUsdc),
    keyFingerprint: fp,
    autoListAfterVerify: body.autoListAfterVerify ?? true,
    verificationJobId: job.id,
    listingSource: "P2P",
    platformSubsidized: false,
  });

  const credentialRef = await storeListingCredential(listing.id, body.apiKey);
  if (credentialRef) listingStore.setCredentialRef(listing.id, credentialRef);

  jobStore.update(job.id, { listingId: listing.id });
  enqueueJob(job.id);

  const listingForDb = listingStore.get(listing.id) ?? listing;
  void persistListingCreate(listingForDb, job.id).catch(() => {});

  return {
    ok: true,
    jobId: job.id,
    terminalJobId: terminalJobIdFromEngine(job.id),
    listingId: listing.id,
    extra: { listingStatus: listing.status, dbPersistence: isDbPersistenceEnabled() },
  };
}

export function terminalRunAcceptedPayload(jobId: string, extra?: Record<string, unknown>) {
  const tid = terminalJobIdFromEngine(jobId);
  return {
    jobId,
    terminalJobId: tid,
    status: "queued" as const,
    streamUrl: `/api/v1/terminal/job/${tid}/events`,
    receiptUrl: `/api/v1/terminal/receipt/${tid}`,
    proofUrl: null,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}
