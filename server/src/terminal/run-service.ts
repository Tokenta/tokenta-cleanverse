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
import type { CreateVerificationJobRequest } from "../types/verification.js";
import type { TerminalRunMode } from "./types.js";
import { terminalJobIdFromEngine } from "./job-status.js";
import { resolveVerificationProvider } from "../verification/providers/catalog.js";

export { mapProviderInput } from "../verification/providers/catalog.js";

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
  compatibleBaseUrl?: string;
}): RunJobResult {
  const context = modeToContext(body.mode);
  const resolved = resolveVerificationProvider(body.provider, {
    compatibleBaseUrl: body.compatibleBaseUrl,
    claimedModel: body.claimedModel,
  });

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
    provider: resolved.kind,
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

  if (
    resolved.listingProviderKind === "openai-compatible" &&
    !resolved.compatibleBaseUrl?.trim()
  ) {
    return {
      ok: false,
      status: 400,
      error:
        "Gateway base URL is required when using OpenAI-compatible (custom gateway). Select DeepSeek or another named provider instead.",
      code: "MISSING_BASE_URL",
    };
  }

  const provider = resolved.kind;
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
      providerSlug: resolved.listingProviderKind,
      apiKey: body.apiKey,
      oldApiKey: body.oldApiKey,
      declaredQuantity: body.declaredQuantity,
      claimedModel: resolved.defaultModel,
      costLiability,
      buybackOfferId: body.buybackOfferId,
      orderId: body.orderId,
      buyerId: body.buyerId,
      sellerListingId: body.sellerListingId,
      payerPaysFee: body.payerPaysFee,
      listingId: body.listingId,
      l1Only: context === "LIVE" ? true : body.l1Only,
      compatibleBaseUrl: resolved.compatibleBaseUrl,
      l1Strategy: resolved.l1Strategy,
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
  sellerWallet?: string | null;
  compatibleBaseUrl?: string;
}): RunJobResult & { listingId?: string } {
  if (!body.apiKey || body.apiKey.length < 8) {
    return { ok: false, status: 400, error: "apiKey required" };
  }

  for (let i = 0; i < body.apiKey.length; i++) {
    const code = body.apiKey.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) {
      return {
        ok: false,
        status: 400,
        error:
          "API key contains non-ASCII characters at index " +
          i +
          " (code " +
          code +
          "). Re-paste only the raw key (no surrounding text or hidden whitespace).",
        code: "INVALID_KEY_FORMAT",
      };
    }
  }

  const fp = keyFingerprint(body.apiKey);
  const abuse = checkAbuseBeforeJob(fp);
  if (!abuse.allowed) {
    return { ok: false, status: 429, error: abuse.message ?? "rate limited", code: abuse.code };
  }

  const resolved = resolveVerificationProvider(body.providerKind, {
    compatibleBaseUrl: body.compatibleBaseUrl,
    claimedModel: body.claimedModel,
  });

  if (
    resolved.listingProviderKind === "openai-compatible" &&
    !resolved.compatibleBaseUrl?.trim()
  ) {
    return {
      ok: false,
      status: 400,
      error:
        "Gateway base URL is required when using OpenAI-compatible (custom gateway). Select DeepSeek or another named provider instead.",
      code: "MISSING_BASE_URL",
    };
  }

  const jobRequest: CreateVerificationJobRequest = {
    context: "LISTING_DRAFT",
    provider: resolved.kind,
    providerSlug: resolved.listingProviderKind,
    apiKey: body.apiKey,
    declaredQuantity: Number(body.quotaToSell),
    claimedModel: resolved.defaultModel,
    costLiability: "SELLER_PAID",
    askPriceUsdc: Number(body.askPriceUsdc),
    autoListAfterVerify: body.autoListAfterVerify ?? true,
    compatibleBaseUrl: resolved.compatibleBaseUrl,
    l1Strategy: resolved.l1Strategy,
  };

  const job = jobStore.create(jobRequest, { keyFingerprint: fp });
  const listing = listingStore.create({
    providerKind: resolved.listingProviderKind,
    quotaToSell: jobRequest.declaredQuantity,
    askPriceUsdc: Number(body.askPriceUsdc),
    keyFingerprint: fp,
    autoListAfterVerify: body.autoListAfterVerify ?? true,
    verificationJobId: job.id,
    listingSource: "P2P",
    platformSubsidized: false,
    sellerWallet: body.sellerWallet ?? null,
  });

  const credentialRef = await storeListingCredential(listing.id, body.apiKey);
  if (credentialRef) listingStore.setCredentialRef(listing.id, credentialRef);

  jobStore.update(job.id, { listingId: listing.id });

  const listingForDb = listingStore.get(listing.id) ?? listing;
  await persistListingCreate(listingForDb, job.id);

  enqueueJob(job.id);

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
