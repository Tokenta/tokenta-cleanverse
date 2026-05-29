import { useState } from "react";
import { useTerminalToast } from "../context/TerminalToastContext";
import { TokentaScrollArea } from "./TokentaScrollArea";
import { ReputationLevelCard } from "./ReputationLevelCard";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type {
  AccessMethod,
  ComplianceFlag,
  EnhancedListing,
  MarketFilters,
  MarketSortKey,
  TradingMode,
} from "../trading-types";
import { calculateDeposits, isTokentaListing } from "../trading-types";

export function TradingModeSelector({
  mode,
  onChange,
  disabled,
}: {
  mode: TradingMode;
  onChange: (m: TradingMode) => void;
  disabled?: boolean;
}) {
  const btn = (m: TradingMode, label: string, Icon: typeof ArrowDownRight) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(m)}
      className={`tokenta-mode-toggle-btn px-3 py-1.5 flex items-center gap-1.5 transition-colors duration-200 disabled:cursor-wait text-[10px] tracking-[0.2em] min-h-[var(--tokenta-touch-min)] ${
        mode === m ? "bg-white text-black" : "text-white/60 hover:text-white disabled:hover:text-white/60"
      }`}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
  return (
    <div data-tour="role-toggle" className="flex flex-col items-center gap-1">
      <div className="border border-white/30 flex items-stretch">
        {btn("BUY", "BUY", ArrowDownRight)}
        <div className="w-px bg-white/30" />
        {btn("SELL", "SELL", ArrowUpRight)}
      </div>
    </div>
  );
}

export function AccessMethodBadge({ method, inverted }: { method: AccessMethod; inverted?: boolean }) {
  const label = { DIRECT_KEY: "K", PROXY_GATEWAY: "P", KEY_ROTATION_REQUIRED: "R" }[method];
  const title = {
    DIRECT_KEY: "Direct key access",
    PROXY_GATEWAY: "Platform proxy gateway",
    KEY_ROTATION_REQUIRED: "Key rotation required",
  }[method];
  return (
    <span
      title={title}
      className={`inline-flex h-4 w-4 items-center justify-center border text-[9px] ${
        inverted ? "border-black/45 text-black" : "border-white/40 text-white"
      }`}
    >
      {label}
    </span>
  );
}

export function ComplianceBadge({ flag, inverted }: { flag: ComplianceFlag; inverted?: boolean }) {
  const styles = inverted
    ? {
        VERIFIED_TOS: "border-black/40 text-black",
        UNVERIFIED: "border-black/30 text-black/70",
        GRAY_MARKET: "border-red-600 text-black bg-red-100/90",
      }
    : {
        VERIFIED_TOS: "border-white/40 text-white",
        UNVERIFIED: "border-white/25 text-white/60",
        GRAY_MARKET: "border-red-500/80 text-white",
      };
  const label = { VERIFIED_TOS: "VERIFIED TOS", UNVERIFIED: "UNVERIFIED", GRAY_MARKET: "GRAY MARKET" }[flag];
  return (
    <span className={`inline-block border px-1 py-px text-[8px] tracking-[0.14em] ${styles[flag]}`}>{label}</span>
  );
}

export function ListingSourceLabel({ listing, inverted }: { listing: EnhancedListing; inverted?: boolean }) {
  const tokenta = isTokentaListing(listing);
  return (
    <span
      className={
        inverted
          ? tokenta
            ? "font-bold tracking-[0.08em] text-black"
            : "font-medium text-black"
          : tokenta
            ? "font-bold tracking-[0.08em] text-white"
            : "text-white/80"
      }
    >
      {tokenta ? "TOKENTA" : listing.seller ?? "@user"}
    </span>
  );
}

export function TrustCell({ listing, inverted }: { listing: EnhancedListing; inverted?: boolean }) {
  if (isTokentaListing(listing)) {
    return (
      <span
        className={`border px-1 text-[8px] tracking-[0.12em] ${
          inverted ? "border-black/40 text-black" : "border-white/40 text-white"
        }`}
      >
        TOKENTA GUARANTEED
      </span>
    );
  }
  const tone = inverted
    ? listing.trustTone === "high"
      ? "text-black"
      : listing.trustTone === "risk"
        ? "border border-red-600 text-black px-1"
        : "text-black/60"
    : listing.trustTone === "high"
      ? "text-white"
      : listing.trustTone === "risk"
        ? "border border-red-500/70 px-1 text-white"
        : "text-white/50";
  return <span className={tone}>{listing.trustLabel}</span>;
}

