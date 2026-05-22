import { useCallback, useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight, ArrowDownRight, Circle, Activity, Boxes, ShieldCheck,
  Receipt, MessagesSquare, Award, Wallet, BarChart3, Search, Plus,
  ChevronRight, Dot, Send, Filter, ArrowLeftRight, Lock, Unlock, Zap
} from "lucide-react";
import {
  assets,
  enhancedListings,
  buybackOffers,
  orderBook,
  verifyFeed,
  orders,
  rotationGuide,
  filterListings,
  formatTransactionType,
} from "./components/tokenta-data";
import { EnhancedMarketPanel } from "./components/EnhancedMarketPanel";
import { InventoryView } from "./components/InventoryView";
import {
  MarketFilterSidebar,
  AccessMethodBadge,
  ComplianceBadge,
  ListingSourceLabel,
  TrustCell,
  DepositBreakdownPanel,
  ProxyAccessDisclaimer,
  VerificationModeBanner,
  KeyRotationPanel,
  TrustLayerStatusPanel,
  BuybackOfferCard,
} from "./components/trading-ui";
import {
  DEFAULT_MARKET_FILTERS,
  type BuyMarketSource,
  type MarketFilters,
  type MarketSortKey,
  type SellMarketTab,
  type TradingMode,
} from "./trading-types";
import {
  getInitialTradingMode,
  persistTradingMode,
  getBuyMarketSource,
  getSellMarketTab,
  persistBuyMarketSource,
  persistSellMarketTab,
} from "./session";
import { NAV_ITEMS, type NavKey } from "./nav-config";
import { PriceChart } from "./components/PriceChart";
import tokentaLogo from "../assets/tokenta-logo.png";
import { RoleTransitionOverlay } from "./components/RoleTransitionOverlay";
import { UserTour } from "./components/UserTour";
import { TOUR_STORAGE_KEY, TOUR_STEPS } from "./tour-steps";
import type { Role } from "./session";
import {
  ListApiModal,
  BuyApiModal,
  BuybackVerifyModal,
  PrePurchaseVerifyModal,
  MarketActionBanner,
  OrderDetailView,
} from "./components/terminal-flows";
import { VerificationJobPanel } from "./components/VerificationJobPanel";
import {
  fetchMarketListings,
  fetchMetricsHealth,
  fetchProofComposition,
  fetchVerifyFeed,
  fetchOrderRoomMessages,
  fundOrderEscrow,
  postOrderRoomMessage,
  releaseOrderEscrow,
  runOrderRoomAction,
  setVerificationWalletAddress,
  ensureTerminalSession,
  signEscrowPayloadDev,
  marketRowToEnhanced,
  fetchTerminalReputationLedger,
  fetchTerminalWalletSummary,
  fetchTerminalAnalyticsOverview,
  fetchTerminalNetwork,
  fetchTerminalOrders,
  type TerminalOrderRow,
  type VerifyFeedRow,
  type ReputationLedgerRow,
  type ReputationScoreResponse,
  type WalletSummaryResponse,
  type AnalyticsOverviewResponse,
} from "./api/verification";
import { useTokentaWallet } from "./hooks/useTokentaWallet";
import { useBaseSepoliaWallet } from "./hooks/useBaseSepoliaWallet";
import { useSettlementNetwork } from "./hooks/useSettlementNetwork";
import { useTerminalTimezone } from "./hooks/useTerminalTimezone";
import { useTerminalReputation } from "./hooks/useTerminalReputation";
import { formatTerminalTimestamp } from "./timezone/terminal-timezone";
import type { EnhancedListing } from "./trading-types";
import { usePrivy } from "@privy-io/react-auth";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { PreviewModeBanner } from "./components/PreviewModeBanner";
import { AuthPromptToast } from "./components/AuthPromptToast";
import { TerminalErrorBoundary } from "./components/TerminalErrorBoundary";
import { TopBar } from "./TopBar";
import {
  SideNav,
  WorkspaceNavBar,
  getInitialSidebarOpen,
  persistSidebarOpen,
} from "./components/SideNav";
import { Panel, Tag, Pulse } from "./ui-primitives";
import { useZoomLevel } from "./hooks/useZoomLevel";
import { TokentaScrollArea } from "./components/TokentaScrollArea";
import { ZoomWarningBanner } from "./components/ZoomWarningBanner";

const SESSION_BOOT_KEY = "tokenta-session-booted";

function TerminalLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black font-mono text-[11px] tracking-[0.24em] text-white/50">
      INITIALIZING PRIVY…
    </div>
  );
}

export default function App() {
  const { ready } = usePrivy();

  if (!ready) {
    return <TerminalLoadingScreen />;
  }

  return (
    <AuthProvider>
      <TerminalErrorBoundary>
        <TerminalApp />
      </TerminalErrorBoundary>
    </AuthProvider>
  );
}

