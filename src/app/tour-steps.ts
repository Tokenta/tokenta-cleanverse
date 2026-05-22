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
