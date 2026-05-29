import type {
  EnhancedListing,
  EnhancedOrder,
  MarketFilters,
  MarketSortKey,
  BuyMarketSource,
  SellMarketTab,
  TradingMode,
} from "./trading-types";

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
