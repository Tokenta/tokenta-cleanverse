import type { BuyMarketSource, SellMarketTab, TradingMode } from "./trading-types";

export const WALLET_SESSION_KEY = "tokenta-wallet-session";
export const PREFERRED_MODE_KEY = "tokenta-preferred-mode";
export const PREFERRED_ROLE_KEY = PREFERRED_MODE_KEY;
export const BUY_SOURCE_KEY = "tokenta-buy-market-source";
export const SELL_TAB_KEY = "tokenta-sell-market-tab";

/** @deprecated */
export const BUYER_SUB_MODE_KEY = BUY_SOURCE_KEY;
/** @deprecated */
export const SELLER_SUB_MODE_KEY = SELL_TAB_KEY;

export type Role = TradingMode;

function migrateMode(saved: string | null): TradingMode {
  if (saved === "BUY" || saved === "SELL") return saved;
  if (saved === "BUYER") return "BUY";
  if (saved === "SELLER" || saved === "PLATFORM") return "SELL";
  return "BUY";
}

export function getInitialTradingMode(): TradingMode {
  if (typeof window === "undefined") return "BUY";
  if (!localStorage.getItem(WALLET_SESSION_KEY)) {
    localStorage.setItem(WALLET_SESSION_KEY, String(Date.now()));
    return "BUY";
  }
  return migrateMode(localStorage.getItem(PREFERRED_MODE_KEY));
}

export const getInitialRole = getInitialTradingMode;

export function persistTradingMode(mode: TradingMode) {
  localStorage.setItem(PREFERRED_MODE_KEY, mode);
}

export const persistRole = persistTradingMode;

export function getBuyMarketSource(): BuyMarketSource {
  if (typeof window === "undefined") return "ALL";
  const v = localStorage.getItem(BUY_SOURCE_KEY);
  if (v === "USER_MARKETPLACE" || v === "TOKENTA_DIRECT" || v === "ALL") return v;
  const legacy = localStorage.getItem("tokenta-buyer-sub-mode");
  if (legacy === "PLATFORM_DIRECT") return "TOKENTA_DIRECT";
  if (legacy === "P2P_MARKET") return "USER_MARKETPLACE";
  return "ALL";
}

export function persistBuyMarketSource(source: BuyMarketSource) {
  localStorage.setItem(BUY_SOURCE_KEY, source);
}

export function getSellMarketTab(): SellMarketTab {
  if (typeof window === "undefined") return "P2P_LISTING";
  const v = localStorage.getItem(SELL_TAB_KEY);
  if (v === "TOKENTA_BUYBACK" || v === "P2P_LISTING") return v;
  const legacy = localStorage.getItem("tokenta-seller-sub-mode");
  return legacy === "SELL_TO_PLATFORM" ? "TOKENTA_BUYBACK" : "P2P_LISTING";
}

export function persistSellMarketTab(tab: SellMarketTab) {
  localStorage.setItem(SELL_TAB_KEY, tab);
}

export function markWalletSessionFromPrivy(walletAddress: string) {
  if (!localStorage.getItem(WALLET_SESSION_KEY)) {
    localStorage.setItem(WALLET_SESSION_KEY, String(Date.now()));
  }
  localStorage.setItem("tokenta-wallet-address", walletAddress);
}
