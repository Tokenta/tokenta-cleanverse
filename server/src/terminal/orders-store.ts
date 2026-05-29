/** In-memory orders for POST /terminal/orders/purchase (BY.1). */

export interface TerminalOrderRecord {
  orderId: string;
  listingId: string;
  sellerWallet: string | null;
  buyerWallet: string | null;
  mode: "BUYOUT" | "PARTIAL";
  quantity: number;
  amountUsdc: string;
  status: "PENDING_ESCROW" | "ESCROW_FUNDED" | "SETTLED";
  createdAt: string;
}

const orders = new Map<string, TerminalOrderRecord>();

export function createTerminalOrder(input: {
  listingId: string;
  sellerWallet: string | null;
  buyerWallet: string | null;
  mode: "BUYOUT" | "PARTIAL";
  quantity: number;
  amountUsdc: string;
}): TerminalOrderRecord {
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: TerminalOrderRecord = {
    orderId,
    listingId: input.listingId,
    sellerWallet: input.sellerWallet,
    buyerWallet: input.buyerWallet,
    mode: input.mode,
    quantity: input.quantity,
    amountUsdc: input.amountUsdc,
    status: "PENDING_ESCROW",
    createdAt: new Date().toISOString(),
  };
  orders.set(orderId, record);
  return record;
}

export function getTerminalOrder(orderId: string): TerminalOrderRecord | undefined {
  return orders.get(orderId);
}

export function updateTerminalOrderStatus(
  orderId: string,
  status: TerminalOrderRecord["status"],
): TerminalOrderRecord | undefined {
  const existing = orders.get(orderId);
  if (!existing) return undefined;
  existing.status = status;
  return existing;
}

export function listTerminalOrders(
  limit = 100,
  filter?: { wallet?: string; role?: "buyer" | "seller" | "all" },
): TerminalOrderRecord[] {
  let rows = [...orders.values()];
  const wallet = filter?.wallet?.toLowerCase();
  const role = filter?.role ?? "all";
  if (wallet) {
    rows = rows.filter((o) => {
      if (role === "buyer") return o.buyerWallet?.toLowerCase() === wallet;
      if (role === "seller") return o.sellerWallet?.toLowerCase() === wallet;
      return (
        o.buyerWallet?.toLowerCase() === wallet || o.sellerWallet?.toLowerCase() === wallet
      );
    });
  }
  return rows
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(limit, 500)));
}

export function resetTerminalOrdersForTest(): void {
  orders.clear();
}
