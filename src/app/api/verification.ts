/** Client for Tokenta Terminal + verification API (Phase 5A terminal layer) */

import type { EnhancedListing } from "../trading-types";

import { TOKENTA_CHAIN_ID, TOKENTA_EXPLORER_URL, TOKENTA_NETWORK_SLUG, explorerTxUrl } from "../chain-config";
import { detectBrowserTimezone, timezoneRequestHeaders } from "../timezone/terminal-timezone";

const API_BASE = import.meta.env.VITE_VERIFICATION_API ?? "";
const USE_TERMINAL_API = import.meta.env.VITE_USE_TERMINAL_API !== "false";

export { explorerTxUrl };

let walletAddressOverride: string | null = null;
let terminalSessionId: string | null = null;
let terminalSessionInFlight: Promise<string | null> | null = null;

/** Create server terminal session after Privy login (POST /terminal/session). */
export async function ensureTerminalSession(): Promise<string | null> {
  if (!USE_TERMINAL_API) return null;
  if (terminalSessionId) return terminalSessionId;
  if (terminalSessionInFlight) return terminalSessionInFlight;
  terminalSessionInFlight = (async () => {
    try {
      const headers = { ...verificationHeaders(), ...timezoneRequestHeaders() };
      delete headers["X-Terminal-Session"];
      const tz = detectBrowserTimezone();
      const res = await fetch(`${API_BASE}/api/v1/terminal/session`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          client: "web-terminal",
          clientVersion: "0.1.0",
          timezone: tz,
          timezoneSource: "browser",
        }),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { sessionId: string };
      terminalSessionId = body.sessionId;
      return terminalSessionId;
    } catch {
      return null;
    } finally {
      terminalSessionInFlight = null;
    }
  })();
  return terminalSessionInFlight;
}

function terminalJobPath(jobId: string): string {
  const tid = jobId.startsWith("tjob_") ? jobId : `tjob_${jobId}`;
  return `/api/v1/terminal/job/${tid}`;
}

/** Sync Privy-connected wallet for X-Wallet-Address header (engine auth). */
export function setVerificationWalletAddress(address: string | null): void {
  walletAddressOverride = address;
}

function verificationHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
  const token = import.meta.env.VITE_API_DEV_TOKEN as string | undefined;
  const wallet =
    walletAddressOverride ??
    (import.meta.env.VITE_WALLET_ADDRESS as string | undefined);
  if (token) h.Authorization = `Bearer ${token}`;
  if (wallet) h["X-Wallet-Address"] = wallet;
  if (terminalSessionId) h["X-Terminal-Session"] = terminalSessionId;
  return h;
}

/** Authenticated fetch against verification API (dev token + wallet + terminal session). */
export async function verificationFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const sessionOptionalPath =
    path.startsWith("/api/v1/terminal/session") ||
    path === "/api/v1/terminal/openapi.json" ||
    path === "/api/v1/terminal/docs" ||
    path === "/api/v1/terminal/health" ||
    path === "/api/v1/terminal/network" ||
    path === "/api/v1/terminal/timezone";
  if (USE_TERMINAL_API && path.startsWith("/api/v1/terminal") && !sessionOptionalPath) {
    await ensureTerminalSession();
  }
  const merged = new Headers(init?.headers);
  const baseHeaders = { ...verificationHeaders(), ...timezoneRequestHeaders() };
  for (const [k, v] of Object.entries(baseHeaders)) {
    if (!merged.has(k)) merged.set(k, v);
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers: merged });
}

export interface MarketListingRow {
  listingId: string;
  sellerWallet?: string | null;
  providerKind: string;
  quotaToSell: number;
  quotaUnit: string;
  askPriceUsdc: number;
  verificationState: string;
  listingStatus?: string;
  terminalOutcome?: string;
  proofHash?: string;
  capabilityScore?: number;
  updatedAt: string;
}

export type TerminalOutcome = "PASS" | "FAIL" | "REVIEW" | "DEGRADED";

export interface FingerprintAssessment {
  status: "match" | "mismatch" | "inconclusive" | "skipped";
  claimedModel?: string;
  claimedFamily?: string;
  detectedFamily?: string;
  detectedVendor?: string;
  responseModel?: string;
  confidence: number;
  evidence: string[];
}

export interface VerificationProof {
  fingerprint?: FingerprintAssessment;
  jobId: string;
  terminalOutcome: TerminalOutcome;
  capabilityScore: number;
  trustScore: number;
  complianceScore: number;
  confidence: string;
  estimatedExecutableQuantityRange: {
    min: number | null;
    max: number | null;
    band: string;
    unit: string;
  };
  declaredAlignment: string;
  totalTokensUsed: number;
  operationalEnvelopeLimit: number;
  consentDisclosureCeiling: number;
  probeModelId: string;
  failureCode?: string;
  failureMessage?: string;
  proofHash: string;
  cacheHit: boolean;
}

