import { ArrowUpRight, ShieldCheck } from "lucide-react";
import type { BuybackOffer, EnhancedListing, SellMarketTab } from "../trading-types";
import { BuybackOfferCard } from "./trading-ui";
import type { TerminalOrderRow } from "../api/verification";

export function SellMarketPanel({
  sellTab,
  onSellTabChange,
  onListApi,
  onSellToTokenta,
  myListings,
  buybackOffers,
  pendingBuybackOrders,
}: {
  sellTab: SellMarketTab;
  onSellTabChange: (tab: SellMarketTab) => void;
  onListApi: () => void;
  onSellToTokenta: (offerId?: string) => void;
  myListings: EnhancedListing[];
  buybackOffers: BuybackOffer[];
  pendingBuybackOrders: TerminalOrderRow[];
}) {
  const tabBtn = (tab: SellMarketTab, label: string) => (
    <button
      type="button"
      onClick={() => onSellTabChange(tab)}
      className={`flex-1 border px-3 py-2 text-[10px] tracking-[0.2em] transition-colors ${
        sellTab === tab ? "border-white bg-white !text-black" : "border-white/25 text-white/50 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b border-white/15">
        {tabBtn("P2P_LISTING", "LIST ON MARKETPLACE")}
        {tabBtn("TOKENTA_BUYBACK", "SELL TO TOKENTA")}
      </div>

      {sellTab === "P2P_LISTING" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="border-b border-white/15 bg-white/[0.03] px-4 py-3">
            <div className="text-[10px] tracking-[0.24em] text-white/40">P2P LISTING · CREATE</div>
            <p className="mt-1 text-[11px] text-white/60">
              List surplus API quota for other users. Verification and seller deposit required before going live.
            </p>
            <button
              type="button"
              onClick={onListApi}
              className="mt-3 flex items-center gap-2 border border-white bg-white px-4 py-2 text-[10px] tracking-[0.2em] text-black hover:bg-white/90"
            >
              <ArrowUpRight className="h-3.5 w-3.5" /> CREATE LISTING
            </button>
          </div>

          <div className="px-4 py-2 text-[10px] tracking-[0.22em] text-white/40">YOUR P2P LISTINGS</div>
          <table className="w-full text-[11px]">
            <thead className="border-b border-white/15 bg-black text-white/40">
              <tr className="tracking-[0.1em]">
                {["ASSET", "QTY", "PRICE", "LISTED", "STATUS", ""].map((h) => (
                  <th key={h} className="px-3 py-1.5 text-left font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myListings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                    No listings yet. Create one to start selling on the marketplace.
                  </td>
                </tr>
              )}
              {myListings.map((l) => (
                <tr key={l.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2">{l.provider}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {l.supply} {l.unit}
                  </td>
                  <td className="px-3 py-2 tabular-nums">${l.price}/unit</td>
                  <td className="px-3 py-2 text-white/50">{l.verificationTimestamp}</td>
                  <td className="px-3 py-2">{l.status}</td>
                  <td className="px-3 py-2 text-[10px] tracking-[0.14em] text-white/50">VIEW</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4 space-y-4">
          <div>
            <div className="text-[10px] tracking-[0.28em] text-white/40">TOKENTA BUYBACK PROGRAM</div>
            <p className="mt-1 text-[11px] text-white/55">Instant liquidity — not listed on the public marketplace.</p>
          </div>
          {buybackOffers.length === 0 && (
            <p className="text-[11px] text-white/40">No buyback offers available.</p>
          )}
          {buybackOffers.map((o) => (
            <BuybackOfferCard key={o.id} offer={o} onAccept={() => onSellToTokenta(o.id)} />
          ))}

          <div className="pt-2 text-[10px] tracking-[0.22em] text-white/40">YOUR PENDING TOKENTA SALES</div>
          <table className="w-full text-[11px]">
            <thead className="border-b border-white/15 text-white/40">
              <tr className="tracking-[0.1em]">
                {["ORDER", "QTY", "SALE PRICE", "STATUS", ""].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-left font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingBuybackOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-white/40">
                    No pending buyback sales.
                  </td>
                </tr>
              )}
              {pendingBuybackOrders.map((o) => (
                <tr key={o.orderId} className="border-b border-white/5">
                  <td className="px-2 py-2 font-mono text-[10px]">{o.orderId.slice(0, 12)}…</td>
                  <td className="px-2 py-2 tabular-nums">{o.quantity}</td>
                  <td className="px-2 py-2 tabular-nums">{o.amountUsdc} USDC</td>
                  <td className="px-2 py-2">{o.status}</td>
                  <td className="px-2 py-2 text-white/50">VIEW</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border border-white/20 p-3 text-[10px] text-white/50 flex items-start gap-2">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Buyback requires 200% seller deposit held 30 days, key rotation, and fraud monitoring. Payment within 1
              hour after verification.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
