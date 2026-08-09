import type { EnhancedListing } from "../trading-types";
import type { MarketListingRow, TerminalOrderRow, VerifyFeedRow } from "./verification";

// --- Verified Evidence ---
export const DEMO_BUYER_WALLET = "0xb9f7551E19a1F8226ec38f15fB91cF4c68Bd6873"; // Subtier 60
export const DEMO_SELLER_WALLET = "0x85ed51dc9db2f98bca5aa913c9857a3bd017e6b0"; // Tokenta Pool
export const DEMO_INELIGIBLE_COUNTERPARTY = "0x1111111111111111111111111111111111111111"; // Subtier 9

export const DEMO_MARKET_LISTINGS: MarketListingRow[] = [
  {
    listingId: "cleanverse-verified-asset-001",
    sellerWallet: DEMO_SELLER_WALLET,
    providerKind: "openai",
    quotaToSell: 5000000,
    quotaUnit: "tokens",
    askPriceUsdc: 25.0,
    verificationState: "LIVE",
    listingStatus: "LIVE",
    proofHash: "cvi-proof-000001",
    capabilityScore: 0.99,
    updatedAt: new Date().toISOString(),
  },
];

export const DEMO_ORDERS: TerminalOrderRow[] = [
  {
    orderId: "ord-demo-auth",
    listingId: "cleanverse-verified-asset-001",
    buyerWallet: DEMO_BUYER_WALLET,
    sellerWallet: DEMO_SELLER_WALLET,
    providerKind: "openai",
    quotaAllocated: 1000000,
    purchaseAmountUsdc: 5.0,
    status: "SETTLED",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    escrowStatus: "SETTLED",
    // In demo mode we intercept the ComplianceShield data at the OrderDetail component 
    // or by feeding a specific payload if the terminal fetches compliance data separately.
    // The instructions say: "ComplianceShield integrated into actual workflow" 
    // "show real CVA transaction evidence"
  },
  {
    orderId: "ord-demo-denied",
    listingId: "cleanverse-verified-asset-001",
    buyerWallet: DEMO_INELIGIBLE_COUNTERPARTY,
    sellerWallet: DEMO_SELLER_WALLET,
    providerKind: "openai",
    quotaAllocated: 500000,
    purchaseAmountUsdc: 2.5,
    status: "CANCELLED", // or whatever state fits BLOCKED
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    escrowStatus: "BLOCKED",
  }
];

export const DEMO_ESCROWS: Record<string, any> = {
  "ord-demo-auth": {
    status: "SETTLED",
    amountUsdc: 5.0,
    fundTxHash: "0xc633aa34ee5ab19c77b7de07ce8712e46f0dfba8b67d2c025a521d96f8eb39ca", // The required transaction evidence
    releaseTxHash: "0xc633aa34ee5ab19c77b7de07ce8712e46f0dfba8b67d2c025a521d96f8eb39ca", 
    escrowWallet: "0x2ecd60dc0fe611c60bd241f46943b2813abb243f", // Tokenta CVA
    mode: "CVA",
  },
  "ord-demo-denied": {
    status: "BLOCKED",
    amountUsdc: 2.5,
    fundTxHash: null,
    releaseTxHash: null,
    escrowWallet: "0x2ecd60dc0fe611c60bd241f46943b2813abb243f",
    mode: "CVA",
  }
};

export const DEMO_COMPLIANCE_CHECKS: Record<string, any> = {
  "ord-demo-auth": {
    assetStatus: "VERIFIED",
    buyerIdentityStatus: "VERIFIED",
    sellerIdentityStatus: "VERIFIED",
    policyDecision: "PASS",
    overallDecision: "APPROVED",
    reasonCodes: [],
  },
  "ord-demo-denied": {
    assetStatus: "VERIFIED",
    buyerIdentityStatus: "DENIED",
    sellerIdentityStatus: "VERIFIED",
    policyDecision: "DENIED",
    overallDecision: "DENIED",
    reasonCodes: [
      "buyer_subtier_insufficient",
      "rulev2_policy_failure"
    ],
  }
};
