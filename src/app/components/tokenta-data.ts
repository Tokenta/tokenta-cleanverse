import type {
  BuybackOffer,
  EnhancedListing,
  EnhancedOrder,
  MarketFilters,
  MarketSortKey,
  BuyMarketSource,
  SellMarketTab,
  TradingMode,
} from "../trading-types";

export const enhancedListings: EnhancedListing[] = [
  {
    id: "AST-001", ticker: "GPT4-CMP", type: "Compute", provider: "NEXUS-LABS", supply: "12,400", unit: "TFLOP-h",
    price: "0.0420", change: "+2.41", volume: "184.2K", verified: "ZK-PROOF", uptime: "99.97", status: "LIVE",
    listingSource: "P2P", seller: "@nexus_ops", accessMethod: "DIRECT_KEY", depositStatus: "SELLER_BONDED",
    depositRequired: true, complianceFlag: "VERIFIED_TOS", isAggregated: false, fragmentationLevel: "ATOMIC",
    verificationMethod: "DIRECT_KEY_TEST", verificationTimestamp: "30s ago", trustLabel: "92", trustTone: "high",
  },
  {
    id: "AST-002", ticker: "CLAUDE-API", type: "API Quota", provider: "ANTHROPIC", supply: "200,000", unit: "M-tokens",
    price: "0.0185", change: "-0.84", volume: "92.7K", verified: "TEE-ATTEST", uptime: "99.99", status: "LIVE",
    listingSource: "PLATFORM_INVENTORY", accessMethod: "PROXY_GATEWAY", depositStatus: "PLATFORM_GUARANTEED",
    depositRequired: false, complianceFlag: "VERIFIED_TOS", isAggregated: true, fragmentationLevel: "AGGREGATED",
    verificationMethod: "PROXY_HEARTBEAT", verificationTimestamp: "12s ago", trustLabel: "TOKENTA GUARANTEED", trustTone: "high",
  },
  {
    id: "AST-003", ticker: "LLAMA70-W", type: "Model Access", provider: "META-OSS", supply: "3,840", unit: "seats",
    price: "1.2400", change: "+5.17", volume: "47.3K", verified: "SIGNATURE", uptime: "99.84", status: "LIVE",
    listingSource: "P2P", seller: "@meta_reseller", accessMethod: "KEY_ROTATION_REQUIRED", depositStatus: "SELLER_BONDED",
    depositRequired: true, complianceFlag: "UNVERIFIED", isAggregated: false, fragmentationLevel: "SPLIT_AVAILABLE",
    verificationMethod: "ROTATION_VALIDATION", verificationTimestamp: "4m ago", trustLabel: "78", trustTone: "medium",
  },
  {
    id: "AST-004", ticker: "H100-PRV", type: "Compute", provider: "CORE-WEAVE", supply: "640", unit: "GPU-h",
    price: "3.8700", change: "+0.92", volume: "212.0K", verified: "ZK-PROOF", uptime: "99.92", status: "LIVE",
    listingSource: "PLATFORM_INVENTORY", accessMethod: "PROXY_GATEWAY", depositStatus: "PLATFORM_GUARANTEED",
    depositRequired: false, complianceFlag: "VERIFIED_TOS", isAggregated: false, fragmentationLevel: "ATOMIC",
    verificationMethod: "PROXY_HEARTBEAT", verificationTimestamp: "8s ago", trustLabel: "TOKENTA GUARANTEED", trustTone: "high",
  },
  {
    id: "AST-005", ticker: "EMBED-V3", type: "API Quota", provider: "OPENAI", supply: "21,000", unit: "M-tokens",
    price: "0.0007", change: "-1.20", volume: "63.4K", verified: "TEE-ATTEST", uptime: "99.95", status: "LIVE",
    listingSource: "P2P", seller: "@openai_surplus", accessMethod: "DIRECT_KEY", depositStatus: "SELLER_BONDED",
    depositRequired: true, complianceFlag: "GRAY_MARKET", isAggregated: false, fragmentationLevel: "ATOMIC",
    verificationMethod: "DIRECT_KEY_TEST", verificationTimestamp: "18m ago", trustLabel: "64", trustTone: "risk",
  },
  {
    id: "AST-006", ticker: "GPT4-TURBO-SKU", type: "API Quota", provider: "OPENAI", supply: "200,000", unit: "tokens",
    price: "0.0180", change: "+1.10", volume: "41.2K", verified: "LIVE", uptime: "99.8", status: "LIVE",
    listingSource: "PLATFORM_INVENTORY", accessMethod: "PROXY_GATEWAY", depositStatus: "PLATFORM_GUARANTEED",
    depositRequired: false, complianceFlag: "VERIFIED_TOS", isAggregated: true, fragmentationLevel: "AGGREGATED",
    verificationMethod: "PROXY_HEARTBEAT", verificationTimestamp: "5s ago", trustLabel: "TOKENTA GUARANTEED", trustTone: "high",
  },
  {
    id: "AST-007", ticker: "A100-SPOT", type: "Compute", provider: "LAMBDA-LBS", supply: "1,280", unit: "GPU-h",
    price: "2.1400", change: "-2.18", volume: "156.8K", verified: "ZK-PROOF", uptime: "99.88", status: "LIVE",
    listingSource: "P2P", seller: "@lambda_seller", accessMethod: "DIRECT_KEY", depositStatus: "NO_DEPOSIT",
    depositRequired: false, complianceFlag: "UNVERIFIED", isAggregated: false, fragmentationLevel: "ATOMIC",
    verificationMethod: "DIRECT_KEY_TEST", verificationTimestamp: "2h ago", trustLabel: "81", trustTone: "medium",
  },
  {
    id: "AST-008", ticker: "MISTRAL-L", type: "Model Access", provider: "MISTRAL-AI", supply: "2,400", unit: "seats",
    price: "0.8400", change: "+1.62", volume: "29.1K", verified: "TEE-ATTEST", uptime: "99.93", status: "LIVE",
    listingSource: "P2P", seller: "@mistral_node", accessMethod: "KEY_ROTATION_REQUIRED", depositStatus: "SELLER_BONDED",
    depositRequired: true, complianceFlag: "VERIFIED_TOS", isAggregated: false, fragmentationLevel: "SPLIT_AVAILABLE",
    verificationMethod: "ROTATION_VALIDATION", verificationTimestamp: "1m ago", trustLabel: "89", trustTone: "high",
  },
];

