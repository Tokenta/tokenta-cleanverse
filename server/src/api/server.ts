import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { jobStore } from "../jobs/store.js";
import { enqueueJob } from "../jobs/worker.js";
import { buildVerifyFeed } from "../jobs/feed.js";
import { listingStore } from "../listings/store.js";
import { keyFingerprint } from "../verification/fingerprint.js";
import type { CreateVerificationJobRequest, ProviderKind } from "../types/verification.js";
import { checkAbuseBeforeJob } from "../verification/abuse-guard.js";
import { resolveVerificationProvider } from "../verification/providers/catalog.js";
import { persistListingCreate } from "../db/repository.js";
import { buybackStore } from "../buyback/store.js";
import { listOrderVerification } from "../orders/verification-trail.js";
import { getFraudMonitor, runFraudCheck } from "../verification/fraud-monitor.js";
import { tickMonitorStates } from "../live-monitor/state.js";
import {
  validateBuyerTriggeredJob,
  sellerNotificationForBuyerVerify,
} from "../verification/buyer-verify-policy.js";
import { queueBackend } from "../jobs/queue.js";
import { isDbPersistenceEnabled } from "../db/prisma.js";
import { listAudit, recordAudit, type AuditEventType } from "../security/audit-log.js";
import { storeListingCredential } from "../security/credential-vault.js";
import { apiAuthMiddleware, isApiAuthRequired } from "../security/dev-auth.js";
import { walletAuthMiddleware, isWalletAuthRequired } from "../security/wallet-auth.js";
import { privyJwtMiddleware, isPrivyJwtMode } from "../security/privy-jwt.js";
import { verifyBindSignature } from "../security/bind-signature.js";
import { getModelPinRegistry, getModelPinRegistryVersion } from "../verification/model-pin-registry.js";
import { providerLimiterStats } from "../jobs/provider-limiter.js";
import { globalCacheStore } from "../verification/cache-store.js";
import { renderPrometheusMetrics } from "../metrics/prometheus.js";
import {
  getProofAnchor,
  registerProofAnchor,
  confirmMockAnchor,
} from "../verification/proof-anchor.js";
import { computeProofComposition } from "../metrics/proof-composition.js";
import { fundEscrow, releaseEscrow, getEscrow } from "../orders/escrow.js";
import { signEscrowPayload } from "../security/escrow-signature.js";
import { getWorkerTopology } from "../jobs/worker-regions.js";
import { isPrivyJwksVerifyEnabled } from "../security/privy-jwks.js";
import { confirmAnchorOnChain, confirmMockAnchor } from "../verification/proof-anchor.js";
import { opsUnlockFingerprint, opsInvalidateCache } from "./admin-ops.js";
import { verificationOpenApi } from "./openapi-verification.js";
import { signBindPayload } from "../security/bind-signature.js";
import { getBullQueueStats } from "../jobs/bull-queue-stats.js";
import {
  listWorkerHeartbeats,
  recordWorkerHeartbeat,
} from "../jobs/worker-heartbeat.js";
import { isHashicorpVaultEnabled } from "../security/hashicorp-vault.js";
import { terminalApp } from "./terminal-routes.js";

const app = new Hono();

const corsOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://terminal.tokenta.space",
  "https://www.terminal.tokenta.space",
];
if (process.env.CORS_ORIGIN) {
  corsOrigins.push(
    ...process.env.CORS_ORIGIN.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  );
}

app.use(
  "/*",
  cors({
    origin: corsOrigins,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Wallet-Address", "X-Terminal-Session", "Last-Event-ID"],
  }),
);

app.route("/", terminalApp);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "tokenta-verification",
    queueBackend: queueBackend(),
    dbPersistence: isDbPersistenceEnabled(),
    devCredentialVault: process.env.DEV_CREDENTIAL_VAULT === "true",
    apiAuthRequired: isApiAuthRequired(),
    walletAuthRequired: isWalletAuthRequired(),
    privyJwtMode: isPrivyJwtMode(),
    privyJwtVerify: process.env.PRIVY_JWT_VERIFY === "true" || isPrivyJwksVerifyEnabled(),
    privyJwks: isPrivyJwksVerifyEnabled(),
    proofAnchorAutoMock: process.env.PROOF_ANCHOR_AUTO_MOCK === "true",
    workerRegion: process.env.WORKER_REGION ?? "local",
    kmsVault: process.env.KMS_VAULT_ENABLED === "true",
    zkTeeAttestMock: process.env.ZK_TEE_ATTEST_MOCK === "true",
    hashicorpVault: isHashicorpVaultEnabled(),
  }),
);