export type EngineJobStatus = "QUEUED" | "RUNNING" | "PASSED" | "FAILED";

export interface VerificationJobResponse {
  jobId: string;
  terminalJobId?: string;
  status: EngineJobStatus | string;
  terminalStatus?: string;
  terminalOutcome?: TerminalOutcome;
  proof?: VerificationProof;
  stepsCompleted: number;
  stepsTotal: number;
  createdAt: string;
  events?: VerificationJobEvent[];
  snapshotAt?: string;
  error?: string;
  progress?: { step: string | null; percent: number; stepsCompleted: number; stepsTotal: number };
}

export interface VerificationJobEvent {
  type: string;
  jobId: string;
  step?: string;
  message?: string;
  proof?: VerificationProof;
  timestamp: string;
}

export interface VerifyFeedRow {
  ts: string;
  asset: string;
  step: string;
  hash: string;
  result: string;
  latency: string;
  method: string;
  jobId: string;
}

export async function createListing(body: {
  apiKey: string;
  quotaToSell: number;
  askPriceUsdc: number;
  providerKind?: string;
  claimedModel?: string;
  autoListAfterVerify?: boolean;
  compatibleBaseUrl?: string;
}): Promise<{
  listingId: string;
  jobId: string;
  terminalJobId: string;
  listingStatus: string;
  streamUrl?: string;
}> {
  const path = USE_TERMINAL_API ? "/api/v1/terminal/listings/run" : "/api/v1/listings";
  const res = await verificationFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      providerKind: body.providerKind ?? "openai-compatible",
      apiKey: body.apiKey,
      credential: USE_TERMINAL_API ? { apiKey: body.apiKey } : undefined,
      quotaToSell: Number(body.quotaToSell),
      askPriceUsdc: Number(body.askPriceUsdc),
      claimedModel: body.claimedModel,
      compatibleBaseUrl: body.compatibleBaseUrl,
      autoListAfterVerify: body.autoListAfterVerify ?? true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

export async function fetchMarketListings(): Promise<MarketListingRow[]> {
  const isDemoMode = typeof window !== "undefined" && window.location.pathname === "/cleanverse-demo";
  if (isDemoMode) {
    const { DEMO_MARKET_LISTINGS } = await import("./demo-fixtures");
    return DEMO_MARKET_LISTINGS;
  }
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API ? "/api/v1/terminal/market/listings" : "/api/v1/market/listings",
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { listings: MarketListingRow[] };
    return data.listings ?? [];
  } catch {
    return [];
  }
}

export async function fetchMyListings(): Promise<MarketListingRow[]> {
  try {
    const res = await verificationFetch("/api/v1/terminal/market/my-listings");
    if (!res.ok) return [];
    const data = (await res.json()) as { listings: MarketListingRow[] };
    return data.listings ?? [];
  } catch {
    return [];
  }
}

export async function fetchBuybackOffers(): Promise<
  import("../trading-types").BuybackOffer[]
> {
  try {
    const res = await verificationFetch("/api/v1/terminal/buyback/offers");
    if (!res.ok) return [];
    const data = (await res.json()) as { offers: import("../trading-types").BuybackOffer[] };
    return data.offers ?? [];
  } catch {
    return [];
  }
}

export interface ProofCompositionRow {
  key: string;
  label: string;
  pct: number;
  throughputPerSec: number;
}

export async function fetchProofComposition(): Promise<{
  rows: ProofCompositionRow[];
  throughputPerSec: number;
} | null> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API
        ? "/api/v1/terminal/metrics/composition"
        : "/api/v1/verification/metrics/composition",
    );
    if (!res.ok) return null;
    const body = await res.json();
    return {
      rows: body.rows ?? [],
      throughputPerSec: body.throughputPerSec ?? 0,
    };
  } catch {
    return null;
  }
}

export async function fetchMetricsHealth(): Promise<{
  queue_depth: number;
  success_rate: number;
  jobs_total: number;
  monitor_live: number;
  monitor_stale: number;
  monitor_revoked: number;
  avg_tokens_used: number;
  p50_duration_ms?: number;
  slo_standard_under_60s_pct?: number;
  queue_backend?: string;
  proofComposition?: {
    zkProofPct: number;
    teeAttestPct: number;
    signaturePct: number;
    quotaChkPct: number;
  };
  throughput_per_sec?: number;
}> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API ? "/api/v1/terminal/metrics/health" : "/api/v1/metrics/health",
    );
    if (!res.ok) throw new Error("metrics unavailable");
    const body = await res.json();
    return {
      ...body,
      avg_tokens_used: Number(body.avg_tokens_used ?? body.avgTokensUsed ?? 0),
      success_rate: Number(body.success_rate ?? 0),
      queue_depth: Number(body.queue_depth ?? 0),
      monitor_stale: Number(body.monitor_stale ?? 0),
      p50_duration_ms: Number(body.p50_duration_ms ?? 0),
      slo_standard_under_60s_pct: Number(body.slo_standard_under_60s_pct ?? 100),
    };
  } catch {
    return {
      queue_depth: 0,
      success_rate: 99.41,
      jobs_total: 0,
      monitor_live: 0,
      monitor_stale: 0,
      monitor_revoked: 0,
      avg_tokens_used: 0,
    };
  }
}