/** @deprecated use enhancedListings — kept for chart/trade panel compatibility */
export const assets = enhancedListings;

export const platformInventoryKeys: PlatformInventoryKey[] = [
  { keyId: "#A1B2", provider: "OpenAI", originalQty: "100k tok", remaining: "100k", purchaseDate: "2026-05-01", costBasis: "$20", status: "ACTIVE" },
  { keyId: "#C3D4", provider: "Anthropic", originalQty: "50k tok", remaining: "30k", purchaseDate: "2026-05-10", costBasis: "$15", status: "PARTIAL" },
  { keyId: "#E5F6", provider: "OpenAI", originalQty: "50k tok", remaining: "50k", purchaseDate: "2026-05-12", costBasis: "$11", status: "ACTIVE" },
  { keyId: "#G7H8", provider: "Google", originalQty: "200k tok", remaining: "0", purchaseDate: "2026-04-20", costBasis: "$38", status: "RETIRED" },
];

export const buybackOffers: BuybackOffer[] = [
  {
    id: "BB-001",
    provider: "OpenAI",
    product: "GPT-4 Turbo",
    minQty: "10k tokens",
    buybackPrice: "$0.018 / 1k",
    marketDiscount: "20% below market",
    bondPct: "200%",
  },
  {
    id: "BB-002",
    provider: "Anthropic",
    product: "Claude 3.5 Sonnet",
    minQty: "5k tokens",
    buybackPrice: "$0.014 / 1k",
    marketDiscount: "18% below market",
    bondPct: "200%",
  },
];

export const orderBook = {
  bids: [
    { price: "0.0419", size: "1,200", total: "50.28" },
    { price: "0.0418", size: "3,400", total: "142.12" },
    { price: "0.0417", size: "2,100", total: "87.57" },
    { price: "0.0416", size: "5,800", total: "241.28" },
    { price: "0.0415", size: "4,200", total: "174.30" },
    { price: "0.0414", size: "8,100", total: "335.34" },
    { price: "0.0413", size: "6,300", total: "260.19" },
  ],
  asks: [
    { price: "0.0421", size: "900", total: "37.89" },
    { price: "0.0422", size: "2,800", total: "118.16" },
    { price: "0.0423", size: "4,100", total: "173.43" },
    { price: "0.0424", size: "3,600", total: "152.64" },
    { price: "0.0425", size: "7,200", total: "306.00" },
    { price: "0.0426", size: "5,400", total: "230.04" },
    { price: "0.0427", size: "9,100", total: "388.57" },
  ],
};