app.use("/api/v1/*", apiAuthMiddleware);
app.use("/api/v1/*", privyJwtMiddleware);
app.use("/api/v1/*", walletAuthMiddleware);

app.get("/health/db", async (c) => {
  return c.json({ ok: true, mode: "in-memory", message: "Database persistence disabled" });
});

app.get("/api/v1/admin/audit-log", (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const type = c.req.query("type") as AuditEventType | undefined;
  return c.json({ entries: listAudit(limit, type) });
});

app.get("/api/v1/admin/worker-topology", (c) => {
  return c.json(getWorkerTopology());
});

app.get("/api/v1/openapi.json", (c) => c.json(verificationOpenApi));
app.get("/api/v1/docs", (c) =>
  c.html(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Tokenta API Docs</title></head>
<body style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background:#000; color:#fff; padding:24px">
  <h2>Tokenta API Docs</h2>
  <ul>
    <li><a href="/api/v1/terminal/docs" style="color:#8be9fd">Terminal API Swagger</a></li>
    <li><a href="/api/v1/openapi.json" style="color:#8be9fd">Verification OpenAPI JSON</a></li>
    <li><a href="/api/v1/terminal/openapi.json" style="color:#8be9fd">Terminal OpenAPI JSON</a></li>
  </ul>
</body>
</html>`),
);

app.get("/api/v1/admin/worker-heartbeats", (c) => {
  return c.json({ workers: listWorkerHeartbeats() });
});

app.post("/api/v1/admin/worker-heartbeat", (c) => {
  const entry = recordWorkerHeartbeat();
  return c.json({ heartbeat: entry });
});

app.post("/api/v1/dev/bind/sign", async (c) => {
  const body = await c.req.json<{ listingId: string; jobId: string }>();
  if (!body.listingId || !body.jobId) {
    return c.json({ error: "listingId and jobId required" }, 400);
  }
  return c.json({ signature: signBindPayload(body.listingId, body.jobId) });
});

app.post("/api/v1/admin/locks/:fingerprint/unlock", async (c) => {
  const fingerprint = c.req.param("fingerprint");
  const body = await c.req.json<{ reason?: string }>().catch(() => ({}));
  const result = opsUnlockFingerprint(fingerprint, body.reason ?? "ops_unlock");
  if (!result.ok) return c.json({ error: result.error }, 409);
  return c.json({ fingerprint, state: result.state });
});

app.get("/api/v1/admin/model-pin-registry", (c) => {
  return c.json({
    version: getModelPinRegistryVersion(),
    registry: getModelPinRegistry(),
  });
});

app.post("/api/v1/listings", async (c) => {
  const body = await c.req.json<{
    provider?: string;
    providerKind?: string;
    apiKey: string;
    quotaToSell: number;
    askPriceUsdc: number;
    autoListAfterVerify?: boolean;
    claimedModel?: string;
    listingSource?: "P2P" | "TOKENTA_DIRECT";
    platformSubsidized?: boolean;
  }>();

  if (!body.apiKey || body.apiKey.length < 8) {
    return c.json({ error: "apiKey required" }, 400);
  }

  const fp = keyFingerprint(body.apiKey);
  const abuse = checkAbuseBeforeJob(fp);
  if (!abuse.allowed) {
    return c.json({ error: abuse.message, code: abuse.code }, 429);
  }

  const resolved = resolveVerificationProvider(body.providerKind ?? body.provider, {
    claimedModel: body.claimedModel,
  });

  const jobRequest: CreateVerificationJobRequest = {
    context: "LISTING_DRAFT",
    provider: resolved.kind,
    providerSlug: resolved.listingProviderKind,
    apiKey: body.apiKey,
    declaredQuantity: Number(body.quotaToSell),
    claimedModel: resolved.defaultModel,
    costLiability: body.platformSubsidized ? "PLATFORM_SUBSIDIZED" : "SELLER_PAID",
    askPriceUsdc: Number(body.askPriceUsdc),
    autoListAfterVerify: body.autoListAfterVerify ?? true,
    l1Only: body.platformSubsidized ? true : undefined,
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
    listingSource: body.listingSource ?? "P2P",
    platformSubsidized: body.platformSubsidized ?? false,
  });

  const credentialRef = await storeListingCredential(listing.id, body.apiKey);
  if (credentialRef) listingStore.setCredentialRef(listing.id, credentialRef);

  jobStore.update(job.id, { listingId: listing.id });
  jobRequest.listingId = listing.id;

  enqueueJob(job.id);

  const listingForDb = listingStore.get(listing.id) ?? listing;
  void persistListingCreate(listingForDb, job.id).catch((err) => {
    console.warn("[persist] listing create failed:", err);
  });

  return c.json(
    {
      listingId: listing.id,
      listingStatus: listing.status,
      jobId: job.id,
      streamUrl: `/api/v1/verification/jobs/${job.id}/events`,
      pollUrl: `/api/v1/verification/jobs/${job.id}`,
      dbPersistence: isDbPersistenceEnabled(),
    },
    202,
  );
});

app.get("/api/v1/market/listings", (c) => {
  const rows = listingStore.listLive().map((l) => listingStore.toMarketRow(l));
  return c.json({ listings: rows });
});

app.get("/api/v1/listings/mine", (c) => {
  return c.json({ listings: listingStore.listMine() });
});

app.get("/api/v1/listings/:listingId", (c) => {
  const listing = listingStore.get(c.req.param("listingId"));
  if (!listing) return c.json({ error: "not found" }, 404);
  return c.json({ listing });
});

app.post("/api/v1/listings/:listingId/bind-verification", async (c) => {
  const listingId = c.req.param("listingId");
  const body = await c.req.json<{ jobId?: string; signature?: string }>();
  const listing = listingStore.get(listingId);
  if (!listing) return c.json({ error: "listing not found" }, 404);

  const jobId = body.jobId ?? listing.verificationJobId;
  if (!jobId) return c.json({ error: "no job linked" }, 400);
  if (!verifyBindSignature(listingId, jobId, body.signature)) {
    return c.json({ error: "invalid bind signature", code: "BIND_SIGNATURE_INVALID" }, 401);
  }

  const job = jobStore.get(jobId);
  if (!job?.proof) return c.json({ error: "proof not ready" }, 409);

  const updated = listingStore.bindVerification(listingId, job.proof);
  recordAudit({
    type: "BIND_VERIFICATION",
    listingId,
    jobId,
    proofHash: job.proof.proofHash,
  });
  return c.json({ listing: updated, proofHash: job.proof.proofHash });
});

app.post("/api/v1/verification/jobs", async (c) => {
  const body = await c.req.json<CreateVerificationJobRequest>();

  const context = body.context ?? "LISTING_DRAFT";

  if (context === "KEY_ROTATION") {
    if (!body.orderId) return c.json({ error: "orderId required for KEY_ROTATION" }, 400);
    if (!body.oldApiKey || body.oldApiKey.length < 8) {
      return c.json({ error: "oldApiKey required (min 8 chars)" }, 400);
    }
  }

  if (context === "PRE_PURCHASE") {
    if (!body.orderId) return c.json({ error: "orderId required for PRE_PURCHASE" }, 400);
    if (!body.payerPaysFee) {
      return c.json({ error: "payerPaysFee must be true for buyer-triggered verification" }, 400);
    }
    body.costLiability = "BUYER_TRIGGERED";
  }

  const buyerPolicy = validateBuyerTriggeredJob({ ...body, context });
  if (!buyerPolicy.ok) {
    return c.json({ error: buyerPolicy.message, code: buyerPolicy.code }, 400);
  }

  if (!body.apiKey || body.apiKey.length < 8) {
    return c.json({ error: "apiKey required (min 8 chars)" }, 400);
  }
  if (!body.declaredQuantity || body.declaredQuantity < 1) {
    return c.json({ error: "declaredQuantity required" }, 400);
  }

  const provider: ProviderKind = body.provider ?? "openai";
  const fp = keyFingerprint(body.apiKey);
  const abuse = checkAbuseBeforeJob(fp);
  if (!abuse.allowed) {
    return c.json({ error: abuse.message, code: abuse.code }, 429);
  }

  const costLiability =
    context === "PRE_PURCHASE"
      ? "BUYER_TRIGGERED"
      : context === "LIVE"
        ? (body.costLiability ?? "PLATFORM_SUBSIDIZED")
        : (body.costLiability ?? "SELLER_PAID");

  if (context === "LIVE") {
    body.l1Only = true;
  }

  const job = jobStore.create(
    {
      ...body,
      context,
      provider,
      costLiability,
    },
    { listingId: body.listingId, keyFingerprint: fp },
  );

  enqueueJob(job.id);

  const payload: Record<string, unknown> = {
    ...jobStore.toResponse(job),
    context,
    buybackOfferId: body.buybackOfferId,
    streamUrl: `/api/v1/verification/jobs/${job.id}/events`,
    queueBackend: queueBackend(),
  };
  if (context === "PRE_PURCHASE" && body.orderId) {
    payload.sellerNotification = sellerNotificationForBuyerVerify(body.orderId);
  }

  return c.json(payload, 202);
});

app.post("/api/v1/sell/tokenta-buyback/confirm", async (c) => {
  const body = await c.req.json<{
    verificationJobId?: string;
    jobId?: string;
    buybackOfferId: string;
    quantity: number;
    depositAcknowledged?: boolean;
  }>();

  const jobId = body.verificationJobId ?? body.jobId;
  if (!jobId) return c.json({ error: "verificationJobId required" }, 400);
  if (!body.buybackOfferId) return c.json({ error: "buybackOfferId required" }, 400);
  if (!body.depositAcknowledged) {
    return c.json({ error: "depositAcknowledged required" }, 400);
  }

  const job = jobStore.get(jobId);
  if (!job?.proof) return c.json({ error: "verification not complete" }, 409);
  if (job.request.context !== "TOKENTA_BUYBACK") {
    return c.json({ error: "job is not a buyback verification" }, 400);
  }
  if (job.proof.terminalOutcome !== "PASS") {
    return c.json(
      {
        error: "verification did not pass",
        terminalOutcome: job.proof.terminalOutcome,
        failureCode: job.proof.failureCode,
      },
      409,
    );
  }

  const existing = buybackStore.getByJob(jobId);
  if (existing) {
    return c.json({ confirmation: existing, alreadyConfirmed: true }, 200);
  }

  const confirmation = buybackStore.confirm({
    jobId,
    buybackOfferId: body.buybackOfferId,
    quantity: Number(body.quantity),
    proofHash: job.proof.proofHash,
  });

  return c.json(
    {
      orderId: confirmation.orderId,
      escrowId: confirmation.escrowId,
      rotationDeadline: confirmation.rotationDeadline,
      confirmation,
    },
    201,
  );
});

app.get("/api/v1/verification/jobs/:jobId", (c) => {
  const jobId = c.req.param("jobId");
  const job = jobStore.get(jobId);
  if (!job) return c.json({ error: "not found" }, 404);
  const listing = job.listingId ? listingStore.get(job.listingId) : undefined;
  return c.json({
    ...jobStore.toResponse(job),
    listingId: job.listingId,
    listingStatus: listing?.status,
    events: job.events,
    snapshotAt: new Date().toISOString(),
  });
});

app.get("/api/v1/verification/jobs/:jobId/events", (c) => {
  const jobId = c.req.param("jobId");
  const job = jobStore.get(jobId);
  if (!job) return c.json({ error: "not found" }, 404);

  return streamSSE(c, async (stream) => {
    const lastEventId = c.req.header("Last-Event-ID");
    let skipUntilFound = !!lastEventId;

    for (const ev of job.events) {
      if (skipUntilFound) {
        if (ev.timestamp === lastEventId) skipUntilFound = false;
        continue;
      }
      await stream.writeSSE({
        data: JSON.stringify(ev),
        event: ev.type,
        id: ev.timestamp,
      });
    }

    if (job.status === "PASSED" || job.status === "FAILED") {
      return;
    }

    await new Promise<void>((resolve) => {
      const unsub = jobStore.subscribe(jobId, async (ev) => {
        await stream.writeSSE({
          data: JSON.stringify(ev),
          event: ev.type,
          id: ev.timestamp,
        });
        if (ev.type === "job_completed" || ev.type === "job_failed") {
          unsub();
          resolve();
        }
      });

      setTimeout(() => {
        unsub();
        resolve();
      }, 120_000);
    });
  });
});

app.get("/api/v1/verification/proofs/:proofHash", (c) => {
  const proofHash = c.req.param("proofHash");
  const job = jobStore.findByProofHash(proofHash);
  if (!job?.proof) return c.json({ error: "not found" }, 404);

  const payload = {
    proofId: proofHash,
    proof: job.proof,
    jobId: job.id,
    listingId: job.listingId,
    exportedAt: new Date().toISOString(),
  };

  const download =
    c.req.query("download") === "1" || c.req.query("format") === "attachment";
  if (download) {
    const filename = `tokenta-proof-${proofHash.slice(0, 16)}.json`;
    return c.body(JSON.stringify(payload, null, 2), 200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
  }

  return c.json(payload);
});

app.get("/api/v1/verification/proofs/:proofHash/anchor", (c) => {
  const proofHash = c.req.param("proofHash");
  const anchor = getProofAnchor(proofHash);
  if (!anchor) {
    return c.json({ proofHash, status: "NONE" as const });
  }
  return c.json({ anchor });
});

app.post("/api/v1/verification/proofs/:proofHash/anchor", async (c) => {
  const proofHash = c.req.param("proofHash");
  const job = jobStore.findByProofHash(proofHash);
  if (!job?.proof) return c.json({ error: "proof not found" }, 404);

  const body = await c.req.json<{ confirmMock?: boolean }>().catch(() => ({}));
  const anchor = registerProofAnchor({
    proofHash,
    jobId: job.id,
    listingId: job.listingId,
  });
  if (body.confirmMock) {
    confirmMockAnchor(proofHash);
  } else if (process.env.PROOF_ANCHOR_AUTO_MOCK === "true") {
    await confirmAnchorOnChain(proofHash);
  }
  return c.json({ anchor: getProofAnchor(proofHash) ?? anchor }, 202);
});

app.post("/api/v1/admin/cache/invalidate", async (c) => {
  const body = await c.req.json<{ keyFingerprint?: string }>();
  if (!body.keyFingerprint) {
    return c.json({ error: "keyFingerprint required" }, 400);
  }
  opsInvalidateCache(body.keyFingerprint, "ops_override");
  return c.json({ ok: true, keyFingerprint: body.keyFingerprint });
});

app.get("/api/v1/verification/feed", (c) => {
  return c.json({ rows: buildVerifyFeed(100) });
});

app.get("/api/v1/orders/:orderId/verification-trail", (c) => {
  const orderId = c.req.param("orderId");
  return c.json({ orderId, entries: listOrderVerification(orderId) });
});

app.get("/api/v1/orders/:orderId/fraud-monitor", (c) => {
  const orderId = c.req.param("orderId");
  const record = getFraudMonitor(orderId);
  if (!record) return c.json({ orderId, status: "NOT_SCHEDULED" });
  return c.json({ orderId, monitor: record });
});

app.post("/api/v1/orders/:orderId/fraud-monitor/run", async (c) => {
  const orderId = c.req.param("orderId");
  const body = await c.req.json<{ oldApiKey: string; provider?: ProviderKind }>();
  if (!body.oldApiKey) return c.json({ error: "oldApiKey required" }, 400);
  const record = await runFraudCheck(orderId, body.oldApiKey, body.provider ?? "openai");
  return c.json({ orderId, monitor: record });
});

app.get("/metrics/prometheus", async (c) => {
  return c.text(await renderPrometheusMetrics(), 200, {
    "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
  });
});

app.get("/api/v1/metrics/prometheus", async (c) => {
  return c.text(await renderPrometheusMetrics(), 200, {
    "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
  });
});

app.get("/api/v1/verification/metrics/composition", (c) => {
  const comp = computeProofComposition(jobStore.listJobs());
  return c.json({
    proofComposition: {
      zkProofPct: comp.zkProofPct,
      teeAttestPct: comp.teeAttestPct,
      signaturePct: comp.signaturePct,
      quotaChkPct: comp.quotaChkPct,
    },
    rows: comp.rows,
    throughputPerSec: comp.throughputPerSec,
  });
});

app.get("/api/v1/metrics/health", async (c) => {
  const m = jobStore.getHealthMetrics();
  const monitor = tickMonitorStates();
  const comp = computeProofComposition(jobStore.listJobs());
  const bullStats = await getBullQueueStats();
  return c.json({
    verification_throughput_per_second: m.jobs_total > 0 ? m.jobs_passed / Math.max(m.jobs_total, 1) : 0,
    queue_depth: m.queue_depth,
    success_rate: Number(m.success_rate.toFixed(2)),
    jobs_total: m.jobs_total,
    jobs_passed: m.jobs_passed,
    jobs_failed: m.jobs_failed,
    avg_tokens_used: m.avg_tokens_used,
    monitor_live: monitor.live,
    monitor_stale: monitor.stale,
    monitor_revoked: monitor.revoked,
    p50_duration_ms: m.p50_duration_ms,
    slo_standard_under_60s_pct: m.slo_standard_under_60s_pct,
    queue_backend: queueBackend(),
    provider_limiter: providerLimiterStats(),
    prometheus_url: "/metrics/prometheus",
    proofComposition: {
      zkProofPct: comp.zkProofPct,
      teeAttestPct: comp.teeAttestPct,
      signaturePct: comp.signaturePct,
      quotaChkPct: comp.quotaChkPct,
    },
    throughput_per_sec: comp.throughputPerSec,
    worker_region: process.env.WORKER_REGION ?? "local",
    bullmq: bullStats,
  });
});

app.get("/api/v1/orders/:orderId/escrow", (c) => {
  const orderId = c.req.param("orderId");
  const record = getEscrow(orderId);
  if (!record) return c.json({ orderId, status: "NOT_FOUND" });
  return c.json({ escrow: record });
});

app.post("/api/v1/orders/:orderId/escrow/fund", async (c) => {
  const orderId = c.req.param("orderId");
  const body = await c.req.json<{ amountUsdc: string; signature?: string }>();
  if (!body.amountUsdc) return c.json({ error: "amountUsdc required" }, 400);
  const result = fundEscrow(orderId, body.amountUsdc, body.signature);
  if (!result.ok) {
    return c.json({ error: result.error, code: result.code }, result.code === "ESCROW_SIGNATURE_INVALID" ? 401 : 409);
  }
  return c.json({ escrow: result.record }, 201);
});

app.post("/api/v1/orders/:orderId/escrow/release", async (c) => {
  const orderId = c.req.param("orderId");
  const body = await c.req.json<{ amountUsdc: string; signature?: string }>();
  if (!body.amountUsdc) return c.json({ error: "amountUsdc required" }, 400);
  const result = releaseEscrow(orderId, body.amountUsdc, body.signature);
  if (!result.ok) {
    return c.json({ error: result.error, code: result.code }, result.code === "ESCROW_SIGNATURE_INVALID" ? 401 : 409);
  }
  return c.json({ escrow: result.record });
});

/** Dev helper — sign escrow payload when REQUIRE_ESCROW_SIGNATURE=true */
app.post("/api/v1/dev/escrow/sign", async (c) => {
  const body = await c.req.json<{ orderId: string; amountUsdc: string; action: "fund" | "release" }>();
  if (!body.orderId || !body.amountUsdc || !body.action) {
    return c.json({ error: "orderId, amountUsdc, action required" }, 400);
  }
  return c.json({
    signature: signEscrowPayload(body.orderId, body.amountUsdc, body.action),
  });
});

export default app;