export async function fetchVerificationProof(proofHash: string): Promise<{
  proof: VerificationProof;
  jobId?: string;
  listingId?: string;
} | null> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API
        ? `/api/v1/terminal/proof/${proofHash}`
        : `/api/v1/verification/proofs/${proofHash}`,
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function proofDownloadUrl(proofHash: string): string {
  const path = USE_TERMINAL_API
    ? `/api/v1/terminal/proof/${proofHash}?download=1`
    : `/api/v1/verification/proofs/${proofHash}?download=1`;
  return `${API_BASE}${path}`;
}

export type ProofAnchorStatus = "NONE" | "PENDING" | "ANCHORED" | "FAILED";

export interface ProofAnchorResponse {
  proofHash: string;
  status: ProofAnchorStatus;
  anchor?: {
    proofHash: string;
    status: ProofAnchorStatus;
    chainId?: number;
    txHash?: string;
    anchoredAt?: string;
  };
}

export async function fetchProofAnchor(proofHash: string): Promise<ProofAnchorResponse | null> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API
        ? `/api/v1/terminal/anchor/${proofHash}`
        : `/api/v1/verification/proofs/${proofHash}/anchor`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ProofAnchorResponse & {
      anchor?: ProofAnchorResponse["anchor"];
    };
    if (data.anchor?.status) {
      return {
        proofHash: data.proofHash ?? proofHash,
        status: data.anchor.status,
        anchor: data.anchor,
      };
    }
    return data;
  } catch {
    return null;
  }
}

function formatVerifyLabel(state: string, updatedAt: string): string {
  if (state === "VERIFIED" || state === "LIVE") return "LIVE";
  if (state === "STALE" || state === "REVOKED") return state;
  if (state === "VERIFYING" || state === "REVIEW" || state === "DEGRADED" || state === "FAILED") {
    return state;
  }
  try {
    const ago = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000));
    if (ago < 60) return `${ago}s ago`;
    if (ago < 3600) return `${Math.floor(ago / 60)}m ago`;
    return `${Math.floor(ago / 3600)}h ago`;
  } catch {
    return state;
  }
}

export function marketRowToEnhanced(row: MarketListingRow): EnhancedListing {
  const state = row.verificationState as EnhancedListing["verificationState"];
  const trustScore = row.capabilityScore != null ? String(Math.round(row.capabilityScore * 100)) : "—";
  return {
    id: row.listingId,
    listingId: row.listingId,
    ticker: `API-${row.listingId.slice(-6).toUpperCase()}`,
    type: "API Quota",
    provider: row.providerKind.toUpperCase(),
    supply: row.quotaToSell.toLocaleString(),
    unit: row.quotaUnit,
    price: row.askPriceUsdc.toFixed(4),
    change: "0.00",
    volume: "—",
    verified: state === "VERIFIED" ? "LIVE" : "PENDING",
    uptime: "—",
    status:
      row.listingStatus === "LIVE" || row.verificationState === "LIVE" || row.verificationState === "VERIFIED"
        ? "LIVE"
        : row.listingStatus === "VERIFYING" || row.verificationState === "VERIFYING"
          ? "VERIFYING"
          : row.listingStatus ?? row.verificationState,
    listingSource: "P2P",
    seller: row.sellerWallet ? `${row.sellerWallet.slice(0, 8)}…` : "@seller",
    accessMethod: "DIRECT_KEY",
    depositStatus: "SELLER_BONDED",
    depositRequired: true,
    complianceFlag: "UNVERIFIED",
    isAggregated: false,
    fragmentationLevel: "ATOMIC",
    verificationMethod: "DIRECT_KEY_TEST",
    verificationState: state,
    verificationTimestamp: formatVerifyLabel(row.verificationState, row.updatedAt),
    trustLabel: trustScore,
    trustTone: row.capabilityScore != null && row.capabilityScore >= 0.85 ? "high" : "medium",
  };
}

export async function fetchVerifyFeed(): Promise<VerifyFeedRow[]> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API ? "/api/v1/terminal/feed" : "/api/v1/verification/feed",
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { rows: VerifyFeedRow[] };
    return data.rows ?? [];
  } catch {
    return [];
  }
}