function TerminalApp() {
  const { requireAuth } = useAuth();
  const { address: walletAddress, authenticated } = useTokentaWallet();
  const { network: settlementNetwork, live: networkLive } = useSettlementNetwork();

  useBaseSepoliaWallet(authenticated);

  useEffect(() => {
    setVerificationWalletAddress(walletAddress);
    if (walletAddress) void ensureTerminalSession();
  }, [walletAddress]);

  const [mode, setMode] = useState<TradingMode>(getInitialTradingMode);
  const [transitionMode, setTransitionMode] = useState<TradingMode | null>(null);
  const [buySource, setBuySource] = useState<BuyMarketSource>(getBuyMarketSource);
  const [sellTab, setSellTab] = useState<SellMarketTab>(getSellMarketTab);
  const [marketFilters, setMarketFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);
  const [marketSort, setMarketSort] = useState<MarketSortKey>("TRUST");
  const [nav, setNav] = useState<NavKey>("MARKET");
  const [selectedAsset, setSelectedAsset] = useState(assets[0].id);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [listApiOpen, setListApiOpen] = useState(false);
  const [buybackOpen, setBuybackOpen] = useState(false);
  const [prePurchaseOpen, setPrePurchaseOpen] = useState(false);
  const [prePurchaseOrderId, setPrePurchaseOrderId] = useState<string | null>(null);
  const [buybackOfferId, setBuybackOfferId] = useState(buybackOffers[0]?.id ?? "BB-001");
  const [activeVerificationJobId, setActiveVerificationJobId] = useState<string | null>(null);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [buyApiOpen, setBuyApiOpen] = useState(false);
  const { clock, timezone: terminalTimezone } = useTerminalTimezone();
  const reputation = useTerminalReputation();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen);
  const [apiMarketRows, setApiMarketRows] = useState<EnhancedListing[]>([]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      persistSidebarOpen(next);
      return next;
    });
  }, []);

  const requestModeChange = useCallback(
    (next: TradingMode) => {
      if (next === mode || transitionMode !== null) return;
      setTransitionMode(next);
      setNav("MARKET");
    },
    [mode, transitionMode],
  );

  const completeModeTransition = useCallback(() => {
    setTransitionMode((pending) => {
      if (pending) {
        setMode(pending);
        persistTradingMode(pending);
      }
      return null;
    });
  }, []);

  const setBuySourceFilter = useCallback((source: BuyMarketSource) => {
    setBuySource(source);
    persistBuyMarketSource(source);
  }, []);

  const setSellTabFilter = useCallback((tab: SellMarketTab) => {
    setSellTab(tab);
    persistSellMarketTab(tab);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(SESSION_BOOT_KEY)) {
      localStorage.setItem(SESSION_BOOT_KEY, "1");
      setNav("MARKET");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMarket = () => {
      void fetchMarketListings().then((rows) => {
        if (!cancelled) setApiMarketRows(rows.map(marketRowToEnhanced));
      });
    };
    loadMarket();
    const id = window.setInterval(loadMarket, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeVerificationJobId]);

  const listings = useMemo(() => {
    const byId = new Map(enhancedListings.map((l) => [l.id, l]));
    for (const row of apiMarketRows) byId.set(row.id, row);
    return [...byId.values()];
  }, [apiMarketRows]);

  const displayMode = transitionMode ?? mode;

  const finishTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    setTourOpen(false);
  }, []);

  useEffect(() => {
    if (transitionMode) return;
    if (localStorage.getItem(TOUR_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setTourOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [transitionMode]);

  useEffect(() => {
    if (!tourOpen) return;
    const step = TOUR_STEPS[tourStep];
    if (step?.nav) setNav(step.nav);
  }, [tourStep, tourOpen]);

  const active = listings.find((a) => a.id === selectedAsset) ?? listings[0] ?? assets[0];

  const openListApi = useCallback(() => {
    if (!requireAuth("Listing an API for sale")) return;
    setListApiOpen(true);
  }, [requireAuth]);

  const openBuyback = useCallback(
    (offerId?: string) => {
      if (!requireAuth("Tokenta buyback sale")) return;
      if (offerId) setBuybackOfferId(offerId);
      setBuybackOpen(true);
    },
    [requireAuth],
  );

  const openBuyApi = useCallback(() => {
    if (!requireAuth("Purchasing verified API access")) return;
    setBuyApiOpen(true);
  }, [requireAuth]);

  const guardWalletAction = useCallback(
    (label: string) => requireAuth(label),
    [requireAuth],
  );

  const { bucket, isExtreme, scale } = useZoomLevel();

  return (
    <div
      className="tokenta-terminal tokenta-terminal__shell size-full bg-black text-white font-mono text-[12px] leading-tight flex flex-col select-none"
      data-zoom={bucket}
    >
      {isExtreme && <ZoomWarningBanner bucket={bucket} scale={scale} />}
      <PreviewModeBanner />
      <TopBar
        mode={displayMode}
        onModeChange={requestModeChange}
        modeSwitchDisabled={transitionMode !== null}
        clock={clock}
        onOpenWallet={() => setNav("ESCROW")}
        networkLabel={settlementNetwork.network.replace(/-/g, " ").toUpperCase()}
        chainId={settlementNetwork.chainId}
        blockNumber={settlementNetwork.blockNumber}
        gasPriceGwei={settlementNetwork.gasPriceGwei}
        networkLive={networkLive && settlementNetwork.connected}
        reputationDisplay={reputation.compositeDisplay}
        reputationTier={reputation.tier}
        reputationLive={reputation.live}
      />
      <StatusStrip />
      <motion.div
        key={mode}
        className="tokenta-terminal__workspace flex min-h-0 flex-1"
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <SideNav
          open={sidebarOpen}
          onToggle={toggleSidebar}
          nav={nav}
          setNav={setNav}
          mode={mode}
          buySource={buySource}
          onListApi={openListApi}
          onBrowseMarket={() => setNav("MARKET")}
        />
        <main
          data-tour="main-workspace"
          data-sidebar-collapsed={sidebarOpen ? "false" : "true"}
          className="tokenta-workspace flex min-w-0 flex-1 flex-col overflow-hidden"
        >
          <WorkspaceNavBar nav={nav} mode={mode} sidebarOpen={sidebarOpen} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {nav === "MARKET" && (
            <MarketView
              mode={mode}
              buySource={buySource}
              sellTab={sellTab}
              listings={listings}
              onBuySourceChange={setBuySourceFilter}
              onSellTabChange={setSellTabFilter}
              active={active}
              setSelectedAsset={setSelectedAsset}
              filters={marketFilters}
              onFiltersChange={setMarketFilters}
              sort={marketSort}
              onSortChange={setMarketSort}
              onListApi={openListApi}
              onBuyApi={openBuyApi}
              onSellToTokenta={() => openBuyback()}
            />
          )}
          {nav === "VERIFY" && (
            <VerifyView
              mode={mode}
              activeJobId={activeVerificationJobId}
              activeListingId={activeListingId}
            />
          )}
          {nav === "ESCROW" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              <EscrowView mode={mode} demoOrderId={selectedOrderId ?? "ORD-78214"} />
              <WalletView mode={mode} onRequireAuth={guardWalletAction} />
            </div>
          )}
          {nav === "ORDERS" && (
            <OrdersView
              mode={mode}
              selectedOrderId={selectedOrderId}
              activeVerificationJobId={activeVerificationJobId}
              onSelectOrder={setSelectedOrderId}
              onOpenChat={(id) => {
                setSelectedOrderId(id);
                setNav("CHAT");
              }}
              onOpenVerify={() => setNav("VERIFY")}
              onBuyOrder={openBuyApi}
              onRequestPrePurchase={(orderId) => {
                setPrePurchaseOrderId(orderId);
                setPrePurchaseOpen(true);
              }}
            />
          )}
          {nav === "CHAT" && (
            <ChatView
              mode={mode}
              buySource={buySource}
              activeOrderId={selectedOrderId ?? "ORD-78214"}
              onRotationJobStarted={(jobId) => {
                setActiveVerificationJobId(jobId);
                setNav("VERIFY");
              }}
            />
          )}
          {nav === "REPUTATION" && (
            <ReputationView
              mode={mode}
              score={reputation.score}
              live={reputation.live}
              effectiveTimezone={terminalTimezone.effectiveTimezone}
            />
          )}
          {nav === "ANALYTICS" && <AnalyticsView mode={mode} />}
          </div>
        </main>
      </motion.div>
      <BottomBar nav={nav} mode={mode} />
      <AnimatePresence>
        {transitionMode && (
          <RoleTransitionOverlay
            key={transitionMode}
            role={transitionMode}
            onComplete={completeModeTransition}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {tourOpen && !transitionMode && (
          <UserTour
            open={tourOpen}
            stepIndex={tourStep}
            onStepChange={setTourStep}
            onComplete={finishTour}
            onSkip={finishTour}
          />
        )}
      </AnimatePresence>
      <ListApiModal
        open={listApiOpen}
        onClose={() => setListApiOpen(false)}
        onSubmitted={(jobId, listingId) => {
          setActiveVerificationJobId(jobId);
          setActiveListingId(listingId);
          setNav("VERIFY");
        }}
      />
      <BuybackVerifyModal
        open={buybackOpen}
        onClose={() => setBuybackOpen(false)}
        offer={buybackOffers.find((o) => o.id === buybackOfferId) ?? buybackOffers[0]}
        onConfirmed={(orderId) => {
          setSelectedOrderId(orderId);
          setNav("ORDERS");
          setBuybackOpen(false);
        }}
      />
      <PrePurchaseVerifyModal
        open={prePurchaseOpen}
        onClose={() => setPrePurchaseOpen(false)}
        orderId={prePurchaseOrderId ?? selectedOrderId ?? "ORD-78214"}
        onSubmitted={(jobId) => {
          setActiveVerificationJobId(jobId);
          setPrePurchaseOpen(false);
        }}
      />
      <BuyApiModal
        open={buyApiOpen}
        onClose={() => setBuyApiOpen(false)}
        asset={active}
        onPurchased={(orderId) => {
          setSelectedOrderId(orderId);
          setNav("ORDERS");
        }}
      />
      <AuthPromptToast />
    </div>
  );
}

/* ---------------- status strip ---------------- */

function StatusStrip() {
  const [items, setItems] = useState([
    { k: "TVL ESCROWED", v: "$48.21M", d: "+1.84%" },
    { k: "24H VOLUME", v: "$12.04M", d: "+4.12%" },
    { k: "ACTIVE ASSETS", v: "1,284", d: "+12" },
    { k: "VERIFY THROUGHPUT", v: "421/s", d: "+0.4%" },
    { k: "PROOF SUCCESS", v: "99.41%", d: "-0.02%" },
    { k: "OPEN ORDERS", v: "8,742", d: "+118" },
    { k: "MEDIAN LATENCY", v: "84ms", d: "-3ms" },
    { k: "DISPUTE RATIO", v: "0.21%", d: "-0.04%" },
  ]);

  useEffect(() => {
    void fetchMetricsHealth().then((m) => {
      if (!m) return;
      setItems([
        { k: "QUEUE DEPTH", v: String(m.queue_depth), d: "live" },
        { k: "JOBS TOTAL", v: String(m.jobs_total), d: "API" },
        { k: "PROOF SUCCESS", v: `${m.success_rate.toFixed(1)}%`, d: "API" },
        { k: "MONITOR LIVE", v: String(m.monitor_live), d: "API" },
        { k: "MONITOR STALE", v: String(m.monitor_stale), d: "API" },
        { k: "AVG BURN", v: `${m.avg_tokens_used} tok`, d: "API" },
        { k: "P50 LATENCY", v: `${m.p50_duration_ms ?? "—"}ms`, d: "API" },
        { k: "SLO <60s", v: `${m.slo_standard_under_60s_pct ?? "—"}%`, d: "API" },
      ]);
    });
  }, []);
  return (
    <div data-tour="status-strip">
      <TokentaScrollArea
        className="tokenta-status-strip tokenta-type-status shrink-0"
        orientation="horizontal"
        ariaLabel="Live network metrics"
      >
        <div className="flex items-center gap-2 text-white/60 tracking-[0.2em] shrink-0">
          <Pulse /> LIVE
        </div>
        {items.map((i) => (
          <div key={i.k} className="flex items-baseline gap-2 whitespace-nowrap shrink-0">
            <span className="text-white/40 tracking-[0.18em]">{i.k}</span>
            <span className="text-white">{i.v}</span>
            <span className="text-white/40">{i.d}</span>
          </div>
        ))}
      </TokentaScrollArea>
    </div>
  );
}

/* ---------------- MARKET ---------------- */

function MarketView({
  mode,
  buySource,
  sellTab,
  listings,
  onBuySourceChange,
  onSellTabChange,
  onSellToTokenta,
  active,
  setSelectedAsset,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  onListApi,
  onBuyApi,
}: {
  mode: TradingMode;
  buySource: BuyMarketSource;
  sellTab: SellMarketTab;
  listings: EnhancedListing[];
  active: EnhancedListing;
  setSelectedAsset: (id: string) => void;
  filters: MarketFilters;
  onFiltersChange: (f: MarketFilters) => void;
  sort: MarketSortKey;
  onSortChange: (s: MarketSortKey) => void;
  onBuySourceChange: (s: BuyMarketSource) => void;
  onSellTabChange: (t: SellMarketTab) => void;
  onSellToTokenta: () => void;
  onListApi: () => void;
  onBuyApi: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EnhancedMarketPanel
        mode={mode}
        buySource={buySource}
        sellTab={sellTab}
        listings={listings}
        active={active}
        setSelectedAsset={setSelectedAsset}
        filters={filters}
        onFiltersChange={onFiltersChange}
        sort={sort}
        onSortChange={onSortChange}
        onBuySourceChange={onBuySourceChange}
        onSellTabChange={onSellTabChange}
        onSellToTokenta={onSellToTokenta}
        onListApi={onListApi}
        onBuyApi={onBuyApi}
      />
      {mode === "SELL" && (
        <div className="border-t border-white/15 min-h-0 max-h-[40vh] overflow-auto">
          <InventoryView onCreateListing={onListApi} />
        </div>
      )}
      <div className="h-56 min-h-0 grid grid-cols-12 border-t border-white/15">
        <div className="col-span-8 border-r border-white/15">
          <OrderBookPanel />
        </div>
        <div className="col-span-4">
          <Panel title="Detail · Trade" code="F1.2" className="border-0 h-full">
            <TradePanel mode={mode} active={active} onBuyApi={onBuyApi} onListApi={onListApi} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TradePanel({
  mode,
  active,
  onBuyApi,
  onListApi,
}: {
  mode: TradingMode;
  active: typeof assets[0];
  onBuyApi?: () => void;
  onListApi?: () => void;
}) {
  const isBuy = mode === "BUY";
  const isTokentaAlloc = false /* removed platform mode */;
  return (
    <div className="border-t border-white/15 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] tracking-[0.2em] text-white/40">
        <span>{isTokentaAlloc ? "ALLOCATE · PLATFORM INVENTORY" : isBuy ? "BID · CREATE ESCROW ORDER" : "ASK · POST OFFER"}</span>
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> NON-CUSTODIAL</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="QUANTITY" value="2,400" suffix={active.unit} />
        <Field label="LIMIT" value={active.price} suffix="USDC" />
        <Field label="DURATION" value="24H" />
        <Field label="VERIFY MODE" value={active.verified} />
      </div>
      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
        <span className="text-white/40">EST. TOTAL</span>
        <span className="tabular-nums">100.80 USDC</span>
      </div>
      <button
        type="button"
        onClick={isBuy ? onBuyApi : onListApi}
        className="w-full border border-white bg-white py-2 tracking-[0.24em] text-black hover:bg-white/90"
      >
        {isTokentaAlloc ? "ALLOCATE TO ORDER · ISSUE PROXY KEY" : isBuy ? "BUY VERIFIED API · LOCK ESCROW" : "LIST API · START VERIFY"}
      </button>
      <div className="text-[10px] text-white/40 tracking-[0.14em] flex items-center gap-1">
        <Zap className="w-3 h-3" /> SETTLES ON FINAL VERIFY · GAS ESTIMATE 0.0021 ETH
      </div>
    </div>
  );
}

function Field({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="border border-white/20 px-2 py-1.5">
      <div className="text-[9px] tracking-[0.2em] text-white/40">{label}</div>
      <div className="flex items-baseline justify-between">
        <span className="tabular-nums">{value}</span>
        {suffix && <span className="text-[10px] text-white/40">{suffix}</span>}
      </div>
    </div>
  );
}

function OrderBookPanel() {
  return (
    <Panel title="Order Book · GPT4-CMP" code="F1.3" right={<span>SPREAD 0.0002 · 0.48%</span>} className="border-0 h-full">
      <div className="grid grid-cols-2 h-full">
        <div className="border-r border-white/10">
          <Header cols={["PRICE", "SIZE", "TOTAL"]} tone="up" label="BIDS" />
          {orderBook.bids.map((b, i) => (
            <Row key={i} cols={[b.price, b.size, b.total]} barPct={parseFloat(b.total) / 4} side="bid" />
          ))}
        </div>
        <div>
          <Header cols={["PRICE", "SIZE", "TOTAL"]} tone="down" label="ASKS" />
          {orderBook.asks.map((a, i) => (
            <Row key={i} cols={[a.price, a.size, a.total]} barPct={parseFloat(a.total) / 4} side="ask" />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Header({ cols, label }: { cols: string[]; tone: string; label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/15 px-3 py-1 text-[10px] tracking-[0.18em] text-white/40">
      <span>{label}</span>
      <span className="flex gap-6">
        {cols.map((c) => <span key={c}>{c}</span>)}
      </span>
    </div>
  );
}

function Row({ cols, barPct, side }: { cols: string[]; barPct: number; side: "bid" | "ask" }) {
  return (
    <div className="relative grid grid-cols-3 px-3 py-1 text-[11px] border-b border-white/5 tabular-nums">
      <div
        className={`absolute inset-y-0 ${side === "bid" ? "right-0" : "left-0"} bg-white/10`}
        style={{ width: `${Math.min(barPct * 20, 100)}%` }}
      />
      {cols.map((c, i) => (
        <span key={i} className={`relative ${i === 0 ? "" : "text-right"}`}>{c}</span>
      ))}
    </div>
  );
}

function VerifyStreamCompact() {
  return (
    <ul className="text-[11px]">
      {verifyFeed.slice(0, 8).map((v, i) => (
        <li key={i} className="px-3 py-1.5 border-b border-white/5 flex items-center gap-2">
          <span className="text-white/40 tabular-nums">{v.ts}</span>
          <span className="tracking-[0.1em]">{v.asset}</span>
          <span className="text-white/50">{v.step}</span>
          <span className="ml-auto"><Tag tone={v.result === "PASS" ? "default" : "warn"}>{v.result}</Tag></span>
          <span className="text-white/40 w-14 text-right">{v.latency}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- VERIFY ---------------- */


function EscrowView({ mode, demoOrderId }: { mode: TradingMode; demoOrderId: string }) {
  const scenario = mode === "BUY" ? "TOKENTA_AS_SELLER" : "P2P";
  const order = orders.find((o) => o.id === demoOrderId) ?? orders[0];
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null);
  const [escrowError, setEscrowError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [walletSummary, setWalletSummary] = useState<WalletSummaryResponse | null>(null);
  const [settlementDryRun, setSettlementDryRun] = useState(true);

  useEffect(() => {
    void fetchTerminalWalletSummary().then(setWalletSummary);
    void fetchTerminalNetwork().then((n) => {
      if (n) setSettlementDryRun(n.dryRun);
    });
  }, [escrowStatus]);

  const handleFund = async () => {
    setBusy(true);
    setEscrowError(null);
    try {
      const amount = order.value.replace(/,/g, "");
      const sig = await signEscrowPayloadDev({
        orderId: order.id,
        amountUsdc: amount,
        action: "fund",
      });
      const res = await fundOrderEscrow(order.id, amount, sig?.signature);
      if (!res) throw new Error("Escrow fund API unavailable");
      setEscrowStatus(res.escrow.status);
    } catch (e) {
      setEscrowError(e instanceof Error ? e.message : "Fund failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 p-4 gap-4">
      <div className="text-[10px] tracking-[0.22em] text-white/40">
        F3 · ESCROW STATUS · BASE SEPOLIA {settlementDryRun ? "· DRY-RUN" : "· LIVE ANCHOR"}
      </div>
      <DepositBreakdownPanel totalUsdc={100.8} scenario={scenario} />
      {walletSummary && (
        <div className="border border-white/20 p-3 text-[11px] max-w-3xl">
          <div className="text-[10px] tracking-[0.18em] text-white/40 mb-2">
            WALLET SUMMARY · {walletSummary.network.toUpperCase()} · API
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/10">
            {walletSummary.balances.slice(0, 2).map((b) => (
              <div key={b.asset} className="bg-black px-3 py-2 flex justify-between">
                <span className="text-white/40">{b.asset}</span>
                <span className="tabular-nums">
                  {b.available} avail · {b.escrowed} escrow
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-white/55 max-w-xl">
        Counterparty-aware escrow: P2P locks bilateral deposits; Tokenta Direct waives buyer deposit; Tokenta Buyback holds seller deposit 30 days.
      </p>
      <div className="border border-white/20 p-3 text-[11px] space-y-2 max-w-md">
        <div className="text-[10px] tracking-[0.18em] text-white/40">ORDER {order.id}</div>
        <div>Value: {order.value} USDC · Escrow: {escrowStatus ?? order.escrow}</div>
        {escrowError && <p className="text-red-400">{escrowError}</p>}
        <div className="flex flex-wrap gap-2">
          {order.escrow === "PENDING" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleFund()}
              className="border border-white bg-white px-3 py-1.5 text-[10px] tracking-[0.2em] text-black disabled:opacity-40"
            >
              {busy ? "FUNDING…" : "FUND ESCROW (API)"}
            </button>
          )}
          {escrowStatus === "FUNDED" && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setEscrowError(null);
                try {
                  const amount = order.value.replace(/,/g, "");
                  const sig = await signEscrowPayloadDev({
                    orderId: order.id,
                    amountUsdc: amount,
                    action: "release",
                  });
                  const res = await releaseOrderEscrow(order.id, amount, sig?.signature);
                  if (!res) throw new Error("Escrow release failed");
                  setEscrowStatus(res.escrow.status);
                } catch (e) {
                  setEscrowError(e instanceof Error ? e.message : "Release failed");
                } finally {
                  setBusy(false);
                }
              }}
              className="border border-white/40 px-3 py-1.5 text-[10px] tracking-[0.2em] hover:bg-white/10 disabled:opacity-40"
            >
              {busy ? "RELEASING…" : "RELEASE ESCROW (API)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifyView({
  mode,
  activeJobId,
  activeListingId,
}: {
  mode: TradingMode;
  activeJobId: string | null;
  activeListingId: string | null;
}) {
  const [liveFeed, setLiveFeed] = useState<VerifyFeedRow[]>([]);
  const [feedConnected, setFeedConnected] = useState(false);
  const [metrics, setMetrics] = useState<{
    queue_depth: number;
    success_rate: number;
    monitor_stale: number;
    avg_tokens_used: number;
    p50_duration_ms?: number;
    slo_standard_under_60s_pct?: number;
  } | null>(null);
  const [composition, setComposition] = useState<
    { label: string; pct: number; throughputPerSec: number }[] | null
  >(null);
  const [compositionLive, setCompositionLive] = useState(false);

  useEffect(() => {
    const loadMetrics = () => void fetchMetricsHealth().then(setMetrics);
    const loadComposition = () =>
      void fetchProofComposition().then((c) => {
        if (c?.rows?.length) {
          setCompositionLive(true);
          setComposition(
            c.rows.map((r) => ({
              label: r.label,
              pct: r.pct,
              throughputPerSec: r.throughputPerSec,
            })),
          );
        } else {
          setCompositionLive(false);
        }
      });
    loadMetrics();
    loadComposition();
    const mid = setInterval(() => {
      loadMetrics();
      loadComposition();
    }, 8000);
    return () => clearInterval(mid);
  }, [activeJobId]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchVerifyFeed()
        .then((rows) => {
          if (cancelled) return;
          setFeedConnected(true);
          setLiveFeed(rows);
        })
        .catch(() => {
          if (!cancelled) setFeedConnected(false);
        });
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [activeJobId]);

  const tableRows = useMemo(
    () => (feedConnected ? liveFeed : verifyFeed),
    [feedConnected, liveFeed],
  );
  const feedLabel = feedConnected ? (liveFeed.length > 0 ? "LIVE" : "EMPTY") : "OFFLINE";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <VerificationModeBanner method="DIRECT_KEY_TEST" />
      {activeJobId && (
        <div className="border-b border-white/15 px-4 py-2">
          <VerificationJobPanel jobId={activeJobId} listingId={activeListingId} />
        </div>
      )}
      {false /* removed platform mode */ && (
        <div className="border-b border-white/15 px-4 py-2 text-[10px] tracking-[0.18em] text-white/50">Platform inventory: continuous 24h verification timeline active</div>
      )}
    <div className="flex-1 grid grid-cols-12 min-h-0">
      <div className="col-span-8 border-r border-white/15">
        <Panel title="Verification Pipeline · Real-Time" code="F2.1" right={<span className="flex items-center gap-1"><Pulse /> {feedLabel}</span>}>
          <table className="w-full text-[11px]">
            <thead className="text-white/40 border-b border-white/15 sticky top-0 bg-black">
              <tr>{["TIMESTAMP","ASSET","STEP","ATTEST HASH","RESULT","LATENCY"].map(h => <th key={h} className="px-3 py-1.5 text-left tracking-[0.14em] font-normal">{h}</th>)}</tr>
            </thead>
            <tbody>
              {tableRows.length === 0 && feedConnected && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-white/40 tracking-[0.12em]">
                    No verification events yet — run LIST API or wait for network jobs.
                  </td>
                </tr>
              )}
              {tableRows.map((v, i) => (
                <tr key={`${"jobId" in v ? (v as VerifyFeedRow).jobId : i}-${v.ts}`} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-1.5 tabular-nums text-white/60">{v.ts}</td>
                  <td className="px-3 py-1.5 tracking-[0.1em]">{v.asset}</td>
                  <td className="px-3 py-1.5"><Tag tone="mute">{v.step}</Tag></td>
                  <td className="px-3 py-1.5 text-white/60">{v.hash}</td>
                  <td className="px-3 py-1.5"><Tag tone={v.result === "PASS" ? "default" : "warn"}>{v.result}</Tag></td>
                  <td className="px-3 py-1.5 tabular-nums text-white/70">{v.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <div className="col-span-4 flex flex-col">
        <Panel title="Proof Composition" code="F2.2" right={<span className="text-white/40">{compositionLive ? "API" : "MOCK"}</span>}>
          <div className="p-4 space-y-3">
            {(compositionLive && composition
              ? composition
              : [
                  { label: "ZK-PROOF (Compute)", pct: 62, throughputPerSec: 262 },
                  { label: "TEE Attestation", pct: 24, throughputPerSec: 101 },
                  { label: "Signature Chain", pct: 11, throughputPerSec: 44 },
                  { label: "Quota Check", pct: 3, throughputPerSec: 14 },
                ]
            ).map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/60">{b.label}</span>
                  <span>{b.throughputPerSec}/s</span>
                </div>
                <div className="h-1 bg-white/10 mt-1">
                  <div className="h-full bg-white" style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Pipeline Health" code="F2.3" className="border-t-0" right={<span className="text-white/40">{metrics ? "API" : "MOCK"}</span>}>
          <div className="grid grid-cols-2 gap-px bg-white/10 text-[11px]">
            {[
              ["SUCCESS RATE", metrics ? `${metrics.success_rate.toFixed(1)}%` : "99.41%"],
              ["QUEUE DEPTH", metrics ? String(metrics.queue_depth) : "42"],
              ["P50 LATENCY", metrics && "p50_duration_ms" in metrics ? `${metrics.p50_duration_ms}ms` : "61ms"],
              ["SLO under 60s", metrics && "slo_standard_under_60s_pct" in metrics ? `${metrics.slo_standard_under_60s_pct}%` : "99%"],
              ["MONITOR STALE", metrics ? String(metrics.monitor_stale) : "0"],
              ["AVG BURN", metrics ? `${metrics.avg_tokens_used} tok` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="bg-black px-3 py-2 flex justify-between">
                <span className="text-white/40 tracking-[0.14em]">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
    </div>
  );
}

/* ---------------- ORDERS ---------------- */

function OrdersView({
  mode,
  selectedOrderId,
  activeVerificationJobId,
  onSelectOrder,
  onOpenChat,
  onOpenVerify,
  onBuyOrder,
  onRequestPrePurchase,
}: {
  mode: TradingMode;
  selectedOrderId: string | null;
  activeVerificationJobId: string | null;
  onSelectOrder: (id: string | null) => void;
  onOpenChat: (id: string) => void;
  onOpenVerify: () => void;
  onBuyOrder: () => void;
  onRequestPrePurchase: (orderId: string) => void;
}) {
  if (selectedOrderId) {
    return (
      <OrderDetailView
        orderId={selectedOrderId}
        mode={mode}
        activeJobId={activeVerificationJobId}
        onBack={() => onSelectOrder(null)}
        onOpenChat={() => onOpenChat(selectedOrderId)}
        onOpenVerify={onOpenVerify}
        onBuyAgain={onBuyOrder}
        onRequestPrePurchase={() => onRequestPrePurchase(selectedOrderId)}
      />
    );
  }

  const [apiOrders, setApiOrders] = useState<TerminalOrderRow[]>([]);

  useEffect(() => {
    void fetchTerminalOrders().then(setApiOrders);
  }, []);

  const apiAsDisplay = apiOrders.map((o) => ({
    id: o.orderId,
    side: "BUY" as const,
    asset: `LST-${o.listingId.slice(-6).toUpperCase()}`,
    qty: String(o.quantity),
    price: o.amountUsdc,
    value: o.amountUsdc,
    escrow: o.status === "ESCROW_FUNDED" ? "FUNDED" : o.status === "SETTLED" ? "RELEASED" : "PENDING",
    status: o.status === "PENDING_ESCROW" ? "MATCHING" : "VERIFYING",
    counterparty: o.buyerWallet ? `${o.buyerWallet.slice(0, 6)}…` : "—",
  }));

  const merged = [...apiAsDisplay, ...orders];
  const filtered = merged.filter((o) => (mode === "BUY" ? o.side === "BUY" : o.side === "SELL")).concat(
    merged.filter((o) => (mode === "BUY" ? o.side !== "BUY" : o.side !== "SELL"))
  );
  return (
    <div className="flex-1 grid grid-cols-12 min-h-0">
      <div className="col-span-9 border-r border-white/15">
        <Panel title={`Trade Desk · ${mode}`} code="F4.1" right={<span>SHOWING {filtered.length} · API+MOCK</span>}>
          <table className="w-full text-[11px]">
            <thead className="text-white/40 border-b border-white/15">
              <tr>{["ORDER ID","SIDE","ASSET","QTY","PRICE","VALUE","ESCROW","STATUS","COUNTERPARTY",""].map(h => <th key={h} className="px-3 py-1.5 text-left tracking-[0.14em] font-normal">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => onSelectOrder(o.id)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                >
                  <td className="px-3 py-2 tracking-[0.1em] underline decoration-white/30">{o.id}</td>
                  <td className="px-3 py-2"><Tag tone={o.side === "BUY" ? "default" : "warn"}>{o.side}</Tag></td>
                  <td className="px-3 py-2">{o.asset}</td>
                  <td className="px-3 py-2 tabular-nums">{o.qty}</td>
                  <td className="px-3 py-2 tabular-nums">{o.price}</td>
                  <td className="px-3 py-2 tabular-nums">{o.value}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      {o.escrow === "RELEASED" ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {o.escrow}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Tag tone={o.status === "DISPUTED" ? "warn" : o.status === "SETTLED" ? "mute" : "default"}>{o.status}</Tag>
                  </td>
                  <td className="px-3 py-2 text-white/60">{o.counterparty}</td>
                  <td className="px-3 py-2"><ChevronRight className="w-3.5 h-3.5" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <div className="col-span-3 flex flex-col">
        <Panel title="Escrow & Deposits" code="F3.2">
          <div className="p-3 border-b border-white/15">
            <DepositBreakdownPanel totalUsdc={100.8} scenario="P2P" />
          </div>
          <div className="grid grid-cols-1 gap-px bg-white/10 text-[11px]">
            {[
              ["LOCKED USDC","247.00"],["IN VERIFY","100.80"],["DELIVERING","46.44"],["DISPUTED","4.96"],["RELEASED 24H","312.85"],
            ].map(([k,v]) => (
              <div key={k} className="bg-black px-3 py-2 flex justify-between"><span className="text-white/40 tracking-[0.14em]">{k}</span><span className="tabular-nums">{v}</span></div>
            ))}
          </div>
        </Panel>
        <Panel title="Lifecycle · ORD-78214" code="F3.3" className="border-t-0 flex-1">
          <ol className="p-3 space-y-3 text-[11px]">
            {[
              ["ORDER CREATED","16:38:02","DONE"],
              ["ESCROW FUNDED","16:38:14","DONE"],
              ["VERIFY STEP 1/3","16:41:18","DONE"],
              ["VERIFY STEP 2/3","16:42:18","DONE"],
              ["VERIFY STEP 3/3","—","ACTIVE"],
              ["DELIVERY","—","PENDING"],
              ["SETTLEMENT","—","PENDING"],
            ].map(([k,t,s],i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={`w-2 h-2 ${s === "DONE" ? "bg-white" : s === "ACTIVE" ? "bg-white animate-pulse" : "border border-white/30"}`} />
                <span className="flex-1 tracking-[0.1em]">{k}</span>
                <span className="text-white/50 tabular-nums">{t}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- CHAT ---------------- */

function ChatView({
  mode,
  buySource,
  activeOrderId,
  onRotationJobStarted,
}: {
  mode: TradingMode;
  buySource: BuyMarketSource;
  activeOrderId: string;
  onRotationJobStarted?: (jobId: string) => void;
}) {
  const { requireAuth } = useAuth();
  const order = orders.find((o) => o.id === activeOrderId);
  const [orderMessages, setOrderMessages] = useState<
    { ts: string; from: string; body: string }[]
  >([]);
  const [messageInput, setMessageInput] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      void fetchOrderRoomMessages(activeOrderId).then((rows) => {
        if (cancelled) return;
        if (!rows.length) {
          setOrderMessages([]);
          return;
        }
        setOrderMessages(
          rows.map((r) => ({
            ts: r.ts.slice(11, 19),
            from: r.from,
            body: r.body,
          })),
        );
      });
    load();
    const timer = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeOrderId]);

  const isTokentaDirect =
    buySource === "TOKENTA_DIRECT" ||
    order?.transactionType === "TOKENTA_DIRECT_PURCHASE" ||
    order?.transactionType === "TOKENTA_BUYBACK_SALE";
  if (isTokentaDirect) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-[11px] tracking-[0.16em] text-white/50">
        Order Room is for P2P trades only. Tokenta Direct and buyback flows do not use per-order chat.
      </div>
    );
  }
  const renderMessages = orderMessages.length
    ? orderMessages
    : [
        { ts: "16:40:12", from: "SYSTEM", body: "Order room started. Waiting for the first message." },
      ];

  const runAction = async (
    action: "run-reverify" | "attach-attestation" | "escalate-dispute" | "accept-delivery" | "release-escrow",
    payload?: Record<string, unknown>,
  ) => {
    if (!requireAuth("Running order room action")) return;
    setActionBusy(true);
    setActionNotice(null);
    const res = await runOrderRoomAction(activeOrderId, action, payload);
    setActionBusy(false);
    if (!res) {
      setActionNotice("Order action API unavailable");
      return;
    }
    if (!res.ok) {
      setActionNotice(res.error ?? "Action failed");
      return;
    }
    if (res.jobId) onRotationJobStarted?.(res.jobId);
    setActionNotice(`Action '${action}' submitted`);
    const refreshed = await fetchOrderRoomMessages(activeOrderId);
    if (refreshed.length) {
      setOrderMessages(
        refreshed.map((r) => ({
          ts: r.ts.slice(11, 19),
          from: r.from,
          body: r.body,
        })),
      );
    }
  };

  return (
    <div className="flex-1 flex min-h-0 flex-col">
      <div className="border-b border-white/15 px-4 py-2 text-[11px] text-white/50">
        Order Room: encrypted P2P chat. Key rotation templates auto-post for rotation-required orders.
      </div>
    <div className="flex-1 grid grid-cols-12 min-h-0">
      <div className="col-span-3 border-r border-white/15">
        <Panel title="Order Rooms" code="F4.1">
          <ul className="text-[11px]">
            {orders.slice(0, 6).map((o, i) => (
              <li key={o.id} className={`px-3 py-2 border-b border-white/10 flex items-center gap-2 ${i === 0 ? "bg-white/10" : "hover:bg-white/5"}`}>
                <Dot className="w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <div className="tracking-[0.1em]">{o.id} · {o.asset}</div>
                  <div className="text-white/40 truncate">{o.counterparty} · {o.status}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="col-span-6 border-r border-white/15 flex flex-col">
        <Panel title={`${activeOrderId} · GPT4-CMP`} code="F4.2" right={<span className="flex items-center gap-1"><Pulse /> ENCRYPTED</span>} className="flex-1">
          <ul className="p-3 space-y-2 text-[11px]">
            {renderMessages.map((m, i) => (
              <li key={i} className={`flex gap-3 ${m.from === "YOU" ? "justify-end" : ""}`}>
                {m.from !== "YOU" && <span className="text-white/40 tabular-nums w-20">{m.ts}</span>}
                <div className={`max-w-[70%] px-2 py-1.5 border ${m.from === "SYSTEM" ? "border-white/20 text-white/60 bg-white/[0.03]" : m.from === "YOU" ? "border-white bg-white text-black" : "border-white/30"}`}>
                  <div className={`text-[9px] tracking-[0.22em] mb-0.5 ${m.from === "YOU" ? "text-black/50" : "text-white/40"}`}>{m.from}</div>
                  <div>{m.body}</div>
                </div>
                {m.from === "YOU" && <span className="text-white/40 tabular-nums w-20 text-right">{m.ts}</span>}
              </li>
            ))}
          </ul>
        </Panel>
        <div className="border-t border-white/15 p-2 flex items-center gap-2">
          <input
            placeholder="MESSAGE · /attach proof · /dispute"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1 bg-black border border-white/20 px-3 py-2 text-[12px] outline-none focus:border-white tracking-[0.04em]"
          />
          <button
            type="button"
            onClick={async () => {
              if (!requireAuth("Sending order room messages")) return;
              const text = messageInput.trim();
              if (!text) return;
              const sent = await postOrderRoomMessage(activeOrderId, text);
              if (!sent) {
                setActionNotice("Message send failed");
                return;
              }
              setOrderMessages((prev) => [
                ...prev,
                { ts: sent.ts.slice(11, 19), from: sent.from, body: sent.body },
              ]);
              setMessageInput("");
            }}
            className="px-4 py-2 bg-white text-black tracking-[0.2em] flex items-center gap-2 hover:bg-white/90"
          >
            <Send className="w-3 h-3" /> SEND
          </button>
        </div>
      </div>
      <div className="col-span-3 flex flex-col">
        <Panel title="Order Context" code="F4.3">
          <div className="grid grid-cols-1 gap-px bg-white/10 text-[11px]">
            {[["ASSET","GPT4-CMP"],["QTY","2,400 TFLOP-h"],["VALUE","100.80 USDC"],["ESCROW","FUNDED"],["VERIFY","2/3 PASS"],["DEADLINE","24h"]].map(([k,v]) => (
              <div key={k} className="bg-black px-3 py-2 flex justify-between"><span className="text-white/40 tracking-[0.14em]">{k}</span><span>{v}</span></div>
            ))}
          </div>
        </Panel>
        <Panel title="Key Rotation" code="F4.4" className="border-t-0">
          <div className="p-3 space-y-2">
            <ol className="list-decimal list-inside text-[10px] text-white/60 space-y-1">
              {rotationGuide.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <KeyRotationPanel
              role={mode === "SELL" ? "seller" : "buyer"}
              orderId={activeOrderId}
              onJobStarted={onRotationJobStarted}
            />
          </div>
        </Panel>
        <Panel title="Actions" code="F4.5" className="border-t-0 flex-1">
          <div className="p-3 space-y-2 text-[11px]">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void runAction("run-reverify")}
              className="w-full border border-white/30 px-3 py-2 text-left tracking-[0.14em] hover:bg-white hover:text-black flex items-center justify-between disabled:opacity-40"
            >
              REQUEST RE-VERIFY <ArrowLeftRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void runAction("attach-attestation", { note: "Attestation uploaded from terminal panel." })}
              className="w-full border border-white/30 px-3 py-2 text-left tracking-[0.14em] hover:bg-white hover:text-black flex items-center justify-between disabled:opacity-40"
            >
              ATTACH ATTESTATION <ArrowLeftRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void runAction("escalate-dispute")}
              className="w-full border border-white/30 px-3 py-2 text-left tracking-[0.14em] hover:bg-white hover:text-black flex items-center justify-between disabled:opacity-40"
            >
              ESCALATE TO DISPUTE <ArrowLeftRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void runAction("accept-delivery")}
              className="w-full border border-white/30 px-3 py-2 text-left tracking-[0.14em] hover:bg-white hover:text-black flex items-center justify-between disabled:opacity-40"
            >
              ACCEPT DELIVERY <ArrowLeftRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() =>
                void runAction("release-escrow", {
                  amountUsdc: order?.value?.replace(/,/g, "") ?? "0.00",
                })
              }
              className="w-full border border-white/30 px-3 py-2 text-left tracking-[0.14em] hover:bg-white hover:text-black flex items-center justify-between disabled:opacity-40"
            >
              RELEASE ESCROW <ArrowLeftRight className="w-3 h-3" />
            </button>
            {actionNotice && <p className="text-[10px] text-white/60 border border-white/15 px-2 py-1">{actionNotice}</p>}
          </div>
        </Panel>
      </div>
    </div>
    </div>
  );
}

/* ---------------- REPUTATION ---------------- */

function ReputationView({
  mode: _mode,
  score,
  live,
  effectiveTimezone,
}: {
  mode: TradingMode;
  score: ReputationScoreResponse | null;
  live: boolean;
  effectiveTimezone: string;
}) {
  const [ledger, setLedger] = useState<ReputationLedgerRow[]>([]);

  useEffect(() => {
    const loadLedger = () => void fetchTerminalReputationLedger().then(setLedger);
    loadLedger();
    const t = setInterval(loadLedger, 10000);
    return () => clearInterval(t);
  }, []);

  const isUnverified = (score?.status ?? "UNVERIFIED") === "UNVERIFIED";
  const compositeDisplay = score?.compositeDisplay ?? (live ? "--" : "PENDING");
  const factors = score?.factors ?? [];

  return (
    <div className="flex-1 grid grid-cols-12 min-h-0">
      <div className="col-span-3 border-r border-white/15 flex flex-col">
        <div className="border-b border-white/15 p-2">
          <TrustLayerStatusPanel
            status={score?.status}
            tier={score?.tier}
            confidence={score?.confidence}
            verifiedRuns={score?.executionHistory?.verifiedRuns}
            anchoredReceipts={score?.executionHistory?.anchoredReceipts}
            nextMilestone={score?.nextMilestone}
            live={live}
          />
        </div>
        <Panel title="Trust Vector · Proof-Weighted" code="F5.1" right={<span className="text-white/40">{live ? "API" : "MOCK"}</span>}>
          <div className="p-6 space-y-4">
            <div>
              <div className="text-[10px] tracking-[0.22em] text-white/40">COMPOSITE</div>
              <div className="text-[56px] leading-none tabular-nums tracking-tighter">
                {compositeDisplay}
              </div>
              <div className="text-white/40">
                {isUnverified
                  ? "PENDING · unlock after 3 verifications + 1 anchor"
                  : `of 100 · TIER ${score?.tier ?? "C"} · ${score?.percentileLabel ?? ""}`}
              </div>
              {!isUnverified && score?.confidence && (
                <div className="text-[10px] tracking-[0.18em] text-white/50 mt-2">
                  CONFIDENCE {score.confidence} ({score.confidenceScore})
                </div>
              )}
            </div>
            {isUnverified ? (
              <p className="text-[11px] text-white/50 leading-relaxed">
                Reputation is derived from verifiable execution events, not reviews. Complete anchored
                verifications to reveal your trust vector.
              </p>
            ) : (
              <div className="space-y-2">
                {factors.map((f) => (
                  <div key={f.key}>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/60" title={f.label}>
                        {f.key}
                      </span>
                      <span className="tabular-nums text-white/40">{f.weightPct}%</span>
                      <span className="tabular-nums">{f.score ?? "--"}</span>
                    </div>
                    <div className="h-1 bg-white/10 mt-1">
                      <div
                        className="h-full bg-white"
                        style={{ width: `${f.score ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {score?.compliance && (
              <div className="pt-2 border-t border-white/10 text-[10px] text-white/50 space-y-1">
                {score.compliance.positiveFactors.slice(0, 2).map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
      <div className="col-span-8 flex flex-col">
        <Panel title="Reputation Ledger · Append-Only" code="F5.2" right={<span>{live ? "API · REPLAY" : "MOCK"}</span>}>
          <table className="w-full text-[11px]">
            <thead className="text-white/40 border-b border-white/15">
              <tr>{["TIME","ACTOR","EVENT","DELTA","SCORE"].map(h => <th key={h} className="px-3 py-1.5 text-left tracking-[0.14em] font-normal">{h}</th>)}</tr>
            </thead>
            <tbody>
              {ledger.map((r, i) => (
                <tr key={`${r.occurredAt ?? r.ts}-${r.actor}-${i}`} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-1.5 tabular-nums text-white/60">
                    {formatTerminalTimestamp(r.occurredAt ?? r.ts, effectiveTimezone)}
                  </td>
                  <td className="px-3 py-1.5 tracking-[0.1em]">{r.actor}</td>
                  <td className="px-3 py-1.5"><Tag tone={r.delta.startsWith("-") ? "warn" : "mute"}>{r.event}</Tag></td>
                  <td className="px-3 py-1.5 tabular-nums">{r.delta}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.score}</td>
                </tr>
              ))}
              {!ledger.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-white/40">
                    No reputation events yet. Run your first verification.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- WALLET ---------------- */

function WalletView({
  mode,
  onRequireAuth,
}: {
  mode: TradingMode;
  onRequireAuth: (label: string) => boolean;
}) {
  const [summary, setSummary] = useState<WalletSummaryResponse | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    void fetchTerminalWalletSummary().then((s) => {
      if (s) {
        setLive(true);
        setSummary(s);
      }
    });
  }, []);

  const balances = summary?.balances ?? [
    { asset: "USDC", total: "12,484.20", available: "11,892.36", escrowed: "247.00", staked: "344.84", valueUsdc: "12,484.20" },
  ];
  const stream = summary?.settlementStream ?? [];
  const stake = summary?.stake;

  return (
    <div className="flex-1 grid grid-cols-12 min-h-0">
      <div className="col-span-8 border-r border-white/15 flex flex-col">
        <Panel title="Balances" code="F6.1" right={<span className="text-white/40">{live ? "API" : "MOCK"}</span>}>
          <table className="w-full text-[11px]">
            <thead className="text-white/40 border-b border-white/15">
              <tr>{["ASSET","TOTAL","AVAILABLE","ESCROWED","STAKED","VALUE"].map(h => <th key={h} className="px-3 py-1.5 text-left tracking-[0.14em] font-normal">{h}</th>)}</tr>
            </thead>
            <tbody>
              {balances.map((row) => (
                <tr key={row.asset} className="border-b border-white/5">
                  <td className="px-3 py-2 tracking-[0.1em]">{row.asset}</td>
                  <td className="px-3 py-2 tabular-nums text-white/80">{row.total}</td>
                  <td className="px-3 py-2 tabular-nums text-white/80">{row.available}</td>
                  <td className="px-3 py-2 tabular-nums text-white/80">{row.escrowed}</td>
                  <td className="px-3 py-2 tabular-nums text-white/80">{row.staked}</td>
                  <td className="px-3 py-2 tabular-nums text-white/80">{row.valueUsdc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Settlement Stream" code="F6.2" className="border-t-0 flex-1">
          <ul className="text-[11px]">
            {stream.map((r, i) => (
              <li key={i} className="px-3 py-1.5 border-b border-white/5 flex gap-4">
                <span className="text-white/40 tabular-nums w-12">{r.ts}</span>
                <span className="w-24"><Tag tone="mute">{r.type}</Tag></span>
                <span className="w-28 tracking-[0.1em]">{r.reference}</span>
                <span className="ml-auto tabular-nums">{r.amount}</span>
                <span className="text-white/50 w-12 text-right">{r.currency}</span>
              </li>
            ))}
            {!stream.length && (
              <li className="px-3 py-6 text-center text-white/40">No settlement events yet.</li>
            )}
          </ul>
        </Panel>
      </div>
      <div className="col-span-4 flex flex-col">
        <Panel title={`Quick ${mode === "BUY" ? "Deposit" : "Withdraw"}`} code="F6.3">
          <div className="p-3 space-y-3">
            <Field label="AMOUNT" value="1,000.00" suffix="USDC" />
            <Field label="NETWORK" value={summary?.network?.toUpperCase() ?? "BASE-SEPOLIA"} />
            <Field label="ETA" value={`~ ${summary?.depositEtaSec ?? 12} SEC`} />
            <button
              type="button"
              onClick={() => onRequireAuth(mode === "BUY" ? "Depositing funds" : "Withdrawing funds")}
              className="w-full py-2 bg-white text-black tracking-[0.24em] hover:bg-white/90"
            >
              {mode === "BUY" ? "DEPOSIT" : "WITHDRAW"}
            </button>
          </div>
        </Panel>
        <Panel title="Stake & Bond" code="F6.4" className="border-t-0 flex-1">
          <div className="p-3 space-y-3 text-[11px]">
            <div className="flex justify-between"><span className="text-white/40">REPUTATION BOND</span><span className="tabular-nums">{stake?.reputationBondUsdc ?? "344.84"} USDC</span></div>
            <div className="flex justify-between"><span className="text-white/40">SELLER COLLATERAL</span><span className="tabular-nums">{stake?.sellerCollateralUsdc ?? "2,100.00"} USDC</span></div>
            <div className="flex justify-between"><span className="text-white/40">VALIDATOR STAKE</span><span className="tabular-nums">{stake?.validatorStakeTknt ?? "6,000"} TKNT</span></div>
            <div className="h-px bg-white/10 my-2" />
            <div className="flex justify-between"><span className="text-white/40">EST. APR</span><span>{stake?.estAprPct ?? "11.4"}%</span></div>
            <div className="flex justify-between"><span className="text-white/40">SLASH RISK</span><span>{stake?.slashRisk ?? "LOW"}</span></div>
            <button
              type="button"
              onClick={() => onRequireAuth("Adjusting stake or bond")}
              className="w-full border border-white/30 py-2 tracking-[0.2em] hover:bg-white hover:text-black"
            >
              ADJUST STAKE
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- ANALYTICS ---------------- */

function AnalyticsView({ mode }: { mode: TradingMode }) {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const load = () =>
      void fetchTerminalAnalyticsOverview(mode).then((d) => {
        if (d) {
          setLive(true);
          setData(d);
        }
      });
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [mode]);

  const flow = data?.flow ?? [
    { key: "COMPUTE", pct: 58.2, valueLabel: "$24,810" },
    { key: "API QUOTA", pct: 26.4, valueLabel: "$11,240" },
    { key: "MODEL ACCESS", pct: 15.4, valueLabel: "$6,580" },
  ];
  const series = data?.flowSeries ?? Array.from({ length: 30 }, (_, i) => 20 + Math.abs(Math.sin(i * 0.6) * 70));
  const heatmap = data?.heatmap ?? Array.from({ length: 49 }, (_, i) => ((i * 13) % 100) / 100);
  const sla = data?.sla;
  const counterparties = data?.counterparties ?? [];

  return (
    <div className="flex-1 grid grid-cols-12 grid-rows-2 min-h-0">
      <div className="col-span-8 row-span-1 border-r border-b border-white/15">
        <Panel title={`Flow · ${mode === "BUY" ? "Spend by Asset Type" : "Revenue by Asset Type"}`} code="F7.1" right={<span className="text-white/40">{live ? "API" : "MOCK"}</span>}>
          <div className="p-4 grid grid-cols-3 gap-px bg-white/10">
            {flow.map((b) => (
              <div key={b.key} className="bg-black p-3">
                <div className="text-[10px] tracking-[0.2em] text-white/40">{b.key}</div>
                <div className="text-[22px] tabular-nums mt-1">{b.pct}%</div>
                <div className="text-white/50 mt-1">{b.valueLabel}</div>
                <div className="h-1 mt-3 bg-white/10"><div className="h-full bg-white" style={{ width: `${b.pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="p-4 grid grid-cols-30 gap-px h-40 items-end" style={{ gridTemplateColumns: "repeat(30, minmax(0,1fr))" }}>
            {series.map((h, i) => (
              <div key={i} className="bg-white" style={{ height: `${Math.min(h, 100)}%` }} />
            ))}
          </div>
          <div className="px-4 pb-3 flex justify-between text-[10px] text-white/40 tracking-[0.18em]">
            <span>30D AGO</span><span>15D</span><span>TODAY</span>
          </div>
        </Panel>
      </div>
      <div className="col-span-4 row-span-1 border-b border-white/15">
        <Panel title="Counterparty Heatmap" code="F7.2" right={<span className="text-white/40">{live ? "API" : "MOCK"}</span>}>
          <div className="p-3 grid grid-cols-7 gap-1">
            {heatmap.map((op, i) => (
              <div key={i} className="aspect-square border border-white/10" style={{ background: `rgba(255,255,255,${op})` }} />
            ))}
          </div>
          <div className="px-3 pb-3 text-[10px] text-white/40 tracking-[0.18em] flex justify-between">
            <span>LOW VOLUME</span><span>HIGH VOLUME</span>
          </div>
        </Panel>
      </div>
      <div className="col-span-6 row-span-1 border-r border-white/15">
        <Panel title="Verification SLA · 30D" code="F7.3" right={<span className="text-white/40">{live ? "API" : "MOCK"}</span>}>
          <div className="p-4 grid grid-cols-2 gap-px bg-white/10">
            {[
              ["UPTIME COMMITMENT", sla?.uptimeCommitmentPct ?? "99.95%"],
              ["ACTUAL", sla?.actualPct ?? "99.91%"],
              ["MISS COUNT", String(sla?.missCount ?? 2)],
              ["CREDIT OWED", `${sla?.creditOwedUsdc ?? "0.18"} USDC`],
            ].map(([k, v]) => (
              <div key={k} className="bg-black p-3"><div className="text-[10px] tracking-[0.2em] text-white/40">{k}</div><div className="text-[18px] tabular-nums mt-1">{v}</div></div>
            ))}
          </div>
          <div className="p-4">
            <div className="flex justify-between text-[10px] text-white/40 tracking-[0.18em] mb-1">
              <span>SLA TIMELINE</span>
              <span>{sla?.breachCount ?? 2} BREACHES</span>
            </div>
            <div className="grid grid-cols-30 gap-px" style={{ gridTemplateColumns: "repeat(30,minmax(0,1fr))" }}>
              {(sla?.timeline ?? Array.from({ length: 30 }, (_, day) => ({ day, breach: day === 9 || day === 22 }))).map((t) => (
                <div key={t.day} className={`h-6 ${t.breach ? "bg-white" : "bg-white/15"}`} />
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <div className="col-span-6">
        <Panel title="Top Counterparties" code="F7.4" right={<span className="text-white/40">{live ? "API" : "MOCK"}</span>}>
          <table className="w-full text-[11px]">
            <thead className="text-white/40 border-b border-white/15">
              <tr>{["RANK","ADDR / ENTITY","VOLUME","ORDERS","DELIVERY","REP"].map(h => <th key={h} className="px-3 py-1.5 text-left tracking-[0.14em] font-normal">{h}</th>)}</tr>
            </thead>
            <tbody>
              {counterparties.map((r) => (
                <tr key={r.rank} className="border-b border-white/5">
                  <td className="px-3 py-2 tabular-nums">{r.rank}</td>
                  <td className="px-3 py-2 tracking-[0.1em]">{r.entity}</td>
                  <td className="px-3 py-2 tabular-nums">{r.volumeLabel}</td>
                  <td className="px-3 py-2 tabular-nums">{r.orders}</td>
                  <td className="px-3 py-2 tabular-nums">{r.deliveryPct}</td>
                  <td className="px-3 py-2 tabular-nums">{r.repScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- BOTTOM BAR ---------------- */

function BottomBar({ nav, mode }: { nav: NavKey; mode: TradingMode }) {
  const shortcuts = NAV_ITEMS.map((n) => [n.code, n.key, n.label[mode]] as const).concat([["⌘K", "COMMAND", "COMMAND"] as const]);
  return (
    <footer
      data-tour="bottom-bar"
      className="tokenta-terminal__footer border-t border-white/15 flex items-stretch tracking-[0.18em] text-white/50"
    >
      <div className="tokenta-footer__left tokenta-type-footer">
        <span className="flex items-center gap-1.5 shrink-0">
          <Activity className="w-3 h-3 shrink-0" /> SYS NOMINAL
        </span>
        <span className="tokenta-footer__detail shrink-0">RPC 42ms</span>
        <span className="tokenta-footer__detail shrink-0">WS 6/6</span>
        <span className="tokenta-footer__detail shrink-0">QUEUE 0</span>
      </div>
      <div className="tokenta-footer__center min-w-0 flex-1">
        <TokentaScrollArea orientation="horizontal" ariaLabel="Workspace shortcuts" className="h-full">
          {shortcuts.map(([k, key, l]) => (
            <span key={k} className={`flex items-center gap-1 shrink-0 whitespace-nowrap ${nav === key ? "text-white" : ""}`}>
              <span className="border border-white/30 px-1">{k}</span>
              <span className="tokenta-footer__shortcut-label">{l}</span>
            </span>
          ))}
        </TokentaScrollArea>
      </div>
      <div className="tokenta-footer__right tokenta-type-footer flex items-center gap-2">
        <Circle className="w-2 h-2 shrink-0 fill-white text-white" />
        <span className="tokenta-footer__brand-long">TOKENTA · v0.4.2-α</span>
        <span className="tokenta-footer__brand-short">v0.4.2-α</span>
      </div>
    </footer>
  );
}

