/** Platform buyback program terms — served via API, not mock user data. */
export interface BuybackOfferRecord {
  id: string;
  provider: string;
  product: string;
  minQty: string;
  buybackPrice: string;
  marketDiscount: string;
  bondPct: string;
}

export const BUYBACK_OFFERS: BuybackOfferRecord[] = [
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