function mapProviderKind(label: string): string {
  return label.trim() || "openai-compatible";
}

function contextToTerminalMode(context?: string): string {
  switch (context) {
    case "TOKENTA_BUYBACK":
      return "buyback";
    case "PRE_PURCHASE":
      return "pre_purchase";
    case "KEY_ROTATION":
      return "rotation";
    case "LIVE":
      return "live";
    default:
      return "verify";
  }
}

export async function createVerificationJob(body: {
  apiKey: string;
  declaredQuantity: number;
  provider?: string;
  claimedModel?: string;
  compatibleBaseUrl?: string;
  context?: string;
  buybackOfferId?: string;
  allowPartialVerify?: boolean;
  orderId?: string;
  buyerId?: string;
  sellerListingId?: string;
  oldApiKey?: string;
  payerPaysFee?: boolean;
  costLiability?: string;
}): Promise<VerificationJobResponse & { streamUrl?: string }> {
  const context = body.context ?? "LISTING_DRAFT";
  const payload = USE_TERMINAL_API
    ? {
        mode: contextToTerminalMode(context),
        provider: mapProviderKind(body.provider ?? "openai-compatible"),
        declaredQuantity: Number(body.declaredQuantity),
        claimedModel: body.claimedModel,
        compatibleBaseUrl: body.compatibleBaseUrl,
        costLiability: body.costLiability ?? "SELLER_PAID",
        listingId: body.sellerListingId,
        orderId: body.orderId,
        buybackOfferId: body.buybackOfferId,
        payerPaysFee: body.payerPaysFee,
        buyerId: body.buyerId,
        oldApiKey: body.oldApiKey,
        credential: { apiKey: body.apiKey },
        options: { l1Only: context === "LIVE" },
      }
    : {
        context,
        provider: mapProviderKind(body.provider ?? "openai"),
        apiKey: body.apiKey,
        declaredQuantity: Number(body.declaredQuantity),
        claimedModel: body.claimedModel ?? "gpt-4o-mini",
        costLiability: body.costLiability ?? "SELLER_PAID",
        buybackOfferId: body.buybackOfferId,
        allowPartialVerify: body.allowPartialVerify,
        orderId: body.orderId,
        buyerId: body.buyerId,
        sellerListingId: body.sellerListingId,
        oldApiKey: body.oldApiKey,
        payerPaysFee: body.payerPaysFee,
      };

  const res = await verificationFetch(
    USE_TERMINAL_API ? "/api/v1/terminal/run" : "/api/v1/verification/jobs",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

function isTerminalJobDone(status: string | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return (
    s === "passed" ||
    s === "failed" ||
    s === "completed" ||
    s === "cancelled"
  );
}

export function subscribeJobEvents(
  jobId: string,
  onEvent: (ev: VerificationJobEvent) => void,
  onDone?: () => void,
): () => void {
  let closed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const finish = () => {
    if (closed) return;
    closed = true;
    if (pollTimer) clearInterval(pollTimer);
    es.close();
    onDone?.();
  };

  const syncFromApi = async () => {
    if (closed) return;
    try {
      const j = await getVerificationJob(jobId);
      if (j.events?.length) {
        for (const ev of j.events) onEvent(ev);
      }
      if (isTerminalJobDone(j.status) || isTerminalJobDone(j.terminalStatus)) {
        finish();
      }
    } catch {
      /* polling fallback — ignore transient errors */
    }
  };

  const url = USE_TERMINAL_API
    ? `${API_BASE}${terminalJobPath(jobId)}/events`
    : `${API_BASE}/api/v1/verification/jobs/${jobId}/events`;
  const es = new EventSource(url);

  const handler = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as VerificationJobEvent;
      onEvent(data);
      if (data.type === "job_completed" || data.type === "job_failed") {
        finish();
      }
    } catch {
      /* ignore parse errors */
    }
  };

  es.addEventListener("step_started", handler);
  es.addEventListener("step_completed", handler);
  es.addEventListener("job_completed", handler);
  es.addEventListener("job_failed", handler);
  es.onmessage = handler;

  es.onerror = () => {
    void syncFromApi();
  };

  pollTimer = setInterval(() => void syncFromApi(), 2000);
  void syncFromApi();

  return () => {
    closed = true;
    if (pollTimer) clearInterval(pollTimer);
    es.close();
  };
}

export interface VerificationTrailEntry {
  jobId: string;
  proofHash: string;
  context: string;
  terminalOutcome: TerminalOutcome;
  totalTokensUsed: number;
  failureCode?: string;
  recordedAt: string;
}