export function MarketFilterSidebar({
  filters,
  onChange,
  sort,
  onSortChange,
  mode,
}: {
  filters: MarketFilters;
  onChange: (f: MarketFilters) => void;
  sort: MarketSortKey;
  onSortChange: (s: MarketSortKey) => void;
  mode: TradingMode;
}) {
  const toggle = (key: keyof MarketFilters) =>
    onChange({ ...filters, [key]: !filters[key] });

  const checks: { key: keyof MarketFilters; label: string; hide?: boolean }[] = [
    { key: "p2pOnly", label: "P2P Listings Only" },
    { key: "platformInventoryOnly", label: "Platform Inventory Only" },
    { key: "platformBuybackOnly", label: "Tokenta Buyback Offers", hide: mode !== "SELL" },
    { key: "directKeyOnly", label: "Direct Key Access Only" },
    { key: "verifiedTosOnly", label: "Verified TOS Compliance" },
    { key: "aggregatedOnly", label: "Aggregated Inventory" },
  ];

  return (
    <aside className="flex w-40 shrink-0 flex-col border-r border-white/15 min-h-0">
      <TokentaScrollArea
        orientation="vertical"
        className="min-h-0 flex-1"
        viewportClassName="p-2.5 text-[9px] tracking-[0.14em]"
        ariaLabel="Market filters"
      >
        <div className="text-white/40 mb-1.5">FILTERS</div>
        <div className="space-y-1.5">
          {checks
            .filter((c) => !c.hide)
            .map((c) => (
              <label key={c.key} className="flex cursor-pointer items-start gap-1.5 hover:text-white">
                <input
                  type="checkbox"
                  checked={filters[c.key]}
                  onChange={() => toggle(c.key)}
                  className="mt-0.5 shrink-0 accent-white"
                />
                <span className="leading-snug text-white/60">{c.label}</span>
              </label>
            ))}
        </div>
        <div className="text-white/40 mt-3 mb-1.5">SORT</div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as MarketSortKey)}
          className="w-full border border-white/20 bg-black px-1.5 py-1 text-[9px] outline-none focus:border-white"
        >
          <option value="PRICE_ASC">Price (low to high)</option>
          <option value="PRICE_DESC">Price (high to low)</option>
          <option value="TRUST">Trust Score</option>
          <option value="VERIFY_FRESH">Verify Freshness</option>
          <option value="INVENTORY_SIZE">Inventory Size</option>
          <option value="ACCESS_METHOD">Access Method</option>
        </select>
      </TokentaScrollArea>
    </aside>
  );
}

export function DepositBreakdownPanel({
  totalUsdc,
  scenario,
}: {
  totalUsdc: number;
  scenario: "P2P" | "TOKENTA_AS_SELLER" | "TOKENTA_AS_BUYER";
}) {
  const d = calculateDeposits(totalUsdc, scenario);
  const rules =
    scenario === "P2P"
      ? "P2P: both parties deposit 150% of transaction value"
      : scenario === "TOKENTA_AS_SELLER"
        ? "Tokenta Direct: no buyer deposit — platform absorbs risk"
        : "Tokenta Buyback: seller deposits 200% for 30 days";

  return (
    <div className="space-y-2 text-[11px]">
      <div className="font-mono leading-relaxed text-white/80">
        <div>TRANSACTION TOTAL: ${totalUsdc.toFixed(2)}</div>
        <div className="pl-2 text-white/60">
          <div>├─ BUYER PAYMENT: ${d.buyerPayment.toFixed(2)}</div>
          <div>├─ BUYER DEPOSIT: ${d.buyerDeposit.toFixed(2)}</div>
          <div>├─ SELLER DEPOSIT: ${d.sellerDeposit.toFixed(2)}</div>
          <div>├─ PLATFORM FEE: ${d.platformFee.toFixed(2)}</div>
          {d.platformReserve > 0 && <div>└─ PLATFORM RESERVE: ${d.platformReserve.toFixed(2)}</div>}
        </div>
      </div>
      <div className="border border-white/15 p-2 text-[10px] tracking-[0.12em] text-white/50">
        DEPOSIT RULES: {rules}
      </div>
      <EscrowStateMachine />
    </div>
  );
}

