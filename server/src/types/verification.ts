/** Shared verification contracts — engine + mechanism v0.4 */

export type TerminalOutcome = "PASS" | "FAIL" | "REVIEW" | "DEGRADED";

export type VerificationLockState =
  | "UNLOCKED"
  | "PROBE_ALLOWED"
  | "L2_LOCKED"
  | "TERMINAL_FAIL_LOCKED"
  | "TERMINAL_PASS_CACHED"
  | "COOLDOWN_LOCKED"
  | "PARTIAL_SUCCESS_DEGRADED";

export type ExecutionCapacityBand = "UNKNOWN" | "INSUFFICIENT" | "SUFFICIENT" | "ABUNDANT";

export type DeclaredAlignment = "CONSISTENT" | "UNDERCLAIMED" | "OVERCLAIMED" | "UNVERIFIABLE";

export type CostLiability = "SELLER_PAID" | "PLATFORM_SUBSIDIZED" | "BUYER_TRIGGERED";

export type JobContext = "LISTING_DRAFT" | "TOKENTA_BUYBACK" | "PRE_PURCHASE" | "KEY_ROTATION" | "LIVE";

export type VerificationJobStatus = "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "CANCELLED";

export type ProviderKind = "openai" | "anthropic" | "google" | "openai_compatible" | "custom";

export type QuantityBandId =
  | "MICRO_0_1K"
  | "SMALL_1K_10K"
  | "MEDIUM_10K_100K"
  | "LARGE_100K_1M"
  | "XL_1M_PLUS"
  | "UNKNOWN";

export interface EstimatedExecutableQuantityRange {
  min: number | null;
  max: number | null;
  band: QuantityBandId;
  unit: string;
}

export interface ProbeRecord {
  paradigm: string;
  endpoint: string;
  probeModelId: string;
  httpStatus: number;
  latencyMs: number;
  tokensUsed: number;
  requestsUsed: number;
  maxTokensUsed: number;
  result: "PASS" | "FAIL" | "SKIP";
  timestamp: string;
  cached: boolean;
  errorCode?: string;
}

export interface VerificationProof {
  jobId: string;
  terminalOutcome: TerminalOutcome;
  capabilityScore: number;
  trustScore: number;
  complianceScore: number;
  executionCapacityBand: ExecutionCapacityBand;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  estimatedExecutableQuantityRange: EstimatedExecutableQuantityRange;
  declaredAlignment: DeclaredAlignment;
  declaredQuantity: number;
  probeModelId: string;
  fallbackUsed: boolean;
  costLiability: CostLiability;
  verificationLockState: VerificationLockState;
  failureCode?: string;
  failureMessage?: string;
  probeManifest: ProbeRecord[];
  totalTokensUsed: number;
  totalRequestsUsed: number;
  operationalEnvelopeLimit: number;
  consentDisclosureCeiling: number;
  cacheHit: boolean;
  proofHash: string;
  completedAt: string;
}

export interface CreateVerificationJobRequest {
  context: JobContext;
  provider: ProviderKind;
  apiKey: string;
  declaredQuantity: number;
  quantityUnit?: string;
  claimedModel?: string;
  listingId?: string;
  costLiability?: CostLiability;
  allowPartialVerify?: boolean;
  askPriceUsdc?: number;
  autoListAfterVerify?: boolean;
  buybackOfferId?: string;
  orderId?: string;
  buyerId?: string;
  sellerListingId?: string;
  oldApiKey?: string;
  oldKeyFingerprint?: string;
  payerPaysFee?: boolean;
  l1Only?: boolean;
  listingSource?: "P2P" | "TOKENTA_DIRECT";
  platformSubsidized?: boolean;
  forceL2?: boolean;
  useSellerStoredKey?: boolean;
  /** OpenAI-compatible gateway base URL (no trailing slash). Mechanism §13. */
  compatibleBaseUrl?: string;
  /** L1 probe strategy for OpenAI-compatible vendors without /v1/models */
  l1Strategy?: "models" | "chat";
  /** Catalog slug (e.g. deepseek) — used to resolve probe base URL when kind is openai_compatible */
  providerSlug?: string;
}

export interface VerificationJobResponse {
  jobId: string;
  status: VerificationJobStatus;
  terminalOutcome?: TerminalOutcome;
  proof?: VerificationProof;
  stepsCompleted: number;
  stepsTotal: number;
  createdAt: string;
}

export type VerificationStepName =
  | "CONNECTIVITY"
  | "QUOTA"
  | "RATE_LIMIT"
  | "RISK_ANALYSIS"
  | "FINALIZE";

export interface VerificationJobEvent {
  type: "step_started" | "step_completed" | "step_failed" | "job_completed" | "job_failed";
  jobId: string;
  step?: VerificationStepName;
  message?: string;
  proof?: VerificationProof;
  timestamp: string;
}
