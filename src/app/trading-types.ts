/** Two-mode trading architecture — BUY / SELL (Tokenta as counterparty, not a user mode) */

export type TradingMode = "BUY" | "SELL";
export type Role = TradingMode;

/** @deprecated Use TradingMode */
export type LegacyTradingMode = "BUYER" | "SELLER" | "PLATFORM";

export type CounterpartyType = "USER" | "TOKENTA_DIRECT";

export type BuyMarketSource = "ALL" | "USER_MARKETPLACE" | "TOKENTA_DIRECT";
export type SellMarketTab = "P2P_LISTING" | "TOKENTA_BUYBACK";

export type ListingSource = "P2P" | "PLATFORM_INVENTORY" | "PLATFORM_BUYBACK_OFFER";
export type AccessMethod = "DIRECT_KEY" | "PROXY_GATEWAY" | "KEY_ROTATION_REQUIRED";
export type DepositStatus = "SELLER_BONDED" | "PLATFORM_GUARANTEED" | "NO_DEPOSIT";
export type ComplianceFlag = "VERIFIED_TOS" | "UNVERIFIED" | "GRAY_MARKET";
/** Mechanism v0.4 terminal outcomes (RUN VERIFICATION pipeline). */
export type TerminalVerificationOutcome = "PASS" | "FAIL" | "REVIEW" | "DEGRADED";

/**
 * How verification was performed — aligned with engine §11 + mechanism paradigms.
 * CAPACITY_INFERENCE = standard L1–L3 stochastic probe; LIVENESS_ONLY = LIVE/monitor tick.
 */
export type VerificationMethod =
  | "CAPACITY_INFERENCE"
  | "LIVENESS_ONLY"
  | "DIRECT_KEY_TEST"
  | "PROXY_HEARTBEAT"
  | "ROTATION_VALIDATION"
  | "ZK_PROOF"
  | "TEE_ATTEST"
  | "SIGNATURE"
  | "QUOTA_CHK";

export type OrderTransactionType =
  | "P2P_PURCHASE"
  | "P2P_SALE"
  | "TOKENTA_DIRECT_PURCHASE"
  | "TOKENTA_BUYBACK_SALE";

/** @deprecated Alias for migration */
export type OrderTransactionTypeLegacy =
  | "P2P_PURCHASE"
  | "P2P_SALE"
  | "PLATFORM_DIRECT_PURCHASE"
  | "PLATFORM_BUYBACK_SALE";

export type MarketSortKey =
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "TRUST"
  | "VERIFY_FRESH"
  | "INVENTORY_SIZE"
  | "ACCESS_METHOD";

export type MarketFilters = {
  p2pOnly: boolean;
  platformInventoryOnly: boolean;
  platformBuybackOnly: boolean;
  directKeyOnly: boolean;
  verifiedTosOnly: boolean;
  aggregatedOnly: boolean;
};

export const DEFAULT_MARKET_FILTERS: MarketFilters = {
  p2pOnly: false,
  platformInventoryOnly: false,
  platformBuybackOnly: false,
  directKeyOnly: false,
  verifiedTosOnly: false,
  aggregatedOnly: false,
};

export type EnhancedListing = {
  id: string;
  listingId?: string;
  ticker: string;
  type: string;
  provider: string;
  supply: string;
  unit: string;
  price: string;
  change: string;
  volume: string;
  verified: string;
  uptime: string;
  status: string;
  listingSource: ListingSource;
  seller?: string;
  accessMethod: AccessMethod;
  depositStatus: DepositStatus;
  depositRequired: boolean;
  complianceFlag: ComplianceFlag;
  isAggregated: boolean;
  fragmentationLevel: "ATOMIC" | "AGGREGATED" | "SPLIT_AVAILABLE";
  verificationMethod: VerificationMethod;
  /** From GET /api/v1/market/listings when live API row present */
  verificationState?: "LIVE" | "STALE" | "REVOKED" | "VERIFYING" | "REVIEW" | "DEGRADED" | "FAILED";
  verificationTimestamp: string;
  trustLabel: string;
  trustTone: "high" | "medium" | "risk";
};

export type EnhancedOrder = {
  id: string;
  side: "BUY" | "SELL";
  asset: string;
  qty: string;
  price: string;
  value: string;
  escrow: string;
  status: string;
  counterparty: string;
  transactionType: OrderTransactionType;
  accessMethod: AccessMethod;
  buyerDeposit?: string;
  sellerDeposit?: string;
  platformGuaranteed?: boolean;
  rotationRequired?: boolean;
};

export type BuybackOffer = {
  id: string;
  provider: string;
  product: string;
  minQty: string;
  buybackPrice: string;
  marketDiscount: string;
  bondPct: string;
};

export function calculateDeposits(
  totalUsdc: number,
  scenario: "P2P" | "TOKENTA_AS_SELLER" | "TOKENTA_AS_BUYER",
): {
  buyerPayment: number;
  buyerDeposit: number;
  sellerDeposit: number;
  platformFee: number;
  platformReserve: number;
} {
  const platformFee = totalUsdc * 0.02;
  if (scenario === "P2P") {
    return {
      buyerPayment: totalUsdc,
      buyerDeposit: totalUsdc * 1.5,
      sellerDeposit: totalUsdc * 1.5,
      platformFee,
      platformReserve: 0,
    };
  }
  if (scenario === "TOKENTA_AS_SELLER") {
    return {
      buyerPayment: totalUsdc,
      buyerDeposit: 0,
      sellerDeposit: 0,
      platformFee: 0,
      platformReserve: totalUsdc * 1.5,
    };
  }
  return {
    buyerPayment: totalUsdc,
    buyerDeposit: 0,
    sellerDeposit: totalUsdc * 2,
    platformFee: 0,
    platformReserve: totalUsdc,
  };
}

export function isTokentaListing(listing: EnhancedListing): boolean {
  return listing.listingSource === "PLATFORM_INVENTORY";
}

export function isTokentaCounterparty(counterparty: string): boolean {
  return counterparty.toUpperCase() === "TOKENTA";
}
