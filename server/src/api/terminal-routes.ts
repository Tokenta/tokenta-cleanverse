/**
 * Terminal API facade — /api/v1/terminal/*
 * Spec: docs/tokenta-terminal-api-layer-plan.txt
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { jobStore } from "../jobs/store.js";
import { buildVerifyFeed } from "../jobs/feed.js";
import { listingStore } from "../listings/store.js";
import { buybackStore } from "../buyback/store.js";
import { BUYBACK_OFFERS } from "../buyback/offers-catalog.js";
import { listOrderVerification } from "../orders/verification-trail.js";
import { getFraudMonitor, runFraudCheck } from "../verification/fraud-monitor.js";
import { tickMonitorStates } from "../live-monitor/state.js";
import { computeProofComposition } from "../metrics/proof-composition.js";
import { renderPrometheusMetrics } from "../metrics/prometheus.js";
import { queueBackend } from "../jobs/queue.js";
import { providerLimiterStats } from "../jobs/provider-limiter.js";
import { getBullQueueStats } from "../jobs/bull-queue-stats.js";
import {
  getProofAnchor,
  registerProofAnchor,
  confirmAnchorOnChain,
  markAnchorPending,
} from "../verification/proof-anchor.js";
import { fundEscrow, releaseEscrow, getEscrow } from "../orders/escrow.js";
import { signEscrowPayload } from "../security/escrow-signature.js";
import { signBindPayload, verifyBindSignature } from "../security/bind-signature.js";
import { recordAudit } from "../security/audit-log.js";
import type { ProviderKind } from "../types/verification.js";
import {
  createTerminalSession,
  getTerminalSession,
  deleteTerminalSession,
  isTerminalSessionRequired,
  updateSessionTimezone,
} from "../terminal/session-store.js";
import { resolveTerminalTimezone, isValidIanaTimezone } from "../terminal/timezone-service.js";
import {
  createEngineJobFromTerminalRun,
  createListingAndJob,
  terminalRunAcceptedPayload,
} from "../terminal/run-service.js";
import { buildExecutionReceipt } from "../terminal/receipt.js";
import { buildTerminalJobView, getJobByTerminalId } from "../terminal/job-view.js";
import { resolveEngineJobId } from "../terminal/job-status.js";
import {
  createTerminalOrder,
  getTerminalOrder,
  listTerminalOrders,
  updateTerminalOrderStatus,
} from "../terminal/orders-store.js";
import {
  addOrderRoomMessage,
  listOrderRoomMessages,
  seedOrderRoomSystemMessage,
} from "../terminal/order-room-store.js";
import { buildReputationScore, buildReputationLedger } from "../terminal/reputation-service.js";
import { buildWalletSummary } from "../terminal/wallet-summary.js";
import {
  creditSellerOnEscrowRelease,
  computeOrderAmountUsdc,
  depositWallet,
  withdrawWallet,
  getSellerIncomeSummary,
  getTreasuryBalance,
  getTreasuryLedger,
  getTreasuryLifetimeFees,
  TREASURY_WALLET,
  PLATFORM_FEE_BPS,
} from "../terminal/seller-wallet-ledger.js";
import { buildAnalyticsOverview } from "../terminal/analytics-service.js";
import {
  BASE_SEPOLIA_EXPLORER,
  fetchBaseSepoliaTelemetry,
  getSettlementNetworkConfig,
} from "../terminal/network-config.js";
import {
  ESCROW_WALLET,
  TREASURY_WALLET as CONFIG_TREASURY_WALLET,
  USDC_ADDRESS,
} from "../config/settlement-wallets.js";
import { verifyEscrowFundTx } from "../terminal/escrow-usdc.js";
import {
  escrowOperatorAddress,
  isEscrowReleaseSignerConfigured,
  releaseEscrowOnChain,
} from "../terminal/escrow-release.js";
import { terminalOpenApi } from "./openapi-terminal.js";
import { listAiProviders } from "../verification/providers/catalog.js";
import { isTreasurySignerConfigured, submitAnchorWithTreasury } from "../terminal/wallet-service.js";
import {
  reconcilePendingAnchors,
  waitForAnchorReceipt,
} from "../terminal/anchor-reconcile.js";

const terminal = new Hono();
const anchorSubmitInFlight = new Set<string>();

async function settleSellerPayout(orderId: string) {
  const order = getTerminalOrder(orderId);
  if (!order?.sellerWallet) return null;

  let onChain: Awaited<ReturnType<typeof releaseEscrowOnChain>> | null = null;
  if (isEscrowReleaseSignerConfigured()) {
    onChain = await releaseEscrowOnChain({
      sellerWallet: order.sellerWallet,
      grossUsdc: order.amountUsdc,
      orderId,
    });
    if (!onChain.ok) {
      throw new Error(onChain.error ?? "on-chain escrow release failed");
    }
  }

  const ledger = creditSellerOnEscrowRelease({
    sellerWallet: order.sellerWallet,
    grossUsdc: order.amountUsdc,
    orderId,
    buyerWallet: order.buyerWallet,
    payoutTxHash: onChain?.sellerTxHash,
    feeTxHash: onChain?.treasuryTxHash,
  });

  return {
    ...ledger,
    onChainMode: onChain?.mode ?? "ledger-only",
    treasuryTxHash: onChain?.treasuryTxHash ?? ledger.feeTxHash,
  };
}

function sessionIdFromRequest(c: { req: { header: (n: string) => string | undefined } }): string | null {
  return c.req.header("X-Terminal-Session") ?? null;
}

function walletFromRequest(c: { req: { header: (n: string) => string | undefined } }): string | null {
  return c.req.header("X-Wallet-Address") ?? null;
}

function requireTerminalSession(c: {
  req: { header: (n: string) => string | undefined };
  json: (body: unknown, status?: number) => Response;
}): { sessionId: string } | Response {
  if (!isTerminalSessionRequired()) {
    return { sessionId: sessionIdFromRequest(c) ?? "anonymous" };
  }
  const sid = sessionIdFromRequest(c);
  if (!sid || !getTerminalSession(sid)) {
    return c.json({ error: "terminal session required", code: "SESSION_REQUIRED" }, 401);
  }
  return { sessionId: sid };
}

terminal.get("/providers", (c) => {
  return c.json({
    providers: listAiProviders().map((p) => ({
      slug: p.slug,
      label: p.label,
      defaultModel: p.defaultModel,
      region: p.region,
      hint: p.hint ?? null,
      requiresBaseUrl: p.slug === "custom" || p.slug === "openai-compatible",
    })),
  });
});

terminal.get("/health", (c) => {
  const net = getSettlementNetworkConfig();
  return c.json({
    ok: true,
    layer: "terminal",
    queueBackend: queueBackend(),
    verificationMock: process.env.VERIFICATION_MOCK === "true",
    openAiCompatibleBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? null,
    settlementNetwork: net.network,
    settlementChainId: net.chainId,
    settlementDryRun: net.dryRun,
    sessionRequired: isTerminalSessionRequired(),
  });
});

terminal.get("/network", async (c) => {
  const config = getSettlementNetworkConfig();
  const telemetry = await fetchBaseSepoliaTelemetry();
  const reconcile = await reconcilePendingAnchors();
  return c.json({
    ...config,
    ...telemetry,
    anchorReconcile: reconcile,
  });
});

terminal.post("/anchor/reconcile", async (c) => {
  const result = await reconcilePendingAnchors();
  return c.json(result);
});

terminal.get("/openapi.json", (c) => c.json(terminalOpenApi));

terminal.get("/docs", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Tokenta Terminal API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/api/v1/terminal/openapi.json",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;
  return c.html(html);
});

terminal.get("/timezone", async (c) => {
  const sid = sessionIdFromRequest(c);
  const session = sid ? getTerminalSession(sid) : undefined;
  const headerTz = c.req.header("X-Timezone");
  const headerSource = c.req.header("X-Timezone-Source");
  const resolution = await resolveTerminalTimezone({
    sessionTimezone: session?.timezone ?? null,
    headerTimezone: headerTz ?? null,
    headerSource: headerSource ?? null,
    requestHeaders: c.req.raw.headers,
  });
  return c.json(resolution);
});

terminal.post("/session", async (c) => {
  const body = await c.req
    .json<{ walletAddress?: string; client?: string; timezone?: string; timezoneSource?: string }>()
    .catch(() => ({}));
  const headerWallet = walletFromRequest(c);
  const wallet = body.walletAddress ?? headerWallet ?? null;
  const headerTz = c.req.header("X-Timezone");
  const tz = body.timezone ?? headerTz ?? null;
  const tzSource =
    body.timezoneSource === "ip" || body.timezoneSource === "utc"
      ? body.timezoneSource
      : "browser";
  const record = createTerminalSession(
    wallet,
    tz && isValidIanaTimezone(tz) ? { timezone: tz, timezoneSource: tzSource } : undefined,
  );
  return c.json(record, 201);
});

terminal.patch("/session/timezone", async (c) => {
  const sid = sessionIdFromRequest(c);
  if (!sid) return c.json({ error: "X-Terminal-Session required" }, 400);
  const body = await c.req.json<{ timezone: string; timezoneSource?: string }>();
  if (!body.timezone || !isValidIanaTimezone(body.timezone)) {
    return c.json({ error: "invalid timezone" }, 400);
  }
  const source =
    body.timezoneSource === "ip" || body.timezoneSource === "utc" ? body.timezoneSource : "browser";
  const updated = updateSessionTimezone(sid, body.timezone, source);
  if (!updated) return c.json({ error: "session not found" }, 404);
  const resolution = await resolveTerminalTimezone({
    sessionTimezone: updated.timezone ?? null,
    headerTimezone: body.timezone,
    headerSource: source,
    requestHeaders: c.req.raw.headers,
  });
  return c.json({ session: updated, ...resolution });
});

terminal.get("/session", (c) => {
  const sid = sessionIdFromRequest(c);
  if (!sid) return c.json({ error: "X-Terminal-Session required" }, 400);
  const session = getTerminalSession(sid);
  if (!session) return c.json({ error: "session not found" }, 404);
  return c.json(session);
});

terminal.delete("/session", (c) => {
  const sid = sessionIdFromRequest(c);
  if (sid) deleteTerminalSession(sid);
  return c.body(null, 204);
});

terminal.post("/run", async (c) => {
  const sess = requireTerminalSession(c);
  if (sess instanceof Response) return sess;

  const body = await c.req.json<{
    mode?: TerminalRunMode;
    provider?: string;
    declaredQuantity?: number;
    claimedModel?: string;
    costLiability?: string;
    listingId?: string;
    orderId?: string;
    credential?: { type?: string; apiKey?: string };
    buybackOfferId?: string;
    oldApiKey?: string;
    payerPaysFee?: boolean;
    buyerId?: string;
    sellerListingId?: string;
    options?: { l1Only?: boolean };
    compatibleBaseUrl?: string;
  }>();

  const apiKey = body.credential?.apiKey ?? (body as { apiKey?: string }).apiKey;
  if (!apiKey) return c.json({ error: "credential.apiKey required" }, 400);

  const result = createEngineJobFromTerminalRun({
    mode: body.mode ?? "verify",
    provider: body.provider,
    declaredQuantity: Number(body.declaredQuantity ?? 0),
    claimedModel: body.claimedModel,
    costLiability: body.costLiability,
    listingId: body.listingId,
    orderId: body.orderId,
    apiKey,
    oldApiKey: body.oldApiKey,
    buybackOfferId: body.buybackOfferId,
    payerPaysFee: body.payerPaysFee,
    buyerId: body.buyerId,
    sellerListingId: body.sellerListingId,
    l1Only: body.options?.l1Only,
    compatibleBaseUrl: body.compatibleBaseUrl,
  });

  if (!result.ok) {
    return c.json({ error: result.error, code: result.code }, result.status as 400);
  }

  return c.json(terminalRunAcceptedPayload(result.jobId, result.extra), 202);
});

terminal.post("/run/:terminalJobId/cancel", (c) => {
  const job = getJobByTerminalId(c.req.param("terminalJobId"));
  if (!job) return c.json({ error: "not found" }, 404);
  if (job.status === "PASSED" || job.status === "FAILED" || job.status === "CANCELLED") {
    return c.json({ error: `cannot cancel ${job.status.toLowerCase()} job` }, 409);
  }
  const completedAt = new Date().toISOString();
  jobStore.update(job.id, { status: "CANCELLED", completedAt, error: "cancelled by user" });
  jobStore.emit(job.id, {
    type: "job_failed",
    jobId: job.id,
    message: "Cancelled by user",
    timestamp: completedAt,
  });
  return c.json({
    terminalJobId: c.req.param("terminalJobId"),
    jobId: job.id,
    status: "cancelled",
  });
});

terminal.post("/listings/run", async (c) => {
  const sess = requireTerminalSession(c);
  if (sess instanceof Response) return sess;

  const body = await c.req.json<{
    apiKey?: string;
    credential?: { apiKey?: string };
    quotaToSell?: number;
    askPriceUsdc?: number;
    providerKind?: string;
    claimedModel?: string;
    autoListAfterVerify?: boolean;
    compatibleBaseUrl?: string;
  }>();

  const apiKey = body.credential?.apiKey ?? body.apiKey;
  if (!apiKey) return c.json({ error: "apiKey required" }, 400);

  const result = await createListingAndJob({
    apiKey,
    quotaToSell: Number(body.quotaToSell ?? 0),
    askPriceUsdc: Number(body.askPriceUsdc ?? 0),
    providerKind: body.providerKind,
    claimedModel: body.claimedModel,
    autoListAfterVerify: body.autoListAfterVerify,
    sellerWallet: walletFromRequest(c),
    compatibleBaseUrl: body.compatibleBaseUrl,
  });

  if (!result.ok) {
    return c.json({ error: result.error, code: result.code }, result.status as 400);
  }

  return c.json(
    {
      ...terminalRunAcceptedPayload(result.jobId, result.extra),
      listingId: result.listingId,
      listingStatus: (result.extra as { listingStatus?: string })?.listingStatus,
      pollUrl: `/api/v1/terminal/job/${result.terminalJobId}`,
    },
    202,
  );
});

terminal.get("/job/:terminalJobId", (c) => {
  const job = getJobByTerminalId(c.req.param("terminalJobId"));
  if (!job) return c.json({ error: "not found" }, 404);
  const listing = job.listingId ? listingStore.get(job.listingId) : undefined;
  return c.json({
    ...jobStore.toResponse(job),
    ...buildTerminalJobView(job),
    listingId: job.listingId,
    listingStatus: listing?.status,
    events: job.events,
    error: job.error ?? null,
    snapshotAt: new Date().toISOString(),
  });
});

terminal.get("/job/:terminalJobId/proof", (c) => {
  const job = getJobByTerminalId(c.req.param("terminalJobId"));
  if (!job?.proof) return c.json({ error: "proof not ready" }, 409);
  return c.json({ proofHash: job.proof.proofHash, proof: job.proof, jobId: job.id });
});

terminal.get("/job/:terminalJobId/events", (c) => {
  const terminalJobId = c.req.param("terminalJobId");
  const jobId = resolveEngineJobId(terminalJobId);
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
      const terminalStatus = buildTerminalJobView(job).status;
      await stream.writeSSE({
        data: JSON.stringify({ ...ev, terminalJobId, terminalStatus }),
        event: ev.type,
        id: ev.timestamp,
      });
    }

    if (job.status === "PASSED" || job.status === "FAILED") return;

    await new Promise<void>((resolve) => {
      const unsub = jobStore.subscribe(jobId, async (ev) => {
        const j = jobStore.get(jobId);
        const terminalStatus = j ? buildTerminalJobView(j).status : "running";
        await stream.writeSSE({
          data: JSON.stringify({ ...ev, terminalJobId, terminalStatus }),
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

terminal.get("/proof/:proofHash", (c) => {
  const proofHash = c.req.param("proofHash");
  const job = jobStore.findByProofHash(proofHash);
  if (!job?.proof) return c.json({ error: "not found" }, 404);

  const payload = {
    proofId: proofHash,
    proof: job.proof,
    jobId: job.id,
    terminalJobId: `tjob_${job.id}`,
    listingId: job.listingId,
    exportedAt: new Date().toISOString(),
  };

  if (c.req.query("download") === "1") {
    const filename = `tokenta-proof-${proofHash.slice(0, 16)}.json`;
    return c.body(JSON.stringify(payload, null, 2), 200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
  }
  return c.json(payload);
});

terminal.get("/receipt/:terminalJobId", (c) => {
  const job = getJobByTerminalId(c.req.param("terminalJobId"));
  if (!job) return c.json({ error: "not found" }, 404);
  return c.json(buildExecutionReceipt(job, sessionIdFromRequest(c)));
});

terminal.get("/receipt/:terminalJobId/export", (c) => {
  const job = getJobByTerminalId(c.req.param("terminalJobId"));
  if (!job) return c.json({ error: "not found" }, 404);
  const receipt = buildExecutionReceipt(job, sessionIdFromRequest(c));
  const filename = `tokenta-receipt-${job.id}.md`;
  const body = [
    "# Tokenta Execution Receipt",
    "",
    `- Job ID: ${String(receipt["job_id"] ?? "—")}`,
    `- Terminal Job ID: ${String(receipt["terminal_job_id"] ?? "—")}`,
    `- Provider: ${String(receipt["provider"] ?? "—")}`,
    `- Model: ${String(receipt["model"] ?? "—")}`,
    `- Verified: ${String(receipt["verified"] ?? "—")}`,
    `- Terminal Outcome: ${String(receipt["terminal_outcome"] ?? "—")}`,
    `- Proof Hash: ${String(receipt["proof_hash"] ?? "—")}`,
    "",
    "```json",
    JSON.stringify(receipt, null, 2),
    "```",
    "",
  ].join("\n");
  return c.body(body, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
});

terminal.get("/anchor/:proofHash", (c) => {
  const proofHash = c.req.param("proofHash");
  const anchor = getProofAnchor(proofHash);
  const chainId = Number(process.env.SETTLEMENT_CHAIN_ID ?? 84532);
  const network = process.env.SETTLEMENT_NETWORK ?? "base-sepolia";
  if (!anchor) {
    return c.json({ proofHash, status: "NONE", network, chainId });
  }
  return c.json({
    proofHash,
    anchor,
    network,
    chainId,
    explorerTxUrl: anchor.txHash?.startsWith("0x")
      ? `${BASE_SEPOLIA_EXPLORER}/tx/${anchor.txHash}`
      : null,
  });
});

terminal.post("/anchor/:proofHash/submit", async (c) => {
  const proofHash = c.req.param("proofHash");
  const job = jobStore.findByProofHash(proofHash);
  if (!job?.proof) return c.json({ error: "proof not found" }, 404);

  const body = await c.req.json<{ terminalJobId?: string }>().catch(() => ({}));
  const existing = getProofAnchor(proofHash);
  if (existing?.status === "ANCHORED") {
    return c.json(
      {
        anchorStatus: "confirmed",
        txHash: existing.txHash ?? null,
        anchor: existing,
        terminalJobId: body.terminalJobId,
        idempotent: true,
      },
      200,
    );
  }
  if (anchorSubmitInFlight.has(proofHash)) {
    return c.json(
      {
        anchorStatus: "pending",
        txHash: existing?.txHash ?? null,
        anchor: existing ?? null,
        terminalJobId: body.terminalJobId,
        inFlight: true,
      },
      202,
    );
  }

  if (process.env.SETTLEMENT_DRY_RUN === "true") {
    registerProofAnchor({ proofHash, jobId: job.id, listingId: job.listingId });
    const anchor = getProofAnchor(proofHash);
    return c.json(
      { anchorStatus: "dry_run", anchor, terminalJobId: body.terminalJobId },
      202,
    );
  }

  const anchor = registerProofAnchor({ proofHash, jobId: job.id, listingId: job.listingId });
  anchorSubmitInFlight.add(proofHash);
  try {
    if (isTreasurySignerConfigured()) {
      const signed = await submitAnchorWithTreasury({ proofHash });
      if (signed.ok && signed.txHash) {
        const chainId = Number(process.env.SETTLEMENT_CHAIN_ID ?? 84532);
        markAnchorPending(proofHash, signed.txHash, chainId);
        const confirmed = await waitForAnchorReceipt(proofHash);
        const finalRec = confirmed ?? getProofAnchor(proofHash);
        const status =
          finalRec?.status === "ANCHORED" ? "confirmed" : "pending";
        return c.json(
          {
            anchorStatus: status,
            txHash: finalRec?.txHash ?? signed.txHash,
            anchor: finalRec,
            terminalJobId: body.terminalJobId,
          },
          finalRec?.status === "ANCHORED" ? 200 : 202,
        );
      }
      anchor.status = "FAILED";
      anchor.txHash = signed.error;
      return c.json(
        {
          anchorStatus: "failed",
          txHash: null,
          error: signed.error,
          anchor,
          terminalJobId: body.terminalJobId,
        },
        502,
      );
    }

    const fallback = await confirmAnchorOnChain(proofHash);
    const status = fallback?.status === "ANCHORED" ? "confirmed" : "pending";
    return c.json(
      {
        anchorStatus: status,
        txHash: fallback?.txHash ?? null,
        anchor: fallback,
        terminalJobId: body.terminalJobId,
      },
      fallback?.status === "ANCHORED" ? 200 : 202,
    );
  } finally {
    anchorSubmitInFlight.delete(proofHash);
  }
});

terminal.get("/market/listings", (c) => {
  const rows = listingStore.listLive().map((l) => listingStore.toMarketRow(l));
  return c.json({ listings: rows });
});

terminal.get("/market/my-listings", (c) => {
  const wallet = walletFromRequest(c);
  const rows = listingStore
    .listMine()
    .filter((l) => !wallet || l.sellerWallet?.toLowerCase() === wallet.toLowerCase())
    .map((l) => listingStore.toMarketRow(l));
  return c.json({ listings: rows });
});

terminal.get("/feed", (c) => c.json({ rows: buildVerifyFeed(100) }));

terminal.get("/metrics/health", async (c) => {
  const m = jobStore.getHealthMetrics();
  const monitor = tickMonitorStates();
  const comp = computeProofComposition(jobStore.listJobs());
  const bullStats = await getBullQueueStats();
  return c.json({
    verification_throughput_per_second: m.jobs_total > 0 ? m.jobs_passed / Math.max(m.jobs_total, 1) : 0,
    queue_depth: m.queue_depth,
    success_rate: Number(m.success_rate.toFixed(2)),
    jobs_total: m.jobs_total,
    avg_tokens_used: m.avg_tokens_used,
    monitor_live: monitor.live,
    monitor_stale: monitor.stale,
    monitor_revoked: monitor.revoked,
    p50_duration_ms: m.p50_duration_ms,
    slo_standard_under_60s_pct: m.slo_standard_under_60s_pct,
    queue_backend: queueBackend(),
    provider_limiter: providerLimiterStats(),
    proofComposition: {
      connectivityPct: comp.connectivityPct,
      zkProofPct: comp.zkProofPct,
      teeAttestPct: comp.teeAttestPct,
      signaturePct: comp.signaturePct,
      quotaChkPct: comp.quotaChkPct,
    },
    throughput_per_sec: comp.throughputPerSec,
    bullmq: bullStats,
    terminal_api: true,
  });
});

terminal.get("/reputation", (c) => {
  const wallet = walletFromRequest(c);
  return c.json(buildReputationScore(wallet));
});

terminal.get("/reputation/ledger", (c) => {
  const limit = Number(c.req.query("limit") ?? 50);
  return c.json({ entries: buildReputationLedger(limit) });
});

terminal.get("/wallet/summary", (c) => {
  const wallet = walletFromRequest(c);
  return c.json(buildWalletSummary(wallet));
});

terminal.get("/wallet/income", (c) => {
  const wallet = walletFromRequest(c);
  if (!wallet) return c.json({ error: "X-Wallet-Address required" }, 400);
  return c.json({ wallet, ...getSellerIncomeSummary(wallet) });
});

terminal.post("/wallet/deposit", async (c) => {
  const wallet = walletFromRequest(c);
  if (!wallet) return c.json({ error: "X-Wallet-Address required" }, 400);
  const body = await c.req.json<{ amountUsdc: string }>();
  if (!body.amountUsdc) return c.json({ error: "amountUsdc required" }, 400);
  const event = depositWallet(wallet, body.amountUsdc);
  return c.json({ ok: true, event, summary: buildWalletSummary(wallet) }, 201);
});

terminal.post("/wallet/withdraw", async (c) => {
  const wallet = walletFromRequest(c);
  if (!wallet) return c.json({ error: "X-Wallet-Address required" }, 400);
  const body = await c.req.json<{ amountUsdc: string }>();
  if (!body.amountUsdc) return c.json({ error: "amountUsdc required" }, 400);
  const result = withdrawWallet(wallet, body.amountUsdc);
  if (!result.ok) return c.json({ error: result.error }, 409);
  return c.json({
    ok: true,
    txHash: result.txHash,
    event: result.event,
    summary: buildWalletSummary(wallet),
  });
});

/**
 * GET /wallet/treasury
 * Returns the Tokenta treasury wallet's current balance and recent fee ledger.
 * In production this would be gated behind an admin auth check.
 */