function EscrowStateMachine() {
  const steps = ["DEPOSIT", "LOCKED", "DELIVERY", "VERIFICATION", "DISPUTE?", "SETTLEMENT"];
  return (
    <div>
      <div className="text-[9px] tracking-[0.2em] text-white/40 mb-1">ESCROW STATE</div>
      <div className="flex flex-wrap gap-1">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-1 text-[9px] tracking-[0.1em]">
            {i > 0 && <span className="text-white/30">→</span>}
            <span className="border border-white/25 px-1 py-px">{s}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProxyAccessDisclaimer() {
  return (
    <div className="border border-white/25 p-3 text-[11px] leading-relaxed">
      <div className="text-[10px] tracking-[0.22em] text-white/90">ACCESS METHOD: PLATFORM PROXY GATEWAY</div>
      <p className="mt-2 text-white/60">
        You receive a platform-issued API key, not the original provider key. Requests route through Tokenta
        infrastructure.
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-white/50 text-[10px]">
        <li>Platform may log request metadata (not content unless disclosed)</li>
        <li>Gateway failure interrupts your access</li>
        <li>Provider may not recognize your usage directly</li>
      </ul>
      <div className="mt-2 flex justify-between text-[10px] tracking-[0.14em]">
        <span className="text-white/40">UPTIME SLA 30D</span>
        <span>99.8%</span>
      </div>
    </div>
  );
}

export function VerificationModeBanner({ method }: { method: AccessMethod | string }) {
  const mode =
    method === "PROXY_GATEWAY" || method === "PROXY_HEARTBEAT"
      ? "PROXY_HEARTBEAT"
      : method === "KEY_ROTATION_REQUIRED" || method === "ROTATION_VALIDATION"
        ? "ROTATION_VALIDATION"
        : "DIRECT_KEY_TEST";
  return (
    <div className="border-b border-white/15 px-4 py-2 flex items-center gap-4 text-[10px] tracking-[0.18em]">
      <span className="text-white/40">VERIFICATION_MODE</span>
      {(["DIRECT_KEY_TEST", "PROXY_HEARTBEAT", "ROTATION_VALIDATION"] as const).map((m) => (
        <span
          key={m}
          className={`px-2 py-0.5 border ${mode === m ? "border-white bg-white text-black" : "border-white/25 text-white/50"}`}
        >
          {m}
        </span>
      ))}
    </div>
  );
}

export function KeyRotationPanel({
  role,
  orderId,
  onJobStarted,
}: {
  role: "seller" | "buyer";
  orderId?: string;
  onJobStarted?: (jobId: string) => void;
}) {
  const [oldKey, setOldKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useTerminalToast();

  if (role === "buyer") {
    return (
      <div className="border border-white/20 p-4 text-[11px]">
        <div className="text-[10px] tracking-[0.22em] text-white/40">BUYER STATUS</div>
        <div className="mt-2 text-white">PENDING SELLER KEY ROTATION</div>
        <p className="mt-2 text-white/60">Deposits remain locked until rotation verification passes.</p>
      </div>
    );
  }

  const submit = async () => {
    if (!orderId || newKey.length < 8 || oldKey.length < 8) return;
    setBusy(true);
    try {
      const { createKeyRotationVerification } = await import("../api/verification");
      const res = await createKeyRotationVerification({
        orderId,
        newApiKey: newKey,
        oldApiKey: oldKey,
        declaredQuantity: 50_000,
        provider: "openai",
      });
      onJobStarted?.(res.jobId);
      setNewKey("");
      setOldKey("");
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Rotation verify failed",
        title: "KEY ROTATION",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-white/20 p-4 text-[11px] space-y-3">
      <div className="text-[10px] tracking-[0.22em] text-white">ACTION REQUIRED: Generate New API Key</div>
      <p className="text-white/55 text-[10px]">
        Paradigm F: old key must return 401; new key runs L1–L3. Mock: use sk-mock-old-revoked + sk-mock-new-key.
      </p>
      <input
        type="password"
        value={oldKey}
        onChange={(e) => setOldKey(e.target.value)}
        placeholder="old key (revoked)"
        className="w-full border border-white/20 bg-black px-2 py-2 text-[11px] outline-none focus:border-white"
      />
      <input
        type="password"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        placeholder="new key"
        className="w-full border border-white/20 bg-black px-2 py-2 text-[11px] outline-none focus:border-white"
      />
      <button
        type="button"
        disabled={busy || !orderId}
        onClick={() => void submit()}
        className="w-full border border-white bg-white py-2 text-[10px] tracking-[0.2em] text-black disabled:opacity-40"
      >
        {busy ? "VERIFYING…" : "SUBMIT NEW KEY & REVOKE OLD KEY"}
      </button>
    </div>
  );
}

export function TrustLayerStatusPanel({
  status,
  tier,
  confidence,
  verifiedRuns,
  anchoredReceipts,
  nextMilestone,
  live,
  onOpenLeaderboard,
  composite,
  hasActiveListing,
  completedOrders,
}: {
  status?: string;
  tier?: string;
  confidence?: string;
  verifiedRuns?: number;
  anchoredReceipts?: number;
  nextMilestone?: string;
  live?: boolean;
  onOpenLeaderboard?: () => void;
  composite?: number | null;
  hasActiveListing?: boolean;
  completedOrders?: number;
}) {
  if (onOpenLeaderboard) {
    return (
      <ReputationLevelCard
        xpInput={{
          verifiedRuns: verifiedRuns ?? 0,
          anchoredReceipts: anchoredReceipts ?? 0,
          composite: composite ?? null,
          hasActiveListing,
          completedOrders,
        }}
        live={live ?? false}
        onOpenLeaderboard={onOpenLeaderboard}
      />
    );
  }

  const isUnverified = (status ?? "UNVERIFIED") === "UNVERIFIED";

  return (
    <div className="border border-white/15 p-4 text-[11px] space-y-4">
      <div className="flex items-center justify-between text-[10px] tracking-[0.22em] text-white/40">
        <span>TOKENTA TRUST LAYER</span>
        <span>{live ? "API" : "—"}</span>
      </div>
      <div>
        <div className="text-[9px] tracking-[0.18em] text-white/40">STATUS</div>
        <div className="text-[22px] tracking-[0.12em] mt-0.5">{status ?? "UNVERIFIED"}</div>
        <div className="text-white/50 mt-1">
          {isUnverified ? "Insufficient execution history" : `Tier ${tier ?? "C"} · proof-weighted`}
        </div>
      </div>
      <div>
        <div className="text-[9px] tracking-[0.18em] text-white/40">EXECUTION HISTORY</div>
        <div className="tabular-nums mt-0.5">{verifiedRuns ?? 0} verified runs</div>
        <div className="text-white/50 tabular-nums">{anchoredReceipts ?? 0} anchored receipts</div>
      </div>
      <div>
        <div className="text-[9px] tracking-[0.18em] text-white/40">CONFIDENCE</div>
        <div className="tracking-[0.14em] mt-0.5">{confidence ?? "LOW"}</div>
      </div>
      <div>
        <div className="text-[9px] tracking-[0.18em] text-white/40">NEXT MILESTONE</div>
        <div className="text-white/60 leading-snug mt-0.5">
          {nextMilestone ?? "Complete 3 anchored verifications"}
        </div>
      </div>
    </div>
  );
}

export function ComplianceScorePanel({
  score,
  riskFactors,
  positiveFactors,
  live,
}: {
  score?: number;
  riskFactors?: string[];
  positiveFactors?: string[];
  live?: boolean;
}) {
  const displayScore = score ?? 87;
  const risks = riskFactors?.length
    ? riskFactors
    : ["- 2 listings flagged as potential TOS violations (-10 pts)", "- 1 arbitration dispute lost (-3 pts)"];
  const positives = positiveFactors?.length
    ? positiveFactors
    : ["+ 15 successful trades with no issues (+15 pts)", "+ Verified KYC (+5 pts)"];

  return (
    <div className="border border-white/15 p-4 text-[11px]">
      <div className="flex items-center justify-between text-[10px] tracking-[0.22em] text-white/40">
        <span>YOUR COMPLIANCE SCORE</span>
        <span>{live ? "API" : "—"}</span>
      </div>
      <div className="text-[32px] tabular-nums mt-1">
        {displayScore}
        <span className="text-white/40 text-lg">/100</span>
      </div>
      <div className="mt-3 space-y-1 text-white/60">
        <div className="text-[9px] tracking-[0.18em] text-white/40">RISK FACTORS</div>
        {risks.map((line) => (
          <div key={line}>{line.startsWith("-") ? line : `- ${line}`}</div>
        ))}
      </div>
      <div className="mt-3 space-y-1 text-white/60">
        <div className="text-[9px] tracking-[0.18em] text-white/40">POSITIVE FACTORS</div>
        {positives.map((line) => (
          <div key={line}>{line.startsWith("+") ? line : `+ ${line}`}</div>
        ))}
      </div>
    </div>
  );
}

export function BuybackOfferCard({
  offer,
  onAccept,
}: {
  offer: { id: string; provider: string; product: string; minQty: string; buybackPrice: string; marketDiscount: string; bondPct: string };
  onAccept?: () => void;
}) {
  return (
    <div className="border border-white/20 p-3 text-[11px] space-y-2">
      <div className="text-[10px] tracking-[0.24em] text-white/40">TOKENTA BUYBACK OFFER</div>
      <div className="grid grid-cols-2 gap-1 text-white/70">
        <span>Provider</span><span className="text-right text-white">{offer.provider}</span>
        <span>Product</span><span className="text-right text-white">{offer.product}</span>
        <span>Min qty</span><span className="text-right">{offer.minQty}</span>
        <span>Price</span><span className="text-right">{offer.buybackPrice}</span>
        <span>Discount</span><span className="text-right">{offer.marketDiscount}</span>
        <span>Seller bond</span><span className="text-right">{offer.bondPct}</span>
      </div>
      <button
        type="button"
        onClick={onAccept}
        className="w-full border border-white bg-white py-2 text-[10px] tracking-[0.2em] text-black hover:bg-white/90"
      >
        ACCEPT BUYBACK
      </button>
    </div>
  );
}

export function PlatformModeGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
