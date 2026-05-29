export const TOUR_STORAGE_KEY = "tokenta-terminal-tour-v1";

export type TourNavKey =
  | "MARKET"
  | "VERIFY"
  | "ESCROW"
  | "ORDERS"
  | "CHAT"
  | "REPUTATION"
  | "ANALYTICS";

export type TourPlacement = "bottom" | "top" | "left" | "right" | "center";

export type TourStep = {
  id: string;
  code: string;
  title: string;
  body: string;
  target?: string;
  nav?: TourNavKey;
  placement?: TourPlacement;
  kind?: "spotlight" | "center" | "congrats";
};

/** Seller Journey — step-by-step guide for listing and selling an API. */
export const SELL_TOUR_STEPS: TourStep[] = [
  {
    id: "sell-welcome",
    code: "S0",
    kind: "center",
    title: "Seller Journey — 4 Steps to Your First Sale",
    body: "This tour walks you through listing your API, running verification, confirming publication, and receiving payment via Tokenta escrow. Switch to SELL mode before you begin.",
    placement: "center",
  },
  {
    id: "sell-market-overview",
    code: "S1",
    target: "main-workspace",
    nav: "MARKET",
    title: "Step 1 — Market Overview",
    body: "Browse live listings to understand current pricing, capacity bands, and reputation scores. Your listing will appear here once published. Buyers see provider, quota, price, and capability score.",
    placement: "left",
  },
  {
    id: "sell-list-api",
    code: "S2",
    target: "side-nav",
    nav: "MARKET",
    title: "Step 2 — List Your API",
    body: "Click + LIST API FOR SALE in the sidebar. Enter your API key, quota to sell, and ask price. The platform runs a controlled verification sample (~25–75 tokens) to confirm the key is live.",
    placement: "right",
  },
  {
    id: "sell-verify-pipeline",
    code: "S3",
    kind: "center",
    title: "Verification Pipeline",
    body: "The pipeline runs 5 stages: Connectivity (L1) → Quota Estimation (L2) → Rate Limit (L3) → Risk Analysis → Finalize. Outcome is PASS, FAIL, REVIEW, or DEGRADED. Only PASS listings can be published.",
    placement: "center",
  },
  {
    id: "sell-confirm-publish",
    code: "S4",
    target: "main-workspace",
    nav: "VERIFY",
    title: "Step 3 — Confirm & Publish",
    body: "After PASS, the Verification Progress popup shows a listing preview with estimated revenue. Click CONFIRM & PUBLISH TO MARKETPLACE to make your API visible to buyers. Your listing status changes from PENDING PUBLISH to LIVE.",
    placement: "left",
  },
  {
    id: "sell-my-listings",
    code: "S5",
    target: "main-workspace",
    nav: "VERIFY",
    title: "My Listings Panel",
    body: "The My Listings panel (bottom of the Verify view) shows all your listings: VERIFYING, PENDING PUBLISH, LIVE, FAILED. PENDING PUBLISH listings have a CONFIRM & PUBLISH button. LIVE listings are visible to buyers.",
    placement: "left",
  },
  {
    id: "sell-escrow",
    code: "S6",
    target: "main-workspace",
    nav: "ESCROW",
    title: "Step 4 — Escrow as Seller",
    body: "When a buyer purchases your listing, Tokenta holds their payment in escrow. You receive funds only after the buyer confirms the API is working (Step 3 of their journey). No upfront deposit required from you.",
    placement: "left",
  },
  {
    id: "sell-orders",
    code: "S7",
    target: "main-workspace",
    nav: "ORDERS",
    title: "Your Sales",
    body: "Track all completed and pending sales here. Each order shows amount, escrow status, buyer wallet, and verification proof. Once escrow is released, income appears in your wallet.",
    placement: "left",
  },
  {
    id: "sell-congrats",
    code: "S8",
    kind: "congrats",
    title: "Ready to Sell",
    body: "Click + LIST API FOR SALE in the sidebar to get started.",
    placement: "center",
  },
];