export const verifyFeed = [
  { ts: "16:42:18.214", asset: "GPT4-CMP", step: "DIRECT_KEY_TEST", hash: "0x9af2…41bc", result: "PASS", latency: "184ms", method: "DIRECT_KEY_TEST" },
  { ts: "16:42:17.882", asset: "H100-PRV", step: "PROXY_HEARTBEAT", hash: "0x44d1…7e2a", result: "PASS", latency: "92ms", method: "PROXY_HEARTBEAT" },
  { ts: "16:42:17.401", asset: "CLAUDE-API", step: "QUOTA-CHK", hash: "0x10cd…ff09", result: "PASS", latency: "61ms", method: "DIRECT_KEY_TEST" },
  { ts: "16:42:16.998", asset: "LLAMA70-W", step: "ROTATION_VALIDATION", hash: "0x88ee…2204", result: "PASS", latency: "44ms", method: "ROTATION_VALIDATION" },
  { ts: "16:42:16.512", asset: "EMBED-V3", step: "TEE-ATTEST", hash: "0x52a0…b791", result: "PASS", latency: "118ms", method: "DIRECT_KEY_TEST" },
  { ts: "16:42:15.879", asset: "AST-014", step: "ZK-PROOF", hash: "0xc711…0042", result: "FAIL", latency: "204ms", method: "DIRECT_KEY_TEST" },
  { ts: "16:42:15.402", asset: "A100-SPOT", step: "PROXY_HEARTBEAT", hash: "0xbb31…aa18", result: "PASS", latency: "77ms", method: "PROXY_HEARTBEAT" },
  { ts: "16:42:14.998", asset: "MISTRAL-L", step: "SIGNATURE", hash: "0x4e9f…1c08", result: "PASS", latency: "53ms", method: "ROTATION_VALIDATION" },
];

export const orders: EnhancedOrder[] = [
  {
    id: "ORD-78214", side: "BUY", asset: "GPT4-CMP", qty: "2,400", price: "0.0420", value: "100.80",
    escrow: "FUNDED", status: "VERIFYING", counterparty: "0x8a…fe12",
    transactionType: "P2P_PURCHASE", accessMethod: "KEY_ROTATION_REQUIRED",
    buyerDeposit: "151.20", sellerDeposit: "151.20", rotationRequired: true,
  },
  {
    id: "ORD-78201", side: "BUY", asset: "H100-PRV", qty: "12", price: "3.8700", value: "46.44",
    escrow: "FUNDED", status: "DELIVERING", counterparty: "TOKENTA PLATFORM",
    transactionType: "TOKENTA_DIRECT_PURCHASE", accessMethod: "PROXY_GATEWAY",
    platformGuaranteed: true, buyerDeposit: "23.22",
  },
  {
    id: "ORD-78188", side: "SELL", asset: "CLAUDE-API", qty: "500", price: "0.0185", value: "9.25",
    escrow: "RELEASED", status: "SETTLED", counterparty: "0xc1…7a3b",
    transactionType: "P2P_SALE", accessMethod: "DIRECT_KEY" as const,
  },
  {
    id: "ORD-78174", side: "BUY", asset: "LLAMA70-W", qty: "4", price: "1.2400", value: "4.96",
    escrow: "FUNDED", status: "DISPUTED", counterparty: "0xee…ab44",
    transactionType: "P2P_PURCHASE", accessMethod: "KEY_ROTATION_REQUIRED", rotationRequired: true,
  },
  {
    id: "ORD-78160", side: "SELL", asset: "EMBED-V3", qty: "8,000", price: "0.0007", value: "5.60",
    escrow: "RELEASED", status: "SETTLED", counterparty: "TOKENTA PLATFORM",
    transactionType: "TOKENTA_BUYBACK_SALE", accessMethod: "DIRECT_KEY", sellerDeposit: "11.20",
  },
  {
    id: "ORD-78142", side: "BUY", asset: "A100-SPOT", qty: "40", price: "2.1400", value: "85.60",
    escrow: "PENDING", status: "MATCHING", counterparty: "—",
    transactionType: "P2P_PURCHASE", accessMethod: "DIRECT_KEY",
  },
];

export const reputationEvents = [
  { ts: "16:38", actor: "NEXUS-LABS", event: "DELIVERY-ON-TIME", delta: "+0.12", score: "98.41" },
  { ts: "16:31", actor: "CORE-WEAVE", event: "UPTIME-SLA-MET", delta: "+0.08", score: "97.92" },
  { ts: "16:22", actor: "STABILITY", event: "VERIFY-PASS-STREAK-100", delta: "+0.40", score: "94.18" },
  { ts: "16:14", actor: "AST-014-SLR", event: "VERIFY-FAIL", delta: "-1.20", score: "71.04" },
  { ts: "16:02", actor: "ANTHROPIC-R", event: "DISPUTE-RESOLVED-FAVOR", delta: "+0.25", score: "99.12" },
  { ts: "15:48", actor: "LAMBDA-LBS", event: "PARTIAL-DELIVERY", delta: "-0.35", score: "92.67" },
];

