import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import {
  fetchMyListings,
  fetchSellerIncome,
  publishListing,
  updateListingPrice,
  type SellerIncomeResponse,
} from "../api/verification";
import { useTerminalToast } from "../context/TerminalToastContext";

type ListingStatus =
  | "VERIFYING"
  | "VERIFIED_PENDING_PUBLISH"
  | "LIVE"
  | "REVIEW"
  | "FAILED"
  | "DEGRADED";

interface MyListingRow {
  listingId: string;
  providerKind: string;
  quotaToSell: number;
  askPriceUsdc: number;
  listingStatus: ListingStatus;
  verificationState: string;
  capabilityScore?: number;
  updatedAt: string;
}

const PLATFORM_FEE_PCT = 3; // matches server PLATFORM_FEE_BPS = 300

function statusTone(status: ListingStatus): string {
  if (status === "LIVE") return "text-white";
  if (status === "VERIFIED_PENDING_PUBLISH") return "text-amber-300";
  if (status === "VERIFYING") return "text-white/50 animate-pulse";
  if (status === "REVIEW") return "text-amber-200";
  if (status === "FAILED") return "text-red-400";
  if (status === "DEGRADED") return "text-amber-500";
  return "text-white/40";
}

function statusLabel(status: ListingStatus): string {
  if (status === "VERIFIED_PENDING_PUBLISH") return "PENDING PUBLISH";
  return status;
}

/** Inline price editor shown on a single listing row. */
function PriceEditor({
  listingId,
  currentPrice,
  onUpdated,
  onCancel,
}: {
  listingId: string;
  currentPrice: number;
  onUpdated: (newPrice: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(currentPrice.toFixed(6));
  const [busy, setBusy] = useState(false);
  const { showToast } = useTerminalToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) {
      showToast({ message: "Enter a positive number", title: "PRICE" });
      return;
    }
    setBusy(true);
    try {
      const result = await updateListingPrice(listingId, parsed);
      if ("error" in result) {
        showToast({ message: result.error, title: "PRICE UPDATE" });
      } else {
        onUpdated(result.askPriceUsdc);
      }
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Update failed",
        title: "PRICE UPDATE",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleSave();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-white/40">$</span>
        <input
          ref={inputRef}
          type="number"
          step="0.000001"
          min="0.000001"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          className="w-24 border border-white/40 bg-black px-1.5 py-0.5 text-[10px] tabular-nums text-white outline-none focus:border-white disabled:opacity-40"
        />
        <span className="text-[9px] text-white/40">/tok</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSave()}
          className="border border-white/40 p-0.5 hover:bg-white/10 disabled:opacity-40"
          aria-label="Save price"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-white/20 p-0.5 hover:bg-white/10"
          aria-label="Cancel"
        >
          <X className="h-3 w-3 text-white/50" />
        </button>
      </div>
      <p className="text-[8px] text-white/30 tracking-[0.1em]">
        PLATFORM FEE {PLATFORM_FEE_PCT}% · SELLER RECEIVES{" "}
        {(100 - PLATFORM_FEE_PCT)}% OF GROSS
      </p>
    </div>
  );
}