/** Buyer Journey — step-by-step guide for browsing, purchasing, and confirming API access. */
export const BUY_TOUR_STEPS: TourStep[] = [
  {
    id: "buy-welcome",
    code: "B0",
    kind: "center",
    title: "Buyer Journey — 4 Steps to Purchase",
    body: "This tour walks you through browsing verified listings, purchasing via escrow, testing the API, and releasing payment to the seller. Switch to BUY mode before you begin.",
    placement: "center",
  },
  {
    id: "buy-browse",
    code: "B1",
    target: "main-workspace",
    nav: "MARKET",
    title: "Step 1 — Browse Verified Listings",
    body: "Every listing on Tokenta has passed L1 + L2 verification with an on-chain proof hash. Filter by provider, price, and capacity band. Check the capability score and reputation before selecting.",
    placement: "left",
  },
  {
    id: "buy-verified-only",
    code: "B2",
    kind: "center",
    title: "Verified APIs Only",
    body: "Tokenta never shows unverified listings. Each listing displays: provider, quota, ask price per token, capability score, capacity band, and the verification proof hash. The raw API key is hidden until purchase.",
    placement: "center",
  },
  {
    id: "buy-purchase",
    code: "B3",
    target: "main-workspace",
    nav: "MARKET",
    title: "Step 2 — Select & Purchase",
    body: "Click on a listing to see full details, then click BUY VERIFIED API · LOCK ESCROW. Choose full buyout or partial quota. Your payment is locked by Tokenta — the seller cannot access it yet.",
    placement: "left",
  },
  {
    id: "buy-lock-escrow",
    code: "B4",
    target: "main-workspace",
    nav: "ESCROW",
    title: "Step 3 — Lock Payment in Escrow",
    body: "Click STEP 1 · LOCK PAYMENT IN ESCROW to fund the order. Your USDC is held by Tokenta smart contract, not the seller. The API credentials are then provisioned to your order.",
    placement: "left",
  },
  {
    id: "buy-confirm-receipt",
    code: "B5",
    target: "main-workspace",
    nav: "ESCROW",
    title: "Step 4 — Confirm Receipt",
    body: "Test the API key. If it works as expected, click STEP 3 · CONFIRM RECEIPT · RELEASE PAYMENT. This signals Tokenta to release escrow to the seller. If there is a problem, contact the seller via Order Room before confirming.",
    placement: "left",
  },
  {
    id: "buy-orders",
    code: "B6",
    target: "main-workspace",
    nav: "ORDERS",
    title: "Track Your Purchases",
    body: "All orders appear here with status, proof hashes, amount, and seller wallet. Open an order for the full timeline, delivered key reference, and dispute window dates.",
    placement: "left",
  },
  {
    id: "buy-congrats",
    code: "B7",
    kind: "congrats",
    title: "Ready to Buy",
    body: "Browse verified listings now. Switch to BUY mode and open the Market.",
    placement: "center",
  },
];