terminal.get("/wallet/treasury", (c) => {
  const balance = getTreasuryBalance();
  const lifetime = getTreasuryLifetimeFees();
  const events = getTreasuryLedger(50);
  return c.json({
    treasuryWallet: TREASURY_WALLET,
    availableUsdc: balance.toFixed(2),
    lifetimeFeesUsdc: lifetime.toFixed(2),
    feeBps: PLATFORM_FEE_BPS,
    feePct: `${PLATFORM_FEE_BPS / 100}%`,
    recentEvents: events,
  });
});

terminal.get("/analytics/overview", (c) => {
  const mode = c.req.query("mode") === "SELL" ? "SELL" : "BUY";
  return c.json(buildAnalyticsOverview(mode));
});

terminal.get("/metrics/composition", (c) => {
  const comp = computeProofComposition(jobStore.listJobs());
  return c.json({
    proofComposition: {
      connectivityPct: comp.connectivityPct,
      zkProofPct: comp.zkProofPct,
      teeAttestPct: comp.teeAttestPct,
      signaturePct: comp.signaturePct,
      quotaChkPct: comp.quotaChkPct,
    },
    rows: comp.rows,
    throughputPerSec: comp.throughputPerSec,
  });
});

terminal.get("/metrics/prometheus", async (c) => {
  return c.text(await renderPrometheusMetrics(), 200, {
    "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
  });
});