export const priceSeries = [
  0.0411, 0.0413, 0.0412, 0.0415, 0.0418, 0.0416, 0.0419, 0.0421, 0.0420, 0.0418,
  0.0417, 0.0419, 0.0422, 0.0424, 0.0423, 0.0421, 0.0420, 0.0418, 0.0419, 0.0420,
  0.0422, 0.0425, 0.0427, 0.0425, 0.0423, 0.0421, 0.0420, 0.0422, 0.0424, 0.0420,
];

export const chatMessages = [
  { ts: "16:40:12", from: "SYSTEM", body: "Order ORD-78214 escrow funded · 100.80 USDC locked" },
  { ts: "16:40:20", from: "SYSTEM", body: "This order requires key rotation. Seller must complete within 24 hours." },
  { ts: "16:40:48", from: "0x8a…fe12", body: "Acknowledged. Initiating delivery pipeline." },
  { ts: "16:41:02", from: "SYSTEM", body: "Seller submitted new key at 11:00 AM · verification in progress" },
  { ts: "16:41:18", from: "SYSTEM", body: "Verify step 1/3 PASS · attestation 0x9af2…41bc" },
  { ts: "16:41:44", from: "YOU", body: "Confirmed on-chain. Awaiting quota allocation." },
  { ts: "16:42:18", from: "SYSTEM", body: "Verification passed - old key confirmed revoked" },
];

export const rotationGuide = {
  provider: "OpenAI",
  steps: [
    "Log in to platform.openai.com",
    'Navigate to API Keys section',
    'Click "Create New Secret Key"',
    "Copy key (shown only once)",
    "Paste into F2 Verification Panel",
    'Click "Submit & Revoke Old Key"',
    "Confirm old key deletion in provider dashboard",
  ],
};

export function filterListings(
  listings: EnhancedListing[],
  mode: TradingMode,
  filters: MarketFilters,
  sort: MarketSortKey,
  options?: { buySource?: BuyMarketSource; sellTab?: SellMarketTab },
): EnhancedListing[] {
  let out = [...listings];

  if (mode === "BUY") {
    out = out.filter((l) => l.listingSource !== "PLATFORM_BUYBACK_OFFER");
    const src = options?.buySource ?? "ALL";
    if (src === "USER_MARKETPLACE") out = out.filter((l) => l.listingSource === "P2P");
    if (src === "TOKENTA_DIRECT") out = out.filter((l) => l.listingSource === "PLATFORM_INVENTORY");
  } else if (mode === "SELL") {
    if (options?.sellTab === "TOKENTA_BUYBACK") return [];
    out = out.filter((l) => l.listingSource === "P2P");
  }

  if (filters.p2pOnly) out = out.filter((l) => l.listingSource === "P2P");
  if (filters.platformInventoryOnly) out = out.filter((l) => l.listingSource === "PLATFORM_INVENTORY");
  if (filters.platformBuybackOnly) out = out.filter((l) => l.listingSource === "PLATFORM_BUYBACK_OFFER");
  if (filters.directKeyOnly) out = out.filter((l) => l.accessMethod === "DIRECT_KEY");
  if (filters.verifiedTosOnly) out = out.filter((l) => l.complianceFlag === "VERIFIED_TOS");
  if (filters.aggregatedOnly) out = out.filter((l) => l.isAggregated);

  const priceNum = (p: string) => parseFloat(p);
  out.sort((a, b) => {
    switch (sort) {
      case "PRICE_ASC":
        return priceNum(a.price) - priceNum(b.price);
      case "PRICE_DESC":
        return priceNum(b.price) - priceNum(a.price);
      case "TRUST":
        return (b.trustTone === "high" ? 1 : 0) - (a.trustTone === "high" ? 1 : 0);
      case "VERIFY_FRESH":
        return a.verificationTimestamp.localeCompare(b.verificationTimestamp);
      case "INVENTORY_SIZE":
        return parseFloat(b.supply.replace(/,/g, "")) - parseFloat(a.supply.replace(/,/g, ""));
      case "ACCESS_METHOD":
        return a.accessMethod.localeCompare(b.accessMethod);
      default:
        return 0;
    }
  });
  return out;
}

export function formatTransactionType(t: EnhancedOrder["transactionType"]): string {
  const map: Record<EnhancedOrder["transactionType"], string> = {
    P2P_PURCHASE: "P2P Purchase",
    P2P_SALE: "P2P Sale",
    TOKENTA_DIRECT_PURCHASE: "Tokenta Direct",
    TOKENTA_BUYBACK_SALE: "Tokenta Buyback",
  };
  return map[t];
}
