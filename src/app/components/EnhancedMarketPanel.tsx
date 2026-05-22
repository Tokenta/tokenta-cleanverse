import { ChevronRight, Plus, Search } from "lucide-react";
import { filterListings } from "./tokenta-data";
import type { BuyMarketSource, EnhancedListing, MarketFilters, MarketSortKey, SellMarketTab, TradingMode } from "../trading-types";
import {
  AccessMethodBadge,
  ComplianceBadge,
  ListingSourceLabel,
  MarketFilterSidebar,
  TrustCell,
} from "./trading-ui";
import { MarketActionBanner } from "./terminal-flows";
import { SellMarketPanel } from "./SellMarketPanel";
import { isTokentaListing } from "../trading-types";
import { TokentaScrollArea } from "./TokentaScrollArea";

function sellerDisplay(listing: EnhancedListing): string {
  if (isTokentaListing(listing)) return "TOKENTA";
  return listing.seller ?? "P2P";
}

export function EnhancedMarketPanel({
  mode,
  buySource,
  onBuySourceChange,
  sellTab,
  onSellTabChange,
  listings,
  active,
  setSelectedAsset,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  onListApi,
  onBuyApi,
  onSellToTokenta,
}: {
  mode: TradingMode;
  buySource: BuyMarketSource;
  onBuySourceChange: (s: BuyMarketSource) => void;
  sellTab: SellMarketTab;
  onSellTabChange: (t: SellMarketTab) => void;
  listings: EnhancedListing[];
  active: EnhancedListing;
  setSelectedAsset: (id: string) => void;
  filters: MarketFilters;
  onFiltersChange: (f: MarketFilters) => void;
  sort: MarketSortKey;
  onSortChange: (s: MarketSortKey) => void;
  onListApi: () => void;
  onBuyApi: () => void;
  onSellToTokenta: () => void;
}) {
  if (mode === "SELL") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <SellMarketPanel
          sellTab={sellTab}
          onSellTabChange={onSellTabChange}
          onListApi={onListApi}
          onSellToTokenta={onSellToTokenta}
        />
      </div>
    );
  }

  const rows = filterListings(listings, mode, filters, sort, { buySource });
  const sourceTabs: { key: BuyMarketSource; label: string }[] = [
    { key: "ALL", label: "ALL LISTINGS" },
    { key: "USER_MARKETPLACE", label: "USER MARKETPLACE" },
    { key: "TOKENTA_DIRECT", label: "TOKENTA DIRECT" },
  ];

  const sourceTabBtn = (key: BuyMarketSource, label: string) => (
    <button
      type="button"
      onClick={() => onBuySourceChange(key)}
      className={`border px-2 py-0.5 text-[10px] tracking-[0.16em] transition-colors ${
        buySource === key ? "border-white bg-white !text-black" : "border-white/25 text-white/50 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MarketActionBanner mode={mode} onListApi={onListApi} onBrowseVerified={onBuyApi} />
      <div className="flex flex-wrap gap-2 border-b border-white/15 px-4 py-1.5">
        {sourceTabs.map((t) => sourceTabBtn(t.key, t.label))}
      </div>
      <div className="flex min-h-0 flex-1">
        <MarketFilterSidebar filters={filters} onChange={onFiltersChange} sort={sort} onSortChange={onSortChange} mode={mode} />
        <TokentaScrollArea orientation="both" className="min-h-0 flex-1" ariaLabel="Market listings table">
          <header className="flex items-center justify-between border-b border-white/15 px-3 py-1.5 tokenta-type-table shrink-0">
            <span className="uppercase tracking-[0.18em] text-white/70">F1.1 · Market Listings</span>
            <span className="flex items-center gap-2 text-white/40">
              <Search className="h-3 w-3" /> {rows.length} listings
              <button type="button" onClick={onBuyApi} className="flex items-center gap-1 hover:text-white">
                <Plus className="h-3 w-3" /> buy
              </button>
            </span>
          </header>
          <div className="tokenta-market-table-wrap">
          <table className="tokenta-market-table w-full tokenta-type-table">
            <thead className="sticky top-0 z-[1] border-b border-white/15 bg-black text-white/40">
              <tr className="tracking-[0.1em]">
                {["SELLER", "PROVIDER", "QTY", "PRICE", "ACCESS", "VERIFY", "TRUST", ""].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-left font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const isActive = a.id === active.id;
                const tokenta = isTokentaListing(a);
                const verifyLabel = a.verificationState
                  ? a.verificationState
                  : tokenta
                    ? "LIVE"
                    : a.verificationTimestamp;
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedAsset(a.id)}
                    className={`cursor-pointer border-b border-white/5 transition-colors ${
                      isActive ? "bg-white text-black" : "text-white hover:bg-white/5"
                    } ${
                      a.complianceFlag === "GRAY_MARKET"
                        ? isActive
                          ? "outline outline-1 outline-red-600/70 -outline-offset-1"
                          : "outline outline-1 outline-red-500/40 -outline-offset-1"
                        : ""
                    }`}
                  >
                    <td className="px-2 py-1.5">
                      <span className="tokenta-cell-wrap">
                        <ListingSourceLabel listing={a} inverted={isActive} />
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="tokenta-cell-wrap flex items-center gap-1">
                        <AccessMethodBadge method={a.accessMethod} inverted={isActive} />
                        <span className={isActive ? "text-black/80" : "text-white/70"}>{a.provider}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {a.supply}{" "}
                      <span className={isActive ? "text-black/50" : "text-white/50"}>{a.unit}</span>
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {a.price}
                      {!a.depositRequired && (
                        <div className={`text-[8px] tracking-[0.12em] ${isActive ? "text-black/55" : "text-white/50"}`}>
                          NO DEPOSIT
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="flex items-center gap-1">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            a.verificationState === "REVOKED"
                              ? "bg-red-500"
                              : a.verificationState === "STALE"
                                ? "bg-amber-400"
                                : tokenta
                                  ? "bg-emerald-400 animate-pulse"
                                  : isActive
                                    ? "bg-black"
                                    : "bg-white animate-pulse"
                          }`}
                        />
                        <span className={`font-mono text-[9px] ${isActive ? "text-black/70" : "text-white/60"}`}>
                          {verifyLabel}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <TrustCell listing={a} inverted={isActive} />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyApi();
                        }}
                        className={`border px-2 py-0.5 text-[9px] tracking-[0.14em] ${
                          isActive
                            ? "border-black bg-black text-white hover:bg-black/90"
                            : "border-white/30 hover:bg-white hover:text-black"
                        }`}
                      >
                        BUY
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </TokentaScrollArea>
      </div>
      {active.accessMethod === "PROXY_GATEWAY" && isTokentaListing(active) && (
        <div className="border-t border-white/15 p-3 text-[10px] tracking-[0.12em] text-white/50">
          TOKENTA DIRECT · Proxy gateway access · Platform-issued key · No buyer deposit
        </div>
      )}
    </div>
  );
}