export async function fetchOrderVerificationTrail(
  orderId: string,
): Promise<VerificationTrailEntry[]> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API
        ? `/api/v1/terminal/orders/${orderId}/verification-trail`
        : `/api/v1/orders/${orderId}/verification-trail`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { entries: VerificationTrailEntry[] };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

export async function createPrePurchaseVerification(body: {
  orderId: string;
  buyerId: string;
  apiKey: string;
  declaredQuantity: number;
  provider?: string;
  sellerListingId?: string;
}): Promise<VerificationJobResponse & { streamUrl?: string }> {
  return createVerificationJob({
    ...body,
    context: "PRE_PURCHASE",
    payerPaysFee: true,
    claimedModel: "gpt-4o-mini",
  });
}

export async function createKeyRotationVerification(body: {
  orderId: string;
  newApiKey: string;
  oldApiKey: string;
  declaredQuantity: number;
  provider?: string;
}): Promise<VerificationJobResponse & { streamUrl?: string }> {
  return createVerificationJob({
    apiKey: body.newApiKey,
    oldApiKey: body.oldApiKey,
    declaredQuantity: body.declaredQuantity,
    provider: body.provider,
    context: "KEY_ROTATION",
    orderId: body.orderId,
    claimedModel: "gpt-4o-mini",
  });
}