terminal.post("/dev/reset", (c) => {
  if (process.env["NODE_ENV"] === "production") {
    return c.json({ error: "not available in production" }, 403);
  }
  listingStore.resetForDev();
  jobStore.resetForDev();
  return c.json({ cleared: true, at: new Date().toISOString() });
});

/**
 * PATCH /listings/:listingId/price
 * Allows a seller to update the ask price on their LIVE listing.
 * Only the wallet that created the listing may change the price.
 */
terminal.patch("/listings/:listingId/price", async (c) => {
  const listingId = c.req.param("listingId");
  const body = await c.req.json<{ askPriceUsdc: number }>().catch(() => null);
  if (!body || typeof body.askPriceUsdc !== "number") {
    return c.json({ error: "askPriceUsdc (number) required" }, 400);
  }
  const requestingWallet = walletFromRequest(c);
  const result = listingStore.updatePrice(listingId, body.askPriceUsdc, requestingWallet);
  if ("error" in result) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "FORBIDDEN"
          ? 403
          : result.code === "INVALID_PRICE" || result.code === "INVALID_LISTING_STATE"
            ? 409
            : 400;
    return c.json({ error: result.error, code: result.code }, status);
  }
  return c.json({ listing: listingStore.toMarketRow(result), listingId, askPriceUsdc: result.askPriceUsdc });
});

