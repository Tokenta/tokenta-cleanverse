import type { LucideIcon } from "lucide-react";
import { Award, BarChart3, Boxes, MessagesSquare, Receipt, ShieldCheck } from "lucide-react";
import type { TradingMode } from "./trading-types";

export type NavKey = "MARKET" | "VERIFY" | "ESCROW" | "ORDERS" | "CHAT" | "REPUTATION" | "ANALYTICS";

export type NavItem = {
  key: NavKey;
  code: string;
  icon: LucideIcon;
  label: Record<TradingMode, string>;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "MARKET", code: "F1", icon: Boxes, label: { BUY: "Market", SELL: "Market" } },
  { key: "VERIFY", code: "F2", icon: ShieldCheck, label: { BUY: "Verification", SELL: "Verification" } },
  { key: "ESCROW", code: "F3", icon: Receipt, label: { BUY: "Escrow", SELL: "Escrow" } },
  { key: "ORDERS", code: "F4", icon: Receipt, label: { BUY: "Orders", SELL: "Orders" } },
  { key: "CHAT", code: "F5", icon: MessagesSquare, label: { BUY: "Order Room", SELL: "Order Room" } },
  { key: "REPUTATION", code: "F6", icon: Award, label: { BUY: "Reputation", SELL: "Reputation" } },
  { key: "ANALYTICS", code: "F7", icon: BarChart3, label: { BUY: "Analytics", SELL: "Analytics" } },
];