export function MyListingsPanel({
  onPublishSuccess,
}: {
  onPublishSuccess?: (listingId: string) => void;
}) {
  const [listings, setListings] = useState<MyListingRow[]>([]);
  const [income, setIncome] = useState<SellerIncomeResponse | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const { showToast } = useTerminalToast();

  const refresh = () => {
    void fetchMyListings().then(setListings).catch(() => {});
    void fetchSellerIncome()
      .then((d) => {
        if (d) setIncome(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, []);

  const handlePublish = async (listingId: string) => {
    setPublishing(listingId);
    try {
      const result = await publishListing(listingId);
      if ("error" in result) {
        if (result.code === "INVALID_LISTING_STATE" && result.currentStatus === "LIVE") {
          refresh();
          onPublishSuccess?.(listingId);
        } else {
          showToast({ message: result.error, title: "PUBLISH" });
        }
      } else {
        refresh();
        onPublishSuccess?.(listingId);
      }
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Publish failed",
        title: "PUBLISH",
      });
    } finally {
      setPublishing(null);
    }
  };

  const handlePriceUpdated = (listingId: string, newPrice: number) => {
    setListings((prev) =>
      prev.map((l) => (l.listingId === listingId ? { ...l, askPriceUsdc: newPrice } : l)),
    );
    setEditingPrice(null);
  };

  const activeCount = listings.filter((l) => l.listingStatus === "LIVE").length;
  const pendingCount = listings.filter(
    (l) => l.listingStatus === "VERIFIED_PENDING_PUBLISH",
  ).length;

  return (
    <div className="flex flex-col border-t border-white/15 font-mono text-[11px]">
      {/* Header with income summary */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-1.5 text-[9px] tracking-[0.2em] text-white/40">
        <span>
          MY LISTINGS
          {activeCount > 0 && (
            <span className="ml-2 text-white">{activeCount} LIVE</span>
          )}
          {pendingCount > 0 && (
            <span className="ml-2 text-amber-300">{pendingCount} PENDING</span>
          )}
        </span>
        {income && (
          <span className="text-white/60">
            INCOME{" "}
            <span className="text-white tabular-nums">${income.availableUsdc}</span>
          </span>
        )}
      </div>

      {listings.length === 0 && (
        <div className="px-3 py-3 text-[10px] text-white/35">
          No listings yet. Use List API for Sale to add one.
        </div>
      )}

      <ul className="max-h-56 divide-y divide-white/5 overflow-auto">
        {listings.map((l) => (
          <li key={l.listingId} className="px-3 py-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-white/40 mr-1.5">
                  {l.listingId.slice(-6).toUpperCase()}
                </span>
                <span className="uppercase tracking-wider text-white/70">
                  {l.providerKind}
                </span>
              </div>
              <span className={`shrink-0 tracking-[0.12em] ${statusTone(l.listingStatus)}`}>
                {statusLabel(l.listingStatus)}
              </span>
            </div>

            {/* Price row — click pencil to edit inline */}
            <div className="flex items-center gap-3 text-[9px] tabular-nums text-white/40">
              <span>{l.quotaToSell.toLocaleString()} tok</span>
              {editingPrice === l.listingId ? (
                <PriceEditor
                  listingId={l.listingId}
                  currentPrice={l.askPriceUsdc}
                  onUpdated={(p) => handlePriceUpdated(l.listingId, p)}
                  onCancel={() => setEditingPrice(null)}
                />
              ) : (
                <span className="flex items-center gap-1">
                  <span>${l.askPriceUsdc.toFixed(4)}/tok</span>
                  {(l.listingStatus === "LIVE" ||
                    l.listingStatus === "VERIFIED_PENDING_PUBLISH" ||
                    l.listingStatus === "REVIEW") && (
                    <button
                      type="button"
                      onClick={() => setEditingPrice(l.listingId)}
                      className="ml-0.5 text-white/30 hover:text-white transition-colors"
                      aria-label="Edit price"
                      title="Edit ask price"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              )}
              {l.capabilityScore != null && (
                <span>CAP {(l.capabilityScore * 100).toFixed(0)}%</span>
              )}
            </div>

            {/* Net income preview for LIVE listings */}
            {l.listingStatus === "LIVE" && editingPrice !== l.listingId && (
              <div className="text-[8px] text-white/25 tracking-[0.08em]">
                EST. INCOME{" "}
                <span className="text-white/40">
                  $
                  {(
                    (l.askPriceUsdc * l.quotaToSell * (100 - PLATFORM_FEE_PCT)) /
                    100 /
                    1_000_000
                  ).toFixed(2)}
                </span>{" "}
                USDC AFTER {PLATFORM_FEE_PCT}% FEE
              </div>
            )}

            {l.listingStatus === "VERIFIED_PENDING_PUBLISH" && (
              <button
                type="button"
                disabled={publishing === l.listingId}
                onClick={() => void handlePublish(l.listingId)}
                className="w-full border border-white/40 px-2 py-1 text-[9px] tracking-[0.16em] hover:bg-white/10 disabled:opacity-40"
              >
                {publishing === l.listingId ? "PUBLISHING…" : "CONFIRM & PUBLISH"}
              </button>
            )}

            {l.listingStatus === "LIVE" && (
              <div className="text-[9px] text-white/30">
                Listed · buyers can purchase
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