terminal.post("/listings/:listingId/bind-verification", async (c) => {
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
  recordAudit({ type: "BIND_VERIFICATION", listingId, jobId, proofHash: job.proof.proofHash });
  return c.json({ listing: updated, proofHash: job.proof.proofHash });
});

terminal.post("/listings/:listingId/publish", async (c) => {
  const listingId = c.req.param("listingId");
  const listing = listingStore.get(listingId);
  if (!listing) return c.json({ error: "listing not found" }, 404);
  if (listing.status !== "VERIFIED_PENDING_PUBLISH") {
    return c.json(
      {
        error: "listing not in VERIFIED_PENDING_PUBLISH state",
        currentStatus: listing.status,
        code: "INVALID_LISTING_STATE",
      },
      409,
    );
  }
  const updated = listingStore.publishListing(listingId);
  if (!updated) return c.json({ error: "publish failed" }, 500);
  recordAudit({ type: "LISTING_PUBLISHED", listingId });
  return c.json({ listing: updated, listingId, status: "LIVE" });
});

terminal.post("/sign/bind", async (c) => {
  const body = await c.req.json<{ listingId: string; jobId: string }>();
  if (!body.listingId || !body.jobId) {
    return c.json({ error: "listingId and jobId required" }, 400);
  }
  return c.json({ signature: signBindPayload(body.listingId, body.jobId) });
});

