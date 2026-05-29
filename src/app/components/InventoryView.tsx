import { useEffect, useState } from "react";
import { fetchMarketListings, fetchTerminalOrders } from "../api/verification";
import type { TerminalOrderRow } from "../api/verification";
import { useAuth } from "../auth/AuthContext";

function Panel({
  title,
  code,
  children,
  className = "",
}: {
  title: string;
  code?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-white/15 bg-black flex flex-col min-h-0 ${className}`}>
      <header className="flex items-center justify-between border-b border-white/15 px-3 py-1.5">
        <div className="flex items-center gap-2 uppercase tracking-[0.18em] text-white/70 text-[11px]">
          {code && <span className="text-white/30">{code}</span>}
          <span>{title}</span>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </section>
  );
}

type InventoryRow = {
  keyId: string;
  provider: string;
  originalQty: string;
  remaining: string;
  purchaseDate: string;
  costBasis: string;
  status: string;
};

function ordersToInventoryRows(orders: TerminalOrderRow[]): InventoryRow[] {
  const byListing = new Map<string, InventoryRow>();
  for (const o of orders) {
    const id = o.listingId;
    const existing = byListing.get(id);
    if (existing) {
      existing.remaining = String(Number(existing.remaining) + o.quantity);
      if (o.status === "SETTLED") existing.status = "PARTIAL_SOLD";
      else if (o.status === "ESCROW_FUNDED") existing.status = "IN_ESCROW";
    } else {
      byListing.set(id, {
        keyId: `LST-${id.slice(-8).toUpperCase()}`,
        provider: "API",
        originalQty: String(o.quantity),
        remaining: String(o.quantity),
        purchaseDate: o.createdAt?.slice(0, 10) ?? "—",
        costBasis: o.amountUsdc,
        status:
          o.status === "SETTLED"
            ? "SETTLED"
            : o.status === "ESCROW_FUNDED"
              ? "IN_ESCROW"
              : "LISTED",
      });
    }
  }
  return [...byListing.values()];
}

export function InventoryView({
  walletAddress,
  onCreateListing,
}: {
  walletAddress: string | null;
  onCreateListing?: () => void;
}) {
  const { requireAuth } = useAuth();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setRows([]);
      setLive(false);
      return;
    }
    const load = async () => {
      const [sellerOrders, listings] = await Promise.all([
        fetchTerminalOrders({ wallet: walletAddress, role: "seller" }),
        fetchMarketListings(),
      ]);
      const fromOrders = ordersToInventoryRows(sellerOrders);
      if (fromOrders.length) {
        setRows(fromOrders);
        setLive(true);
        return;
      }
      const fromMarket: InventoryRow[] = listings.slice(0, 12).map((l) => ({
        keyId: `LST-${l.listingId.slice(-8).toUpperCase()}`,
        provider: l.providerKind.toUpperCase(),
        originalQty: l.quotaToSell.toLocaleString(),
        remaining: l.quotaToSell.toLocaleString(),
        purchaseDate: l.updatedAt.slice(0, 10),
        costBasis: `${l.askPriceUsdc} USDC/M`,
        status: l.verificationState === "LIVE" ? "LIVE" : "VERIFYING",
      }));
      setRows(fromMarket);
      setLive(fromMarket.length > 0);
    };
    void load();
  }, [walletAddress]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/15 px-4 py-2 text-[11px] text-white/50">
        F8 Inventory Control — seller listings and open orders from Terminal API.
        {live ? " · LIVE" : walletAddress ? " · EMPTY" : " · CONNECT WALLET"}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-12">
        <div className="col-span-8 border-r border-white/15">
          <Panel title="Virtual Inventory Ledger" code="F8.1">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 border-b border-white/15 bg-black text-white/40">
                <tr className="tracking-[0.12em]">
                  {["KEY ID", "PROVIDER", "ORIG QTY", "REMAINING", "LISTED", "ASK", "STATUS", "ACTIONS"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => (
                  <tr key={k.keyId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-2 py-2 tracking-[0.1em]">{k.keyId}</td>
                    <td className="px-2 py-2">{k.provider}</td>
                    <td className="px-2 py-2 tabular-nums">{k.originalQty}</td>
                    <td className="px-2 py-2 tabular-nums">{k.remaining}</td>
                    <td className="px-2 py-2 tabular-nums text-white/60">{k.purchaseDate}</td>
                    <td className="px-2 py-2 tabular-nums">{k.costBasis}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`border px-1 text-[9px] tracking-[0.14em] ${
                          k.status === "RETIRED" ? "border-white/20 text-white/40" : "border-white/40"
                        }`}
                      >
                        {k.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireAuth("Managing inventory")) return;
                          onCreateListing?.();
                        }}
                        className="border border-white/30 px-1.5 py-0.5 text-[8px] tracking-[0.12em] hover:bg-white hover:text-black"
                      >
                        RELIST
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-white/40">
                      No seller inventory. List an API to populate this ledger.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>
        </div>
        <div className="col-span-4 flex flex-col">
          <Panel title="Actions" code="F8.2" className="flex-1">
            <div className="p-3 space-y-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  if (!requireAuth("Creating a listing")) return;
                  onCreateListing?.();
                }}
                className="w-full border border-white bg-white py-2 tracking-[0.2em] text-black hover:bg-white/90"
              >
                LIST NEW API KEY
              </button>
              <p className="text-[10px] text-white/40 leading-relaxed">
                Rows reflect your seller orders and live market listings after verification.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