/** Single-workspace spotlight tours for each F-key nav section. */
export const SECTION_TOURS: Record<TourNavKey, TourStep[]> = {
  MARKET: [
    {
      id: "section-market",
      code: "F1",
      target: "main-workspace",
      nav: "MARKET",
      title: "F1 · Market",
      body: "BUY mode: browse and filter ALL verified listings, user marketplace, or Tokenta Direct. SELL mode: list on the marketplace or sell to Tokenta buyback. Listings show provider, quota, price, capability score, and proof hash.",
      placement: "left",
    },
    { id: "section-market-end", code: "F1", kind: "congrats", title: "Market Tour Complete", body: "", placement: "center" },
  ],
  VERIFY: [
    {
      id: "section-verify",
      code: "F2",
      target: "main-workspace",
      nav: "VERIFY",
      title: "F2 · Verification Pipeline",
      body: "Watch the L1 + L2 + L3 verification pipeline run in real time. SELL mode: list an API and track its PASS/FAIL/REVIEW outcome. BUY mode: re-verify a purchased API. My Listings (SELL) shows all your listing statuses.",
      placement: "left",
    },
    { id: "section-verify-end", code: "F2", kind: "congrats", title: "Verify Tour Complete", body: "", placement: "center" },
  ],
  ESCROW: [
    {
      id: "section-escrow",
      code: "F3",
      target: "main-workspace",
      nav: "ESCROW",
      title: "F3 · Escrow",
      body: "P2P escrow flow: 1. Buyer locks payment → 2. API access provisioned → 3. Buyer confirms working → 4. Funds released to seller. The 4-step progress indicator shows the current state. Action buttons pulse when your input is needed.",
      placement: "left",
    },
    { id: "section-escrow-end", code: "F3", kind: "congrats", title: "Escrow Tour Complete", body: "", placement: "center" },
  ],
  ORDERS: [
    {
      id: "section-orders",
      code: "F4",
      target: "main-workspace",
      nav: "ORDERS",
      title: "F4 · Orders",
      body: "Unified purchase/sales history. Filter P2P vs Tokenta Direct. Open any order for timeline, verification proof, delivered keys, and refund dates.",
      placement: "left",
    },
    { id: "section-orders-end", code: "F4", kind: "congrats", title: "Orders Tour Complete", body: "", placement: "center" },
  ],
  CHAT: [
    {
      id: "section-chat",
      code: "F5",
      target: "main-workspace",
      nav: "CHAT",
      title: "F5 · Order Room",
      body: "Encrypted per-order chat for P2P trades. Discuss key issues, request rotation templates, or escalate a dispute. Tokenta Direct and buyback flows are automated and do not require this room.",
      placement: "left",
    },
    { id: "section-chat-end", code: "F5", kind: "congrats", title: "Order Room Tour Complete", body: "", placement: "center" },
  ],
  REPUTATION: [
    {
      id: "section-reputation",
      code: "F6",
      target: "main-workspace",
      nav: "REPUTATION",
      title: "F6 · Reputation",
      body: "BUY: look up seller trust scores before purchasing. SELL: view your own seller score — delivery rate, dispute ratio, key rotation history, and escrow on-time rate.",
      placement: "left",
    },
    { id: "section-reputation-end", code: "F6", kind: "congrats", title: "Reputation Tour Complete", body: "", placement: "center" },
  ],
  ANALYTICS: [
    {
      id: "section-analytics",
      code: "F7",
      target: "main-workspace",
      nav: "ANALYTICS",
      title: "F7 · Analytics",
      body: "Spend or revenue breakdown by asset type, counterparty heatmaps, verification SLA adherence, and top partners by volume, delivery rate, and reputation.",
      placement: "left",
    },
    { id: "section-analytics-end", code: "F7", kind: "congrats", title: "Analytics Tour Complete", body: "", placement: "center" },
  ],
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    code: "T0",
    kind: "center",
    title: "Welcome to Tokenta Terminal",
    body:
      "This is your operating system for verifiable AI commerce. This guided tour walks through every major workspace so you can discover, verify, escrow, and settle AI-native assets with confidence.",
    placement: "center",
  },
  {
    id: "topbar",
    code: "T1",
    target: "topbar",
    title: "Command Bar",
    body:
      "The top bar anchors your session: Tokenta identity, live chain telemetry (network, block, gas), reputation score from the Trust Layer API, wallet address, USDC balance, and a local terminal clock in your timezone.",
    placement: "bottom",
  },
  {
    id: "role-toggle",
    code: "T2",
    target: "role-toggle",
    title: "Buy / Sell Mode",
    body:
      "Toggle between BUY and SELL — the only two user-facing modes. BUY sources inventory from the user marketplace or Tokenta Direct; SELL lists P2P or sells to the Tokenta buyback program. Platform operations stay off this terminal.",
    placement: "bottom",
  },
  {
    id: "status-strip",
    code: "T3",
    target: "status-strip",
    title: "Live Network Pulse",
    body:
      "The status strip streams exchange-wide vitals: escrowed TVL, 24h volume, active assets, verify throughput, proof success rate, open orders, latency, and dispute ratio — all updating in real time.",
    placement: "bottom",
  },
  {
    id: "side-nav",
    code: "T4",
    target: "side-nav",
    title: "Workspace Navigator",
    body:
      "Seven function-key workspaces (F1–F7) organize the terminal. The sidebar shows your active mode, session wallet, chain, and latency. Select any module to load its dedicated surface in the main pane.",
    placement: "right",
  },
  {
    id: "market",
    code: "F1",
    target: "main-workspace",
    nav: "MARKET",
    title: "Market · Dual-Track Exchange",
    body:
      "In BUY mode, filter ALL listings, user marketplace, or Tokenta Direct. In SELL mode, list on the marketplace or sell to Tokenta buyback. Tokenta appears as a counterparty — not a separate admin mode.",
    placement: "left",
  },
  {
    id: "verify",
    code: "F2",
    target: "main-workspace",
    nav: "VERIFY",
    title: "Verify Pipeline",
    body:
      "RUN VERIFICATION uses controlled real API sampling to estimate whether a key can likely support the listing capacity band — not an exact balance audit. Watch L1 liveness, optional micro-probes, proof hashes, and pipeline health before liquidity moves. Typical burn is disclosed up front; we never promise zero-cost checks.",
    placement: "left",
  },
  {
    id: "escrow",
    code: "F3",
    target: "main-workspace",
    nav: "ESCROW",
    title: "Escrow & Deposits",
    body:
      "Counterparty-aware escrow: P2P locks bilateral deposits; Tokenta Direct waives buyer deposit; buyback holds seller deposit for 30 days. Timelines, dispute windows, and deposit breakdowns live here.",
    placement: "left",
  },
  {
    id: "orders",
    code: "F4",
    target: "main-workspace",
    nav: "ORDERS",
    title: "Orders",
    body:
      "Unified purchase or sales history with P2P vs Tokenta filters. Open any order for timeline, verification proof, delivered keys, and refund dates.",
    placement: "left",
  },
  {
    id: "chat",
    code: "F5",
    target: "main-workspace",
    nav: "CHAT",
    title: "Order Room (P2P)",
    body:
      "Encrypted per-order chat for P2P trades only — Tokenta Direct and buyback flows are automated. Key rotation templates and structured status updates post here.",
    placement: "left",
  },
  {
    id: "reputation",
    code: "F6",
    target: "main-workspace",
    nav: "REPUTATION",
    title: "Reputation",
    body:
      "BUY mode: look up seller trust before purchase. SELL mode: view your seller score and improvement paths. Tokenta Direct inventory is platform-guaranteed.",
    placement: "left",
  },
  {
    id: "analytics",
    code: "F7",
    target: "main-workspace",
    nav: "ANALYTICS",
    title: "Analytics",
    body:
      "Analyze spend or revenue by asset type, counterparty heatmaps, verification SLA adherence, and top partners by volume, delivery rate, and reputation — institutional-grade visibility for operators.",
    placement: "left",
  },
  {
    id: "bottom-bar",
    code: "T5",
    target: "bottom-bar",
    title: "System Footer & Shortcuts",
    body:
      "The footer reports system health (RPC latency, websocket streams, queue depth) and maps keyboard shortcuts F1–F7 to workspaces. Use ⌘K for the command palette when it ships.",
    placement: "top",
  },
  {
    id: "congrats",
    code: "T6",
    kind: "congrats",
    title: "Tour Complete",
    body: "",
    placement: "center",
  },
];