terminal.post("/sign/escrow", async (c) => {
  const body = await c.req.json<{ orderId: string; amountUsdc: string; action: "fund" | "release" }>();
  if (!body.orderId || !body.amountUsdc || !body.action) {
    return c.json({ error: "orderId, amountUsdc, action required" }, 400);
  }
  return c.json({
    signature: signEscrowPayload(body.orderId, body.amountUsdc, body.action),
  });
});

terminal.get("/buyback/offers", (c) => {
  return c.json({ offers: BUYBACK_OFFERS });
});

terminal.post("/buyback/confirm", async (c) => {
  const body = await c.req.json<{
    verificationJobId?: string;
    jobId?: string;
    buybackOfferId: string;
    quantity: number;
    depositAcknowledged?: boolean;
  }>();

  const jobId = body.verificationJobId ?? body.jobId;
  if (!jobId) return c.json({ error: "jobId required" }, 400);
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
    return c.json({ error: "verification did not pass", terminalOutcome: job.proof.terminalOutcome }, 409);
  }

  const existing = buybackStore.getByJob(jobId);
  if (existing) {
    return c.json({ orderId: existing.orderId, escrowId: existing.escrowId, alreadyConfirmed: true }, 200);
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

terminal.post("/orders/purchase", async (c) => {
  const body = await c.req.json<{
    listingId: string;
    mode?: "BUYOUT" | "PARTIAL";
    quantity?: number;
    amountUsdc?: string;
  }>();
  if (!body.listingId) return c.json({ error: "listingId required" }, 400);

  const listing = listingStore.get(body.listingId);
  if (!listing) return c.json({ error: "listing not found" }, 404);

  const mode = body.mode ?? "BUYOUT";
  const quantity = Number(body.quantity ?? listing.quotaToSell);
  const amountUsdc =
    body.amountUsdc ??
    computeOrderAmountUsdc({
      askPriceUsdc: listing.askPriceUsdc,
      quotaToSell: listing.quotaToSell,
      mode,
      quantity,
    });

  const order = createTerminalOrder({
    listingId: body.listingId,
    sellerWallet: listing.sellerWallet ?? null,
    buyerWallet: walletFromRequest(c),
    mode,
    quantity,
    amountUsdc: String(amountUsdc),
  });
  seedOrderRoomSystemMessage(
    order.orderId,
    `Order created for listing ${order.listingId}. Awaiting escrow fund.`,
  );

  return c.json(
    {
      orderId: order.orderId,
      order,
      escrowFundUrl: `/api/v1/terminal/orders/${order.orderId}/escrow/fund`,
      signEscrowUrl: `/api/v1/terminal/sign/escrow`,
    },
    201,
  );
});

terminal.get("/orders", (c) => {
  const wallet = c.req.query("wallet") ?? walletFromRequest(c) ?? undefined;
  const role = c.req.query("role") as "buyer" | "seller" | "all" | undefined;
  const limit = Number(c.req.query("limit") ?? 100);
  const rows = listTerminalOrders(limit, { wallet, role: role ?? "all" });
  return c.json({ orders: rows });
});

terminal.get("/orders/:orderId", (c) => {
  const order = getTerminalOrder(c.req.param("orderId"));
  if (!order) return c.json({ error: "not found" }, 404);
  return c.json({ order });
});

terminal.get("/orders/:orderId/verification-trail", (c) => {
  const orderId = c.req.param("orderId");
  return c.json({ orderId, entries: listOrderVerification(orderId) });
});

terminal.get("/orders/:orderId/escrow", (c) => {
  const orderId = c.req.param("orderId");
  const record = getEscrow(orderId);
  if (!record) return c.json({ orderId, status: "NOT_FOUND" });
  return c.json({ escrow: record });
});

terminal.get("/orders/:orderId/messages", (c) => {
  const orderId = c.req.param("orderId");
  return c.json({ orderId, messages: listOrderRoomMessages(orderId) });
});

terminal.post("/orders/:orderId/messages", async (c) => {
  const orderId = c.req.param("orderId");
  const body = await c.req.json<{ body?: string; from?: string }>().catch(() => ({}));
  const text = (body.body ?? "").trim();
  if (!text) return c.json({ error: "body required" }, 400);
  const from = body.from?.trim() || walletFromRequest(c) || "YOU";
  const message = addOrderRoomMessage({ orderId, from, body: text });
  return c.json({ message }, 201);
});

terminal.post("/orders/:orderId/escrow/fund", async (c) => {
  const orderId = c.req.param("orderId");
  const body = await c.req.json<{
    amountUsdc: string;
    signature?: string;
    /** When provided, indicates the buyer has already transferred USDC on-chain.
     * The ledger debit is skipped and this hash is persisted as fundTxHash. */
    txHash?: string;
  }>();
  if (!body.amountUsdc) return c.json({ error: "amountUsdc required" }, 400);

  // Pass the buyer wallet so the ledger can debit their balance.
  const buyerWallet = walletFromRequest(c);

  if (body.txHash) {
    const verification = await verifyEscrowFundTx({
      txHash: body.txHash,
      expectedAmountUsdc: body.amountUsdc,
      expectedFrom: buyerWallet,
    });
    const strict = process.env.REQUIRE_ONCHAIN_FUND_VERIFY === "true";
    if (!verification.ok && strict) {
      return c.json(
        { error: verification.error ?? "on-chain fund verification failed", code: "FUND_TX_INVALID" },
        400,
      );
    }
  }

  const result = fundEscrow(
    orderId,
    body.amountUsdc,
    body.signature,
    buyerWallet,
    body.txHash,
  );
  if (!result.ok) {
    const statusCode =
      result.code === "ESCROW_SIGNATURE_INVALID"
        ? 401
        : result.code === "INSUFFICIENT_BALANCE"
          ? 402
          : 409;
    return c.json({ error: result.error, code: result.code }, statusCode);
  }
  updateTerminalOrderStatus(orderId, "ESCROW_FUNDED");
  const fundNote = body.txHash
    ? ` On-chain fund tx ${body.txHash.slice(0, 14)}… confirmed to escrow ${ESCROW_WALLET.slice(0, 10)}…`
    : "";
  seedOrderRoomSystemMessage(
    orderId,
    `Escrow funded: ${body.amountUsdc} USDC. Payment locked — awaiting API delivery and buyer confirmation.${fundNote}`,
  );
  return c.json(
    {
      escrow: result.record,
      settlement: {
        escrowWallet: ESCROW_WALLET,
        fundTxHash: result.record?.fundTxHash,
        mode: body.txHash ? "on-chain-fund" : "ledger-fund",
      },
    },
    201,
  );
});

terminal.post("/orders/:orderId/escrow/release", async (c) => {
  const orderId = c.req.param("orderId");
  const body = await c.req.json<{ amountUsdc: string; signature?: string }>();
  if (!body.amountUsdc) return c.json({ error: "amountUsdc required" }, 400);

  let payout: Awaited<ReturnType<typeof settleSellerPayout>> | null = null;
  try {
    payout = await settleSellerPayout(orderId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "settlement failed";
    return c.json({ error: message, code: "ON_CHAIN_RELEASE_FAILED" }, 502);
  }

  const result = releaseEscrow(orderId, body.amountUsdc, body.signature);
  if (!result.ok) {
    return c.json({ error: result.error, code: result.code }, result.code === "ESCROW_SIGNATURE_INVALID" ? 401 : 409);
  }
  updateTerminalOrderStatus(orderId, "SETTLED");
  const feePct = `${PLATFORM_FEE_BPS / 100}%`;
  const payoutMsg = payout
    ? ` Seller credited ${payout.netUsdc} USDC (${feePct} fee: ${payout.feeUsdc} USDC to treasury).`
    : "";
  const onChainNote =
    payout?.onChainMode === "on-chain" && payout.payoutTxHash
      ? ` Seller tx: ${payout.payoutTxHash.slice(0, 14)}… · Treasury tx: ${payout.treasuryTxHash?.slice(0, 14) ?? "—"}…`
      : "";
  seedOrderRoomSystemMessage(orderId, `Escrow released: ${body.amountUsdc} USDC.${payoutMsg}${onChainNote}`);
  return c.json({
    escrow: result.record,
    sellerPayout: payout,
    fee: { bps: PLATFORM_FEE_BPS, pct: feePct, treasury: TREASURY_WALLET },
    settlement: {
      escrowWallet: ESCROW_WALLET,
      treasuryWallet: CONFIG_TREASURY_WALLET,
      mode: payout?.onChainMode ?? "ledger-only",
      sellerTxHash: payout?.payoutTxHash,
      treasuryTxHash: payout?.treasuryTxHash,
    },
  });
});

terminal.post("/orders/:orderId/actions/:action", async (c) => {
  const orderId = c.req.param("orderId");
  const action = c.req.param("action");
  const body = await c.req
    .json<{ amountUsdc?: string; apiKey?: string; oldApiKey?: string; note?: string }>()
    .catch(() => ({}));

  if (action === "release-escrow") {
    const amountUsdc = body.amountUsdc ?? "0.00";
    const sig = signEscrowPayload(orderId, amountUsdc, "release");
    let payout: Awaited<ReturnType<typeof settleSellerPayout>> | null = null;
    try {
      payout = await settleSellerPayout(orderId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "settlement failed";
      return c.json({ error: message, code: "ON_CHAIN_RELEASE_FAILED" }, 502);
    }
    const released = releaseEscrow(orderId, amountUsdc, sig);
    if (!released.ok) {
      return c.json({ error: released.error, code: released.code }, 409);
    }
    updateTerminalOrderStatus(orderId, "SETTLED");
    const feePct = `${PLATFORM_FEE_BPS / 100}%`;
    const message = seedOrderRoomSystemMessage(
      orderId,
      `Escrow released (${amountUsdc} USDC).${
        payout
          ? ` Seller credited ${payout.netUsdc} USDC; ${feePct} fee (${payout.feeUsdc} USDC) → Tokenta treasury.`
          : ""
      }`,
    );
    return c.json({
      action, ok: true, escrow: released.record, sellerPayout: payout,
      fee: { bps: PLATFORM_FEE_BPS, pct: feePct, treasury: TREASURY_WALLET },
      message,
    });
  }

  if (action === "run-reverify") {
    const apiKey = body.apiKey ?? "sk-mock-order-room-reverify";
    const created = createEngineJobFromTerminalRun({
      mode: "pre_purchase",
      provider: "openai",
      declaredQuantity: 50000,
      orderId,
      apiKey,
      payerPaysFee: true,
      buyerId: "order-room",
    });
    if (!created.ok) {
      return c.json({ error: created.error, code: created.code }, created.status as 400);
    }
    const message = seedOrderRoomSystemMessage(orderId, `Re-verify requested. Job ${created.jobId} started.`);
    return c.json({ action, ok: true, jobId: created.jobId, terminalJobId: `tjob_${created.jobId}`, message });
  }

  if (action === "escalate-dispute") {
    const oldApiKey = body.oldApiKey ?? "sk-mock-dispute-old-key";
    const monitor = await runFraudCheck(orderId, oldApiKey, "openai");
    const message = seedOrderRoomSystemMessage(orderId, "Dispute escalated. Fraud monitor triggered.");
    return c.json({ action, ok: true, monitor, message });
  }

  if (action === "attach-attestation") {
    const note = body.note?.trim() || "Attestation attached from order room.";
    const message = addOrderRoomMessage({ orderId, from: "SYSTEM", body: note });
    return c.json({ action, ok: true, message });
  }

  if (action === "accept-delivery") {
    const message = seedOrderRoomSystemMessage(orderId, "Delivery accepted by buyer.");
    return c.json({ action, ok: true, message });
  }

  return c.json({ error: "unsupported action" }, 404);
});

terminal.get("/orders/:orderId/fraud-monitor", (c) => {
  const orderId = c.req.param("orderId");
  const record = getFraudMonitor(orderId);
  if (!record) return c.json({ orderId, status: "NOT_SCHEDULED" });
  return c.json({ orderId, monitor: record });
});

terminal.post("/orders/:orderId/fraud-monitor/run", async (c) => {
  const orderId = c.req.param("orderId");
  const body = await c.req.json<{ oldApiKey: string; provider?: ProviderKind }>();
  if (!body.oldApiKey) return c.json({ error: "oldApiKey required" }, 400);
  const record = await runFraudCheck(orderId, body.oldApiKey, body.provider ?? "openai");
  return c.json({ orderId, monitor: record });
});

export const terminalApp = new Hono().route("/api/v1/terminal", terminal);