export async function signBindPayloadDev(body: {
  listingId: string;
  jobId: string;
}): Promise<{ signature: string } | null> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API ? "/api/v1/terminal/sign/bind" : "/api/v1/dev/bind/sign",
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function bindListingVerification(
  listingId: string,
  jobId: string,
  signature?: string,
): Promise<{ listing: unknown; proofHash: string } | null> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API
        ? `/api/v1/terminal/listings/${listingId}/bind-verification`
        : `/api/v1/listings/${listingId}/bind-verification`,
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, signature }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function devResetData(): Promise<{ cleared: boolean } | null> {
  try {
    const res = await verificationFetch("/api/v1/terminal/dev/reset", { method: "POST" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function publishListing(
  listingId: string,
): Promise<{ listing: unknown; status: string } | { error: string; currentStatus?: string; code?: string }> {
  const res = await verificationFetch(
    `/api/v1/terminal/listings/${listingId}/publish`,
    { method: "POST", headers: { "Content-Type": "application/json" } },
  );
  const data = await res.json();
  if (!res.ok) return data as { error: string; currentStatus?: string; code?: string };
  return data as { listing: unknown; status: string };
}

export async function signEscrowPayloadDev(body: {
  orderId: string;
  amountUsdc: string;
  action: "fund" | "release";
}): Promise<{ signature: string } | null> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API ? "/api/v1/terminal/sign/escrow" : "/api/v1/dev/escrow/sign",
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fundOrderEscrow(
  orderId: string,
  amountUsdc: string,
  signature?: string,
  /** Real on-chain transfer tx hash. When present the backend persists it instead
   * of minting a placeholder, and skips the ledger debit (because the buyer's
   * USDC has already left their wallet). */
  txHash?: string,
): Promise<{ escrow: { status: string; fundTxHash?: string } } | null> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API
        ? `/api/v1/terminal/orders/${orderId}/escrow/fund`
        : `/api/v1/orders/${orderId}/escrow/fund`,
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc, signature, txHash }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function releaseOrderEscrow(
  orderId: string,
  amountUsdc: string,
  signature?: string,
): Promise<{
  escrow: { status: string; releaseTxHash?: string };
  sellerPayout?: {
    netUsdc: string;
    feeUsdc: string;
    payoutTxHash: string;
    treasuryTxHash?: string;
    onChainMode?: string;
  };
  settlement?: {
    mode: string;
    escrowWallet?: string;
    treasuryWallet?: string;
    sellerTxHash?: string;
    treasuryTxHash?: string;
  };
} | null> {
  try {
    const res = await verificationFetch(
      USE_TERMINAL_API
        ? `/api/v1/terminal/orders/${orderId}/escrow/release`
        : `/api/v1/orders/${orderId}/escrow/release`,
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc, signature }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function confirmTokentaBuyback(body: {
  jobId: string;
  buybackOfferId: string;
  quantity: number;
  depositAcknowledged: boolean;
}): Promise<{
  orderId: string;
  escrowId: string;
  rotationDeadline: string;
}> {
  const res = await verificationFetch(
    USE_TERMINAL_API ? "/api/v1/terminal/buyback/confirm" : "/api/v1/sell/tokenta-buyback/confirm",
    {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verificationJobId: body.jobId,
      buybackOfferId: body.buybackOfferId,
      quantity: body.quantity,
      depositAcknowledged: body.depositAcknowledged,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

export async function getVerificationJob(jobId: string): Promise<VerificationJobResponse> {
  const res = await verificationFetch(
    USE_TERMINAL_API ? terminalJobPath(jobId) : `/api/v1/verification/jobs/${jobId}`,
  );
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

export async function fetchTerminalReceipt(
  jobId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const tid = jobId.startsWith("tjob_") ? jobId : `tjob_${jobId}`;
    const res = await verificationFetch(`/api/v1/terminal/receipt/${tid}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function submitTerminalAnchor(
  proofHash: string,
  terminalJobId?: string,
): Promise<{ anchorStatus?: string; txHash?: string | null } | null> {
  try {
    const res = await verificationFetch(`/api/v1/terminal/anchor/${proofHash}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminalJobId }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface TerminalOrderRow {
  orderId: string;
  listingId: string;
  sellerWallet: string | null;
  buyerWallet: string | null;
  mode: "BUYOUT" | "PARTIAL";
  quantity: number;
  amountUsdc: string;
  status: string;
  createdAt: string;
}

export function computePurchaseAmountUsdc(input: {
  askPriceUsdc: number;
  supplyTokens: number;
  mode: "BUYOUT" | "PARTIAL";
  quantity: number;
}): string {
  const units = input.mode === "BUYOUT" ? input.supplyTokens : input.quantity;
  return Math.max(0.01, (input.askPriceUsdc * units) / 1_000_000).toFixed(2);
}

export async function fetchTerminalOrder(
  orderId: string,
): Promise<TerminalOrderRow | null> {
  const isDemoMode = typeof window !== "undefined" && window.location.pathname === "/cleanverse-demo";
  if (isDemoMode) {
    const { DEMO_ORDERS } = await import("./demo-fixtures");
    return DEMO_ORDERS.find(o => o.orderId === orderId) ?? null;
  }
  try {
    const res = await verificationFetch(`/api/v1/terminal/orders/${orderId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { order?: TerminalOrderRow };
    return data.order ?? null;
  } catch {
    return null;
  }
}

export async function fetchTerminalOrderEscrow(
  orderId: string,
): Promise<{ status: string; amountUsdc?: string; fundTxHash?: string; releaseTxHash?: string } | null> {
  const isDemoMode = typeof window !== "undefined" && window.location.pathname === "/cleanverse-demo";
  if (isDemoMode) {
    const { DEMO_ESCROWS } = await import("./demo-fixtures");
    return DEMO_ESCROWS[orderId] ?? null;
  }
  try {
    const res = await verificationFetch(`/api/v1/terminal/orders/${orderId}/escrow`);
    if (!res.ok) return null;
    const data = (await res.json()) as { escrow?: { status: string; amountUsdc?: string; fundTxHash?: string; releaseTxHash?: string } };
    return data.escrow ?? null;
  } catch {
    return null;
  }
}

export async function fetchTerminalOrders(opts?: {
  wallet?: string;
  role?: "buyer" | "seller" | "all";
}): Promise<TerminalOrderRow[]> {
  const isDemoMode = typeof window !== "undefined" && window.location.pathname === "/cleanverse-demo";
  if (isDemoMode) {
    const { DEMO_ORDERS } = await import("./demo-fixtures");
    return DEMO_ORDERS;
  }
  try {
    const params = new URLSearchParams();
    if (opts?.wallet) params.set("wallet", opts.wallet);
    if (opts?.role) params.set("role", opts.role);
    const q = params.toString() ? `?${params}` : "";
    const res = await verificationFetch(`/api/v1/terminal/orders${q}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { orders?: TerminalOrderRow[] };
    return data.orders ?? [];
  } catch {
    return [];
  }
}

export async function cancelTerminalJob(jobId: string): Promise<boolean> {
  const tid = jobId.startsWith("tjob_") ? jobId : `tjob_${jobId}`;
  try {
    const res = await verificationFetch(`/api/v1/terminal/run/${tid}/cancel`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function terminalReceiptExportUrl(jobId: string): string {
  const tid = jobId.startsWith("tjob_") ? jobId : `tjob_${jobId}`;
  return `${API_BASE}/api/v1/terminal/receipt/${tid}/export`;
}

export async function purchaseListingTerminal(body: {
  listingId: string;
  mode?: "BUYOUT" | "PARTIAL";
  quantity?: number;
  amountUsdc?: string;
}): Promise<{ orderId: string; order?: TerminalOrderRow }> {
  const res = await verificationFetch("/api/v1/terminal/orders/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

export interface SellerIncomeResponse {
  wallet: string;
  availableUsdc: string;
  lifetimeEarnedUsdc: string;
  pendingEscrowUsdc: string;
  saleCount: number;
}

export async function fetchSellerIncome(): Promise<SellerIncomeResponse | null> {
  try {
    const res = await verificationFetch("/api/v1/terminal/wallet/income");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function walletDepositTerminal(
  amountUsdc: string,
): Promise<WalletSummaryResponse | null> {
  try {
    const res = await verificationFetch("/api/v1/terminal/wallet/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: WalletSummaryResponse };
    return data.summary ?? null;
  } catch {
    return null;
  }
}

export async function walletWithdrawTerminal(
  amountUsdc: string,
): Promise<{ txHash?: string; summary?: WalletSummaryResponse } | null> {
  try {
    const res = await verificationFetch("/api/v1/terminal/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? res.statusText);
    }
    return res.json();
  } catch (e) {
    if (e instanceof Error) throw e;
    return null;
  }
}

export interface OrderRoomMessage {
  id: string;
  orderId: string;
  from: string;
  body: string;
  ts: string;
}

export async function fetchOrderRoomMessages(orderId: string): Promise<OrderRoomMessage[]> {
  try {
    const res = await verificationFetch(`/api/v1/terminal/orders/${orderId}/messages`);
    if (!res.ok) return [];
    const data = (await res.json()) as { messages?: OrderRoomMessage[] };
    return data.messages ?? [];
  } catch {
    return [];
  }
}

export async function postOrderRoomMessage(
  orderId: string,
  body: string,
  from = "YOU",
): Promise<OrderRoomMessage | null> {
  try {
    const res = await verificationFetch(`/api/v1/terminal/orders/${orderId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, from }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: OrderRoomMessage };
    return data.message ?? null;
  } catch {
    return null;
  }
}

export type ReputationStatus = "UNVERIFIED" | "VERIFIED";
export type ReputationTier = "NONE" | "C" | "B" | "A" | "S";
export type ReputationConfidence = "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH";

export interface ReputationScoreResponse {
  status: ReputationStatus;
  tier: ReputationTier;
  composite: number | null;
  compositeDisplay: string;
  confidence: ReputationConfidence;
  confidenceScore: number;
  internalScore: number;
  percentileLabel: string | null;
  factors: { key: string; label: string; weightPct: number; score: number | null }[];
  executionHistory: {
    verifiedRuns: number;
    anchoredReceipts: number;
    completedVerifications: number;
  };
  nextMilestone: string;
  complianceScore: number | null;
  compliance: { riskFactors: string[]; positiveFactors: string[] };
}

export interface ReputationLedgerRow {
  ts: string;
  occurredAt?: string;
  actor: string;
  event: string;
  delta: string;
  score: string;
}

export interface TerminalTimezoneResponse {
  effectiveTimezone: string;
  source: "browser" | "ip" | "utc" | "session";
  utcOffsetMinutes: number;
  displayLabel: string;
  serverTimeUtc: string;
  localTime: string;
  localDate: string;
}

export async function fetchTerminalTimezone(): Promise<TerminalTimezoneResponse | null> {
  try {
    const res = await verificationFetch("/api/v1/terminal/timezone");
    if (!res.ok) return null;
    return (await res.json()) as TerminalTimezoneResponse;
  } catch {
    return null;
  }
}

export async function fetchTerminalReputation(): Promise<ReputationScoreResponse | null> {
  try {
    const res = await verificationFetch("/api/v1/terminal/reputation");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchTerminalReputationLedger(): Promise<ReputationLedgerRow[]> {
  try {
    const res = await verificationFetch("/api/v1/terminal/reputation/ledger?limit=50");
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: ReputationLedgerRow[] };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

export interface WalletSummaryResponse {
  balances: {
    asset: string;
    total: string;
    available: string;
    escrowed: string;
    staked: string;
    valueUsdc: string;
  }[];
  settlementStream: {
    ts: string;
    type: string;
    reference: string;
    amount: string;
    currency: string;
  }[];
  stake: {
    reputationBondUsdc: string;
    sellerCollateralUsdc: string;
    validatorStakeTknt: string;
    estAprPct: string;
    slashRisk: string;
  };
  network: string;
  depositEtaSec: number;
}

export async function fetchTerminalWalletSummary(): Promise<WalletSummaryResponse | null> {
  try {
    const res = await verificationFetch("/api/v1/terminal/wallet/summary");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface AnalyticsOverviewResponse {
  mode: "BUY" | "SELL";
  flow: { key: string; pct: number; valueLabel: string }[];
  flowSeries: number[];
  heatmap: number[];
  sla: {
    uptimeCommitmentPct: string;
    actualPct: string;
    missCount: number;
    creditOwedUsdc: string;
    timeline: { day: number; breach: boolean }[];
    breachCount: number;
  };
  counterparties: {
    rank: string;
    entity: string;
    volumeLabel: string;
    orders: number;
    deliveryPct: string;
    repScore: string;
  }[];
}

export interface TerminalNetworkResponse {
  network: string;
  chainId: number;
  explorerUrl: string;
  contractAddress: string | null;
  dryRun: boolean;
  treasurySignerConfigured: boolean;
  connected: boolean;
  blockNumber: number | null;
  gasPriceGwei: string | null;
  usdcAddress?: string;
  escrowWallet?: string;
  treasuryWallet?: string;
  escrowWalletConfigured?: boolean;
  treasuryWalletConfigured?: boolean;
  escrowReleaseSignerConfigured?: boolean;
  escrowOperatorAddress?: string | null;
}

export async function fetchTerminalNetwork(): Promise<TerminalNetworkResponse | null> {
  const isDemoMode = typeof window !== "undefined" && window.location.pathname === "/cleanverse-demo";
  if (isDemoMode) {
    return {
      network: TOKENTA_NETWORK_SLUG,
      chainId: TOKENTA_CHAIN_ID,
      explorerUrl: TOKENTA_EXPLORER_URL,
      contractAddress: null,
      dryRun: false,
      treasurySignerConfigured: true,
      connected: true,
      blockNumber: 1234567,
      gasPriceGwei: "0.1",
      usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      escrowWallet: "0x2ecd60dc0fe611c60bd241f46943b2813abb243f",
      treasuryWallet: "0x2ecd60dc0fe611c60bd241f46943b2813abb243f",
      escrowWalletConfigured: true,
      treasuryWalletConfigured: true,
      escrowReleaseSignerConfigured: true,
      escrowOperatorAddress: "0x2ecd60dc0fe611c60bd241f46943b2813abb243f",
    };
  }
  try {
    const res = await verificationFetch("/api/v1/terminal/network");
    if (!res.ok) return null;
    const body = (await res.json()) as TerminalNetworkResponse;
    return {
      network: body.network ?? TOKENTA_NETWORK_SLUG,
      chainId: body.chainId ?? TOKENTA_CHAIN_ID,
      explorerUrl: body.explorerUrl ?? TOKENTA_EXPLORER_URL,
      contractAddress: body.contractAddress ?? null,
      dryRun: body.dryRun ?? true,
      treasurySignerConfigured: body.treasurySignerConfigured ?? false,
      connected: body.connected ?? false,
      blockNumber: body.blockNumber ?? null,
      gasPriceGwei: body.gasPriceGwei ?? null,
      usdcAddress: body.usdcAddress,
      escrowWallet: body.escrowWallet,
      treasuryWallet: body.treasuryWallet,
      escrowWalletConfigured: body.escrowWalletConfigured,
      treasuryWalletConfigured: body.treasuryWalletConfigured,
      escrowReleaseSignerConfigured: body.escrowReleaseSignerConfigured,
      escrowOperatorAddress: body.escrowOperatorAddress,
    };
  } catch {
    return null;
  }
}

export async function fetchTerminalAnalyticsOverview(
  mode: "BUY" | "SELL",
): Promise<AnalyticsOverviewResponse | null> {
  try {
    const res = await verificationFetch(`/api/v1/terminal/analytics/overview?mode=${mode}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function runOrderRoomAction(
  orderId: string,
  action: "run-reverify" | "attach-attestation" | "escalate-dispute" | "accept-delivery" | "release-escrow",
  payload?: Record<string, unknown>,
): Promise<{ ok: boolean; jobId?: string; error?: string } | null> {
  try {
    const res = await verificationFetch(`/api/v1/terminal/orders/${orderId}/actions/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: err.error ?? "action failed" };
    }
    const data = (await res.json()) as { jobId?: string };
    return { ok: true, jobId: data.jobId };
  } catch {
    return null;
  }
}

/** Updates the ask price of the caller's listing. Returns the updated listing row or an error. */
export async function updateListingPrice(
  listingId: string,
  askPriceUsdc: number,
): Promise<{ askPriceUsdc: number; listingId: string } | { error: string; code?: string }> {
  const res = await verificationFetch(`/api/v1/terminal/listings/${listingId}/price`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ askPriceUsdc }),
  });
  const data = await res.json();
  if (!res.ok) return data as { error: string; code?: string };
  return data as { askPriceUsdc: number; listingId: string };
}

export interface TreasuryResponse {
  treasuryWallet: string;
  availableUsdc: string;
  lifetimeFeesUsdc: string;
  feeBps: number;
  feePct: string;
  recentEvents: Array<{
    id: string;
    amountUsdc: string;
    orderId?: string;
    txHash?: string;
    at: string;
  }>;
}

/** Fetches the Tokenta treasury balance and recent fee events. */
export async function fetchTreasuryBalance(): Promise<TreasuryResponse | null> {
  try {
    const res = await verificationFetch("/api/v1/terminal/wallet/treasury");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
