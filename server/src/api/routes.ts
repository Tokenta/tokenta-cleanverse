/**
 * Tokenta Terminal — REST API surface (planned).
 * Implement with Express/Fastify/Hono in a follow-up; database layer is Prisma + PostgreSQL.
 *
 * Auth: wallet signature (SIWE) on protected routes; `X-Wallet-Address` + JWT after verify.
 */

export const API_VERSION = "v1";
export const API_BASE = `/api/${API_VERSION}`;

/** @see server/prisma/schema.prisma for entity definitions */
export const API_ROUTES = {
  // --- Session & identity ---
  /** POST — connect wallet, create wallet row, return session + preferred_role */
  walletConnect: `${API_BASE}/wallets/connect`,
  /** GET — current wallet profile, balances, preferences */
  walletMe: `${API_BASE}/wallets/me`,
  /** PATCH — preferred_role (BUYER | SELLER), tour_completed */
  walletPreferences: `${API_BASE}/wallets/me/preferences`,

  // --- F1 Market ---
  /** GET — list LIVE assets (filters: type, provider, verified) */
  marketAssets: `${API_BASE}/market/assets`,
  /** GET — single asset by ticker or public_id */
  marketAsset: `${API_BASE}/market/assets/:assetId`,
  /** GET — order book levels for asset */
  marketOrderBook: `${API_BASE}/market/assets/:assetId/order-book`,
  /** GET — price ticks for chart */
  marketPriceHistory: `${API_BASE}/market/assets/:assetId/price-history`,

  // --- Seller: List API (SL.1) ---
  /** POST — create listing + store credential ref + start verification job */
  listingsCreate: `${API_BASE}/listings`,
  /** GET — seller's listings */
  listingsMine: `${API_BASE}/listings/mine`,
  /** GET — listing + job status */
  listingById: `${API_BASE}/listings/:listingId`,

  // --- F2 Verify Pipeline ---
  /** GET — paginated global verification feed (WebSocket: /ws/verify-feed) */
  verifyFeed: `${API_BASE}/verify/feed`,
  /** GET — verification job for listing */
  verifyJob: `${API_BASE}/verify/jobs/:jobId`,

  // --- F3 Trade Desk ---
  /** GET — orders for wallet (role=buyer|seller|all) */
  orders: `${API_BASE}/orders`,
  /** GET — order detail + lifecycle + escrow timeline */
  orderById: `${API_BASE}/orders/:orderId`,
  /** POST — buyer places order (buy modal); locks escrow */
  ordersCreate: `${API_BASE}/orders`,
  /** POST — fund escrow on-chain callback */
  ordersFundEscrow: `${API_BASE}/orders/:orderId/escrow/fund`,
  /** POST — release escrow after delivery verify */
  ordersReleaseEscrow: `${API_BASE}/orders/:orderId/escrow/release`,
  /** POST — open dispute */
  ordersDispute: `${API_BASE}/orders/:orderId/dispute`,

  // --- F4 Order Room ---
  /** GET — messages for order chat room */
  chatMessages: `${API_BASE}/orders/:orderId/chat/messages`,
  /** POST — send encrypted message (body → KMS, store ref) */
  chatSend: `${API_BASE}/orders/:orderId/chat/messages`,
  /** WebSocket — /ws/orders/:orderId/chat */

  // --- F5 Reputation ---
  /** GET — leaderboard / profiles */
  reputationProfiles: `${API_BASE}/reputation/profiles`,
  /** GET — append-only events for actor */
  reputationEvents: `${API_BASE}/reputation/profiles/:actorSlug/events`,

  // --- F6 Wallet ---
  /** GET — balance breakdown */
  walletBalance: `${API_BASE}/wallets/me/balance`,
  /** GET — ledger entries */
  walletLedger: `${API_BASE}/wallets/me/ledger`,
  /** POST — deposit / withdraw intents (chain tx orchestration) */
  walletTransfer: `${API_BASE}/wallets/me/transfers`,

  // --- F7 Analytics ---
  /** GET — platform metric snapshots */
  analyticsMetrics: `${API_BASE}/analytics/metrics`,
  /** GET — SLA policy + breaches for provider/asset */
  analyticsSla: `${API_BASE}/analytics/sla`,
} as const;

export type ApiRouteKey = keyof typeof API_ROUTES;
