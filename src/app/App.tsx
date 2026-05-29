import { useCallback, useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import { useAccount } from "wagmi";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight, ArrowDownRight, Circle, Activity, Boxes, ShieldCheck,
  Receipt, MessagesSquare, Award, Wallet, BarChart3, Search, Plus,
  ChevronRight, Dot, Send, Filter, ArrowLeftRight, Lock, Unlock, Zap
} from "lucide-react";
import {
  rotationGuide,
  filterListings,
  formatTransactionType,
} from "./market-utils";
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
import tokentaLogo from "../assets/tokenta-logo.png";
import { RoleTransitionOverlay } from "./components/RoleTransitionOverlay";
import { UserTour } from "./components/UserTour";
import {
  TOUR_STORAGE_KEY,
  TOUR_STEPS,
  SELL_TOUR_STEPS,
  type TourStep,
} from "./tour-steps";
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
import { VerificationProgressModal } from "./components/VerificationProgressModal";
import { MyListingsPanel } from "./components/MyListingsPanel";
import { TourMenuModal } from "./components/TourMenuModal";
import { SellJourneyCongratsModal } from "./components/SellJourneyCongratsModal";
import {
  SellOnboardingBanner,
  hasSellerDismissedOnboarding,
  markSellerOnboardingDismissed,
} from "./components/SellOnboardingBanner";
import { useVerificationJobState } from "./hooks/useVerificationJobState";
import {
  fetchMarketListings,
  fetchMyListings,
  fetchBuybackOffers,
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
  fetchTerminalOrder,
  fetchTerminalOrderEscrow,
  walletDepositTerminal,
  walletWithdrawTerminal,
  fetchSellerIncome,
  computePurchaseAmountUsdc,
  type TerminalOrderRow,
  type SellerIncomeResponse,
  type VerifyFeedRow,
  type ReputationLedgerRow,
  type ReputationScoreResponse,
  type WalletSummaryResponse,
  type AnalyticsOverviewResponse,
} from "./api/verification";
import { useTokentaWallet } from "./hooks/useTokentaWallet";
import { useBaseSepoliaWallet } from "./hooks/useBaseSepoliaWallet";
import { useSettlementNetwork } from "./hooks/useSettlementNetwork";
import { useEscrowFunding, type EscrowFundingState } from "./hooks/useEscrowFunding";
import { useUsdcBalance } from "./hooks/useUsdcBalance";
import {
  ACTIVE_CHAIN_ID,
  ESCROW_WALLET,
  TREASURY_WALLET,
  isEscrowConfigured,
  isTreasuryConfigured,
} from "./web3/contracts";
import { explorerAddressUrl, explorerTxUrl } from "./chain-config";
import { useTerminalTimezone } from "./hooks/useTerminalTimezone";
import { useTerminalReputation } from "./hooks/useTerminalReputation";
import { formatTerminalTimestamp } from "./timezone/terminal-timezone";
import type { EnhancedListing, BuybackOffer } from "./trading-types";
import { usePrivy } from "@privy-io/react-auth";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { TerminalToastProvider } from "./context/TerminalToastContext";
import { useTerminalToast } from "./context/TerminalToastContext";
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
import { Panel, Tag, Pulse, resultTagTone } from "./ui-primitives";
import { useZoomLevel } from "./hooks/useZoomLevel";
import { TokentaScrollArea } from "./components/TokentaScrollArea";
import { ReputationLeaderboardModal } from "./components/ReputationLeaderboardModal";
import { ReputationLevelBadge } from "./components/ReputationLevelCard";
import { ZoomWarningBanner } from "./components/ZoomWarningBanner";

const SESSION_BOOT_KEY = "tokenta-session-booted";

function TerminalLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black font-mono text-[11px] tracking-[0.24em] text-white/50">
      INITIALIZING PRIVY…
    </div>
  );
}

function formatFeedTimestamp(input: string): string {
  if (!input) return "—";
  if (/^\d{2}:\d{2}/.test(input)) return input.slice(0, 8);
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input.slice(0, 8);
  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function App() {
  const { ready } = usePrivy();

  if (!ready) {
    return <TerminalLoadingScreen />;
  }

  return (
    <AuthProvider>
      <TerminalToastProvider>
        <TerminalErrorBoundary>
          <TerminalApp />
        </TerminalErrorBoundary>
      </TerminalToastProvider>
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
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [listApiOpen, setListApiOpen] = useState(false);
  const [buybackOpen, setBuybackOpen] = useState(false);
  const [prePurchaseOpen, setPrePurchaseOpen] = useState(false);
  const [prePurchaseOrderId, setPrePurchaseOrderId] = useState<string | null>(null);
  const [buybackOfferId, setBuybackOfferId] = useState<string>("");
  const [buybackOffers, setBuybackOffers] = useState<BuybackOffer[]>([]);
  const [myListings, setMyListings] = useState<EnhancedListing[]>([]);
  const [pendingBuybackOrders, setPendingBuybackOrders] = useState<TerminalOrderRow[]>([]);
  const [activeVerificationJobId, setActiveVerificationJobId] = useState<string | null>(null);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [activeListingSnapshot, setActiveListingSnapshot] = useState<{
    quotaToSell: number;
    askPriceUsdc: number;
    providerKind: string;
  } | null>(null);
  const [verificationProgressOpen, setVerificationProgressOpen] = useState(false);
  const [buyApiOpen, setBuyApiOpen] = useState(false);
  const { clock, timezone: terminalTimezone } = useTerminalTimezone();
  const reputation = useTerminalReputation();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [activeTourSteps, setActiveTourSteps] = useState<TourStep[]>(TOUR_STEPS);
  const [tourMenuOpen, setTourMenuOpen] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(
    () => !!localStorage.getItem(TOUR_STORAGE_KEY),
  );
  const [sellOnboardingDismissed, setSellOnboardingDismissed] = useState(
    () => hasSellerDismissedOnboarding(),
  );
  const [sellCongratsOpen, setSellCongratsOpen] = useState(false);
  const [sellCongratsContext, setSellCongratsContext] = useState<{
    listingId: string | null;
    estimatedRevenueUsdc: string | null;
  } | null>(null);
  const [reputationLeaderboardOpen, setReputationLeaderboardOpen] = useState(false);
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

  const listings = useMemo(() => apiMarketRows, [apiMarketRows]);

  useEffect(() => {
    if (!listings.length) return;
    if (!listings.some((l) => l.id === selectedAsset)) {
      setSelectedAsset(listings[0].id);
    }
  }, [listings, selectedAsset]);

  useEffect(() => {
    void fetchBuybackOffers().then((offers) => {
      setBuybackOffers(offers);
      setBuybackOfferId((prev) => prev || offers[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    if (mode !== "SELL") return;
    void fetchMyListings().then((rows) => setMyListings(rows.map(marketRowToEnhanced)));
    void fetchTerminalOrders({ wallet: walletAddress ?? undefined, role: "seller" }).then((orders) =>
      setPendingBuybackOrders(orders.filter((o) => o.status !== "SETTLED")),
    );
  }, [mode, walletAddress, activeVerificationJobId]);

  const displayMode = transitionMode ?? mode;

  const finishTour = useCallback(() => {
    // Only mark full platform tour as permanently completed.
    if (activeTourSteps === TOUR_STEPS) {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
      setTourCompleted(true);
    }
    setTourOpen(false);
  }, [activeTourSteps]);

  useEffect(() => {
    if (transitionMode) return;
    if (localStorage.getItem(TOUR_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setTourOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [transitionMode]);

  useEffect(() => {
    if (!tourOpen) return;
    const step = activeTourSteps[tourStep];
    if (step?.nav) setNav(step.nav);
  }, [tourStep, tourOpen]);

  const active = listings.find((a) => a.id === selectedAsset) ?? listings[0] ?? null;

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
        onOpenReputation={() => {
          setNav("REPUTATION");
          setReputationLeaderboardOpen(true);
        }}
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
          onOpenTourMenu={() => setTourMenuOpen(true)}
          tourCompleted={tourCompleted}
        />
        <main
          data-tour="main-workspace"
          data-sidebar-collapsed={sidebarOpen ? "false" : "true"}
          className="tokenta-workspace flex min-w-0 flex-1 flex-col overflow-hidden"
        >
          <WorkspaceNavBar nav={nav} mode={mode} sidebarOpen={sidebarOpen} />
          {/* Seller onboarding banner — visible to new sellers (no listings, not dismissed). */}
          {mode === "SELL" &&
            nav === "MARKET" &&
            !sellOnboardingDismissed &&
            myListings.length === 0 && (
              <SellOnboardingBanner
                visible={true}
                onListApi={openListApi}
                onStartTour={() => {
                  setActiveTourSteps(SELL_TOUR_STEPS);
                  setTourStep(0);
                  setTourOpen(true);
                }}
                onDismiss={() => {
                  markSellerOnboardingDismissed();
                  setSellOnboardingDismissed(true);
                }}
              />
            )}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {nav === "MARKET" && (
            <MarketView
              mode={mode}
              buySource={buySource}
              sellTab={sellTab}
              listings={listings}
              walletAddress={walletAddress}
              myListings={myListings}
              buybackOffers={buybackOffers}
              pendingBuybackOrders={pendingBuybackOrders}
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
              onOpenProgress={() => setVerificationProgressOpen(true)}
            />
          )}
          {nav === "ESCROW" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              <EscrowView
                mode={mode}
                orderId={selectedOrderId}
                walletAddress={walletAddress}
              />
              <WalletView mode={mode} walletAddress={walletAddress} onRequireAuth={guardWalletAction} />
            </div>
          )}
          {nav === "ORDERS" && (
            <OrdersView
              mode={mode}
              walletAddress={walletAddress}
              selectedOrderId={selectedOrderId}
              activeVerificationJobId={activeVerificationJobId}
              onSelectOrder={setSelectedOrderId}
              onOpenChat={(id) => {
                setSelectedOrderId(id);
                setNav("CHAT");
              }}
              onOpenVerify={() => setNav("VERIFY")}
              onOpenEscrow={() => setNav("ESCROW")}
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
              walletAddress={walletAddress}
              activeOrderId={selectedOrderId}
              onSelectOrder={setSelectedOrderId}
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
              hasActiveListing={myListings.some((l) => l.verificationState === "LIVE")}
              leaderboardOpen={reputationLeaderboardOpen}
              onLeaderboardOpenChange={setReputationLeaderboardOpen}
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
            steps={activeTourSteps}
            onStepChange={setTourStep}
            onComplete={finishTour}
            onSkip={finishTour}
          />
        )}
      </AnimatePresence>
      <TourMenuModal
        open={tourMenuOpen}
        onClose={() => setTourMenuOpen(false)}
        onStartTour={(steps, startIndex) => {
          setActiveTourSteps(steps);
          setTourStep(startIndex ?? 0);
          setTourMenuOpen(false);
          setTourOpen(true);
        }}
      />
      <ListApiModal
        open={listApiOpen}
        onClose={() => setListApiOpen(false)}
        onSubmitted={(jobId, listingId, snapshot) => {
          setActiveVerificationJobId(jobId);
          setActiveListingId(listingId);
          setActiveListingSnapshot(snapshot);
          setVerificationProgressOpen(true);
          setNav("VERIFY");
        }}
      />
      <VerificationProgressModal
        open={verificationProgressOpen}
        onClose={() => setVerificationProgressOpen(false)}
        jobId={activeVerificationJobId}
        listingId={activeListingId}
        listingSnapshot={activeListingSnapshot}
        onPublished={() => {
          // Compute estimated revenue from snapshot (quota * ask price)
          const revenue = activeListingSnapshot
            ? (
                activeListingSnapshot.quotaToSell * activeListingSnapshot.askPriceUsdc
              ).toFixed(2)
            : null;
          setSellCongratsContext({
            listingId: activeListingId,
            estimatedRevenueUsdc: revenue,
          });
          setVerificationProgressOpen(false);
          setSellCongratsOpen(true);
        }}
        onStartSellerTour={() => {
          setVerificationProgressOpen(false);
          setActiveTourSteps(SELL_TOUR_STEPS);
          setTourStep(0);
          setTourOpen(true);
        }}
      />
      <SellJourneyCongratsModal
        open={sellCongratsOpen}
        onClose={() => setSellCongratsOpen(false)}
        listingLabel={
          sellCongratsContext?.listingId
            ? `LST-${sellCongratsContext.listingId.slice(-6).toUpperCase()}`
            : null
        }
        estimatedRevenueUsdc={sellCongratsContext?.estimatedRevenueUsdc ?? null}
        onGoToOrders={() => {
          setSellCongratsOpen(false);
          setNav("ORDERS");
        }}
        onGoToMarket={() => {
          setSellCongratsOpen(false);
          setNav("MARKET");
        }}
        onStartTour={() => {
          setSellCongratsOpen(false);
          setActiveTourSteps(SELL_TOUR_STEPS);
          setTourStep(0);
          setTourOpen(true);
        }}
      />
      <BuybackVerifyModal
        open={buybackOpen}
        onClose={() => setBuybackOpen(false)}
        offer={buybackOffers.find((o) => o.id === buybackOfferId) ?? buybackOffers[0] ?? null}
        onConfirmed={(orderId) => {
          setSelectedOrderId(orderId);
          setNav("ORDERS");
          setBuybackOpen(false);
        }}
      />
      <PrePurchaseVerifyModal
        open={prePurchaseOpen}
        onClose={() => setPrePurchaseOpen(false)}
        orderId={prePurchaseOrderId ?? selectedOrderId ?? ""}
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
          setNav("ESCROW");
        }}
      />
      <AuthPromptToast />
    </div>
  );
}

/* ---------------- status strip ---------------- */

function StatusStrip() {
  const [items, setItems] = useState<{ k: string; v: string; d: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetchMetricsHealth().then((m) => {
      if (!m) {
        setLoaded(true);
        return;
      }
      setLoaded(true);
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
        {!loaded && <span className="text-white/40 tracking-[0.18em] shrink-0">LOADING METRICS…</span>}
        {loaded && items.length === 0 && (
          <span className="text-white/40 tracking-[0.18em] shrink-0">API OFFLINE</span>
        )}
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
  walletAddress,
  myListings,
  buybackOffers,
  pendingBuybackOrders,
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
  walletAddress: string | null;
  myListings: EnhancedListing[];
  buybackOffers: BuybackOffer[];
  pendingBuybackOrders: TerminalOrderRow[];
  active: EnhancedListing | null;
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
        myListings={myListings}
        buybackOffers={buybackOffers}
        pendingBuybackOrders={pendingBuybackOrders}
      />
      {mode === "SELL" && (
        <div className="border-t border-white/15 min-h-0 max-h-[40vh] overflow-auto">
          <InventoryView walletAddress={walletAddress} onCreateListing={onListApi} />
      </div>
      )}
      <div className="h-56 min-h-0 grid grid-cols-12 border-t border-white/15">
        <div className="col-span-8 border-r border-white/15">
          <OrderBookPanel ticker={active?.ticker} />
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
  active: EnhancedListing | null;
  onBuyApi?: () => void;
  onListApi?: () => void;
}) {
  if (!active) {
    return (
      <div className="border-t border-white/15 px-3 py-6 text-center text-[11px] text-white/40 tracking-[0.14em]">
        No listing selected. Browse verified listings or create one to trade.
      </div>
    );
  }
  const isBuy = mode === "BUY";
  const isTokentaAlloc = false /* removed platform mode */;
  const supplyNum = Number(String(active.supply).replace(/,/g, "")) || 0;
  const askNum = Number(active.price) || 0;
  const estTotal = computePurchaseAmountUsdc({
    askPriceUsdc: askNum,
    supplyTokens: supplyNum,
    mode: "BUYOUT",
    quantity: supplyNum,
  });
  return (
    <div className="border-t border-white/15 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] tracking-[0.2em] text-white/40">
        <span>{isTokentaAlloc ? "ALLOCATE · PLATFORM INVENTORY" : isBuy ? "BID · CREATE ESCROW ORDER" : "ASK · POST OFFER"}</span>
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> NON-CUSTODIAL</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="QUANTITY" value={active.supply} suffix={active.unit} />
        <Field label="ASK / M" value={active.price} suffix="USDC" />
        <Field label="LISTING" value={active.listingId ?? active.id} />
        <Field label="VERIFY" value={active.verificationTimestamp ?? active.verified} />
      </div>
      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
        <span className="text-white/40">EST. TOTAL (BUYOUT)</span>
        <span className="tabular-nums">{estTotal} USDC</span>
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

function OrderBookPanel({ ticker }: { ticker?: string }) {
  return (
    <Panel
      title={`Order Book · ${ticker ?? "—"}`}
      code="F1.3"
      right={<span className="text-white/40">NO DEPTH DATA</span>}
      className="border-0 h-full"
    >
      <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-white/40 tracking-[0.14em]">
        Order book requires live market depth API. Select a listing to view trade details.
      </div>
    </Panel>
  );
}

function VerifyStreamCompact() {
  const [rows, setRows] = useState<VerifyFeedRow[]>([]);

  useEffect(() => {
    const load = () => void fetchVerifyFeed().then(setRows);
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!rows.length) {
  return (
      <p className="px-3 py-4 text-[11px] text-white/40 tracking-[0.12em]">No verification events yet.</p>
    );
  }

  return (
    <ul className="text-[11px]">
      {rows.slice(0, 8).map((v, i) => (
        <li key={`${v.jobId ?? i}-${v.ts}`} className="px-3 py-1.5 border-b border-white/5 flex items-center gap-2">
          <span className="text-white/40 tabular-nums">{formatFeedTimestamp(v.ts)}</span>
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


function EscrowView({
  mode,
  orderId,
  walletAddress,
}: {
  mode: TradingMode;
  orderId: string | null;
  walletAddress: string | null;
}) {
  const [apiOrder, setApiOrder] = useState<TerminalOrderRow | null>(null);
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const { showToast } = useTerminalToast();
  const [busy, setBusy] = useState(false);
  const [settlementDryRun, setSettlementDryRun] = useState(true);
  const [fundTxHash, setFundTxHash] = useState<string | null>(null);
  const [releaseSettlement, setReleaseSettlement] = useState<{
    mode: string;
    sellerTxHash?: string;
    treasuryTxHash?: string;
  } | null>(null);
  const { network: settlementNetwork } = useSettlementNetwork();

  // wagmi connection state (chain + connection) for the on-chain LOCK flow.
  const { chainId: walletChainId, isConnected } = useAccount();
  const onCorrectChain = walletChainId === ACTIVE_CHAIN_ID;
  const usdc = useUsdcBalance(walletAddress as `0x${string}` | null);
  const escrowFunding = useEscrowFunding();
  const submittedHashRef = useRef<string | null>(null);

  const activeOrderId = apiOrder?.orderId ?? (orderId?.startsWith("ord_") ? orderId : null);
  const amountUsdc = apiOrder?.amountUsdc ?? "0";
  const totalNum = Number(amountUsdc) || 0;

  const loadOrder = useCallback(() => {
    if (!activeOrderId) return;
    void fetchTerminalOrder(activeOrderId).then(setApiOrder);
    void fetchTerminalOrderEscrow(activeOrderId).then((e) => {
      if (e?.status && e.status !== "NOT_FOUND") setEscrowStatus(e.status);
    });
  }, [activeOrderId]);

  useEffect(() => {
    loadOrder();
    void fetchTerminalNetwork().then((n) => {
      if (n) setSettlementDryRun(n.dryRun);
    });
  }, [loadOrder, escrowStatus]);

  /**
   * BUYER · STEP 1 — on-chain USDC transfer to the escrow wallet.
   *
   * 1. Trigger wagmi write (wallet popup appears)
   * 2. While the user signs / chain confirms, the inline UI renders state
   *    transitions (`signing`, `broadcasting`, `confirming`, `confirmed`)
   * 3. Once confirmed, the tx hash is forwarded to the backend, which records
   *    it as the canonical proof and marks the order ESCROW_FUNDED.
   */
  const handleFundOnChain = async () => {
    if (!activeOrderId) {
      showToast({
        title: "NO ORDER",
        message: "Select an API order from Orders after purchase.",
        kind: "warn",
      });
      return;
    }
    submittedHashRef.current = null;
    escrowFunding.reset();
    await escrowFunding.send(amountUsdc);
  };

  const lastFundingErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (escrowFunding.state !== "error" || !escrowFunding.error) {
      if (escrowFunding.state !== "error") lastFundingErrorRef.current = null;
      return;
    }
    if (lastFundingErrorRef.current === escrowFunding.error) return;
    lastFundingErrorRef.current = escrowFunding.error;
    showToast({
      title: "LOCK PAYMENT FAILED",
      message: escrowFunding.error,
      kind: "error",
    });
  }, [escrowFunding.state, escrowFunding.error, showToast]);

  // Watch for confirmed on-chain transfer, then reconcile with the backend ledger
  // exactly once per tx hash.
  useEffect(() => {
    if (escrowFunding.state !== "confirmed") return;
    if (!escrowFunding.txHash || !activeOrderId) return;
    if (submittedHashRef.current === escrowFunding.txHash) return;
    submittedHashRef.current = escrowFunding.txHash;
    const txHash = escrowFunding.txHash;
    void (async () => {
      try {
        const sig = await signEscrowPayloadDev({
          orderId: activeOrderId,
          amountUsdc,
          action: "fund",
        });
        const res = await fundOrderEscrow(activeOrderId, amountUsdc, sig?.signature, txHash);
        if (!res) throw new Error("Backend could not reconcile escrow tx.");
        setFundTxHash(txHash);
        setEscrowStatus(res.escrow.status);
        loadOrder();
      } catch (e) {
        showToast({
          title: "RECONCILE FAILED",
          message: e instanceof Error ? e.message : "Backend reconciliation failed.",
          kind: "error",
        });
      }
    })();
  }, [escrowFunding.state, escrowFunding.txHash, activeOrderId, amountUsdc, loadOrder, showToast]);

  /**
   * BUYER · STEP 3 — confirm receipt and release escrow.
   *
   * In Phase 1 (semi-onchain hybrid) the escrow wallet is a Tokenta-controlled
   * Safe Multisig, so the buyer does NOT sign the release tx themselves; this
   * call instructs the backend to dispatch the payout from that wallet to the
   * seller (minus the 3% treasury fee). The buyer's signed acknowledgement is
   * still HMAC-protected via `signEscrowPayloadDev`.
   */
  const handleRelease = async () => {
    if (!activeOrderId) return;
    setBusy(true);
    setPayoutMsg(null);
    try {
      const sig = await signEscrowPayloadDev({
        orderId: activeOrderId,
        amountUsdc,
        action: "release",
      });
      const res = await releaseOrderEscrow(activeOrderId, amountUsdc, sig?.signature);
      if (!res) throw new Error("Escrow release failed");
      setEscrowStatus(res.escrow.status);
      const payout = res.sellerPayout;
      if (res.settlement) {
        setReleaseSettlement({
          mode: res.settlement.mode,
          sellerTxHash: res.settlement.sellerTxHash ?? payout?.payoutTxHash,
          treasuryTxHash: res.settlement.treasuryTxHash ?? payout?.treasuryTxHash,
        });
      }
      if (payout) {
        const sellerTx = payout.payoutTxHash?.slice(0, 14) ?? "—";
        const modeLabel = payout.onChainMode === "on-chain" ? "on-chain" : "ledger";
        setPayoutMsg(
          mode === "SELL"
            ? `Income credited: ${payout.netUsdc} USDC (${modeLabel} · seller tx ${sellerTx}…)`
            : `Seller paid ${payout.netUsdc} USDC · fee ${payout.feeUsdc} USDC to treasury (${modeLabel})`,
        );
      }
      loadOrder();
    } catch (e) {
      showToast({
        title: "RELEASE FAILED",
        message: e instanceof Error ? e.message : "Release failed",
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const funded = escrowStatus === "FUNDED" || apiOrder?.status === "ESCROW_FUNDED";
  const settled = escrowStatus === "RELEASED" || apiOrder?.status === "SETTLED";

  // currentStep: 1 = awaiting lock, 3 = funded awaiting buyer confirm, 5 = all done
  const currentStep = settled ? 5 : funded ? 3 : 1;

  const steps: { title: string; desc: string }[] = [
    { title: "Lock Payment",    desc: "Your funds held by Tokenta escrow" },
    { title: "API Provisioned", desc: "Credentials delivered to buyer" },
    { title: "Confirm Receipt", desc: "Buyer verifies the API works" },
    { title: "Funds Released",  desc: "Seller credited after confirmation" },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0 p-4 gap-4">
      <div className="text-[10px] tracking-[0.22em] text-white/40">
        F3 · ESCROW STATUS · BASE SEPOLIA {settlementDryRun ? "· DRY-RUN" : "· LIVE ANCHOR"}
      </div>

      {/* On-chain wallet + contract status strip */}
      <WalletContractStrip
        walletAddress={walletAddress}
        isConnected={isConnected}
        onCorrectChain={onCorrectChain}
        usdcFormatted={usdc.formatted}
        escrowWallet={settlementNetwork.escrowWallet}
        treasuryWallet={settlementNetwork.treasuryWallet}
        escrowReleaseConfigured={settlementNetwork.escrowReleaseSignerConfigured}
      />

      {/* Order header */}
      {activeOrderId && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border border-white/15 bg-white/[0.02] px-3 py-2 text-[10px] max-w-3xl">
          <span className="text-white/40 tracking-[0.14em]">ORDER</span>
          <span className="tabular-nums tracking-[0.1em]">{activeOrderId.slice(-12).toUpperCase()}</span>
          <span className="text-white/20">·</span>
          <span className="text-white/40 tracking-[0.14em]">VALUE</span>
          <span className="tabular-nums">{amountUsdc} USDC</span>
          <span className="text-white/20">·</span>
          <span className="text-white/40 tracking-[0.14em]">ESCROW</span>
          <span className={settled ? "text-white/50" : funded ? "text-white" : "text-white/60"}>
            {settled ? "RELEASED" : funded ? "FUNDED" : "PENDING"}
          </span>
          {fundTxHash && (
            <>
              <span className="text-white/20">·</span>
              <a
                href={explorerTxUrl(fundTxHash)}
                target="_blank"
                rel="noreferrer"
                className="text-white/70 underline decoration-white/30 hover:text-white"
              >
                VIEW FUND TX
              </a>
            </>
          )}
          {apiOrder?.sellerWallet && mode === "BUY" && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-white/40 tracking-[0.14em]">SELLER</span>
              <span className="text-white/60">{apiOrder.sellerWallet.slice(0, 10)}…</span>
            </>
          )}
        </div>
      )}

      {/* P2P 4-step flow with inline action buttons */}
      <div className="border border-white/15 bg-white/[0.02] p-3 max-w-3xl" data-tour="escrow-action">
        <div className="mb-3 text-[8px] tracking-[0.2em] text-white/30">P2P ORDER FLOW</div>
        <ol className="grid grid-cols-4 gap-1.5">
          {steps.map(({ title, desc }, i) => {
            const stepNum = i + 1;
            const active = currentStep === stepNum;
            const done = currentStep > stepNum;
            return (
              <li
                key={stepNum}
                className={`flex flex-col border px-2 pt-2 pb-2.5 gap-1.5 ${
                  done
                    ? "border-white/20 bg-white/[0.03]"
                    : active
                      ? "border-white/50 bg-white/[0.06]"
                      : "border-white/8 opacity-40"
                }`}
              >
                <div className={`text-[8px] tracking-[0.2em] ${done ? "text-white/35" : active ? "text-white/60" : "text-white/20"}`}>
                  {done ? "DONE" : active ? "ACTIVE" : `STEP ${stepNum}`}
                </div>
                <div className={`text-[10px] font-medium leading-tight ${active ? "text-white" : done ? "text-white/60" : "text-white/25"}`}>
                  {title}
                </div>
                <div className={`text-[8px] leading-snug ${active ? "text-white/45" : done ? "text-white/25" : "text-white/15"}`}>
                  {desc}
                </div>

                {/* Step 1 action — BUY: on-chain USDC transfer to escrow wallet */}
                {active && stepNum === 1 && mode === "BUY" && activeOrderId && (
                  <OnChainLockButton
                    amountUsdc={amountUsdc}
                    state={escrowFunding.state}
                    txHash={escrowFunding.txHash}
                    error={escrowFunding.error}
                    isConnected={isConnected}
                    onCorrectChain={onCorrectChain}
                    onRun={() => void handleFundOnChain()}
                    onReset={() => escrowFunding.reset()}
                  />
                )}

                {/* Step 3 action — BUY: confirm receipt and release */}
                {active && stepNum === 3 && mode === "BUY" && activeOrderId && (
                  <div className="relative mt-0.5">
                    {!busy && (
                      <span className="absolute inset-0 animate-ping rounded-none border border-white/40 pointer-events-none" />
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRelease()}
                      className="relative w-full border border-white bg-white py-1.5 text-[8px] tracking-[0.12em] text-black hover:bg-white/90 disabled:opacity-40"
                    >
                      {busy ? "CONFIRMING…" : "CONFIRM RECEIPT"}
                    </button>
                  </div>
                )}

                {/* Step 3 — SELL: awaiting buyer */}
                {active && stepNum === 3 && mode === "SELL" && (
                  <div className="mt-0.5 border border-white/20 px-1.5 py-1 text-[8px] tracking-[0.1em] text-white/40">
                    AWAITING BUYER
                  </div>
                )}

                {/* Step 4 done — payment sent */}
                {done && stepNum === 4 && (
                  <div className="mt-0.5 text-[8px] tracking-[0.12em] text-white/40">
                    PAYMENT SENT
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Fee / value summary */}
      {activeOrderId && totalNum > 0 && (
        <div className="border border-white/12 bg-white/[0.02] px-3 py-2 text-[10px] max-w-3xl space-y-1.5">
          {mode === "BUY" ? (
            <>
              <div className="flex justify-between">
                <span className="text-white/40 tracking-[0.12em]">YOU PAY</span>
                <span className="tabular-nums">{amountUsdc} USDC</span>
              </div>
              <div className="flex justify-between text-white/45">
                <span className="tracking-[0.12em]">SELLER RECEIVES (AFTER 3% FEE)</span>
                <span className="tabular-nums">{(totalNum * 0.97).toFixed(2)} USDC</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-white/40 tracking-[0.12em]">GROSS SALE VALUE</span>
                <span className="tabular-nums">{amountUsdc} USDC</span>
              </div>
              <div className="flex justify-between text-white/45">
                <span className="tracking-[0.12em]">YOU RECEIVE (AFTER 3% FEE)</span>
                <span className="tabular-nums">{(totalNum * 0.97).toFixed(2)} USDC</span>
              </div>
            </>
          )}
        </div>
      )}

      {payoutMsg && (
        <p className="max-w-3xl border border-white/20 px-3 py-2 text-[11px] text-emerald-400/90">
          {payoutMsg}
        </p>
      )}
      {releaseSettlement?.mode === "on-chain" && (
        <div className="max-w-3xl border border-white/15 bg-white/[0.02] px-3 py-2 text-[10px] space-y-1">
          <div className="text-[8px] tracking-[0.2em] text-white/35">RELEASE SETTLEMENT · ON-CHAIN</div>
          {releaseSettlement.sellerTxHash && (
            <div className="flex justify-between gap-2">
              <span className="text-white/45">SELLER PAYOUT</span>
              <a
                href={explorerTxUrl(releaseSettlement.sellerTxHash)}
                target="_blank"
                rel="noreferrer"
                className="tabular-nums underline decoration-white/30 hover:text-white"
              >
                VIEW ON BASESCAN
              </a>
            </div>
          )}
          {releaseSettlement.treasuryTxHash && (
            <div className="flex justify-between gap-2">
              <span className="text-white/45">TREASURY FEE (3%)</span>
              <a
                href={explorerTxUrl(releaseSettlement.treasuryTxHash)}
                target="_blank"
                rel="noreferrer"
                className="tabular-nums underline decoration-white/30 hover:text-white"
              >
                VIEW ON BASESCAN
              </a>
            </div>
          )}
        </div>
      )}
      {mode === "SELL" && settled && (
        <div className="max-w-3xl border border-white/30 px-3 py-2 text-[10px] tracking-[0.14em]">
          PAYMENT RELEASED · FUNDS CREDITED TO YOUR WALLET
        </div>
      )}

      {/* No order guide */}
      {!activeOrderId && (
        <p className="text-[11px] text-white/40 max-w-xl">
          No active order selected. Purchase a listing in BUY mode (F1 Market) to create an order, then return here to lock escrow.
        </p>
      )}
    </div>
  );
}

/* ---------------- Escrow helper components ---------------- */

/**
 * WalletContractStrip — header row that exposes everything the user needs to
 * understand they are signing a real on-chain transaction:
 *   - their connected wallet + USDC balance
 *   - whether they are on the correct chain
 *   - the address of the escrow wallet that will receive the USDC
 *   - the address of the treasury that will receive the 3% fee
 */
function WalletContractStrip({
  walletAddress,
  isConnected,
  onCorrectChain,
  usdcFormatted,
  escrowWallet: escrowWalletProp,
  treasuryWallet: treasuryWalletProp,
  escrowReleaseConfigured,
}: {
  walletAddress: string | null;
  isConnected: boolean;
  onCorrectChain: boolean;
  usdcFormatted: string;
  escrowWallet?: string;
  treasuryWallet?: string;
  escrowReleaseConfigured?: boolean;
}) {
  const escrowAddr =
    escrowWalletProp && /^0x[a-fA-F0-9]{40}$/.test(escrowWalletProp)
      ? (escrowWalletProp as `0x${string}`)
      : ESCROW_WALLET;
  const treasuryAddr =
    treasuryWalletProp && /^0x[a-fA-F0-9]{40}$/.test(treasuryWalletProp)
      ? (treasuryWalletProp as `0x${string}`)
      : TREASURY_WALLET;
  const escrowConfigured = isEscrowConfigured() || Boolean(escrowWalletProp);
  const treasuryConfigured = isTreasuryConfigured() || Boolean(treasuryWalletProp);
  return (
    <div className="border border-white/15 bg-white/[0.02] max-w-3xl">
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <div className="text-[8px] tracking-[0.2em] text-white/30">
          ON-CHAIN STATE · BASE SEPOLIA (CHAIN {ACTIVE_CHAIN_ID})
        </div>
        {escrowReleaseConfigured && (
          <span className="text-[8px] tracking-[0.14em] text-white/50">RELEASE SIGNER OK</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/10 mt-2">
        <div className="bg-black px-3 py-2">
          <div className="text-[8px] tracking-[0.18em] text-white/40">YOUR WALLET</div>
          <div className="mt-0.5 text-[11px] tabular-nums truncate">
            {walletAddress ? `${walletAddress.slice(0, 10)}…${walletAddress.slice(-4)}` : (
              <span className="text-red-400">NOT CONNECTED</span>
            )}
          </div>
          <div className={`mt-0.5 text-[8px] tracking-[0.16em] ${isConnected ? "text-white/45" : "text-red-400"}`}>
            {isConnected ? (onCorrectChain ? "CONNECTED · CHAIN OK" : "WRONG CHAIN — SWITCH ON LOCK") : "OPEN ANY MODAL TO LOGIN"}
          </div>
        </div>
        <div className="bg-black px-3 py-2">
          <div className="text-[8px] tracking-[0.18em] text-white/40">USDC BALANCE</div>
          <div className="mt-0.5 text-[11px] tabular-nums">{usdcFormatted}</div>
          <div className="mt-0.5 text-[8px] tracking-[0.16em] text-white/45">
            ERC-20 · 6 DECIMALS
          </div>
        </div>
        <div className="bg-black px-3 py-2">
          <div className="text-[8px] tracking-[0.18em] text-white/40">ESCROW WALLET</div>
          {escrowConfigured ? (
            <a
              href={explorerAddressUrl(escrowAddr)}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block text-[11px] tabular-nums truncate underline decoration-white/20 hover:text-white"
            >
              {escrowAddr.slice(0, 10)}…{escrowAddr.slice(-6)}
            </a>
          ) : (
            <div className="mt-0.5 text-[11px] text-amber-300/80">NOT CONFIGURED</div>
          )}
          <div className="mt-0.5 text-[8px] tracking-[0.16em] text-white/40">
            DESTINATION FOR LOCKED USDC
          </div>
        </div>
        <div className="bg-black px-3 py-2">
          <div className="text-[8px] tracking-[0.18em] text-white/40">TREASURY (3% FEE)</div>
          {treasuryConfigured ? (
            <a
              href={explorerAddressUrl(treasuryAddr)}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block text-[11px] tabular-nums truncate underline decoration-white/20 hover:text-white"
            >
              {treasuryAddr.slice(0, 10)}…{treasuryAddr.slice(-6)}
            </a>
          ) : (
            <div className="mt-0.5 text-[11px] text-amber-300/80">NOT CONFIGURED</div>
          )}
          <div className="mt-0.5 text-[8px] tracking-[0.16em] text-white/40">
            FEE ROUTED ON RELEASE
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * OnChainLockButton — the Step 1 CTA that triggers the actual wallet popup.
 * Renders the full tx state machine inline so the user always knows what's
 * happening: signing → broadcasting → confirming → confirmed (or error).
 */
function OnChainLockButton({
  amountUsdc,
  state,
  txHash,
  error,
  isConnected,
  onCorrectChain,
  onRun,
  onReset,
}: {
  amountUsdc: string;
  state: EscrowFundingState;
  txHash: string | null;
  error: string | null;
  isConnected: boolean;
  onCorrectChain: boolean;
  onRun: () => void;
  onReset: () => void;
}) {
  const escrowConfigured = isEscrowConfigured();
  const inFlight =
    state === "preparing" || state === "signing" || state === "broadcasting" || state === "confirming";
  const showButton = state === "idle" || state === "error";
  const blocked = !isConnected || !escrowConfigured;

  const label = (() => {
    switch (state) {
      case "preparing":
        return "PREPARING…";
      case "signing":
        return "AWAITING WALLET SIGNATURE…";
      case "broadcasting":
        return "BROADCASTING TO BASE SEPOLIA…";
      case "confirming":
        return "WAITING FOR CONFIRMATION…";
      default:
        return null;
    }
  })();

  return (
    <div className="relative mt-0.5 space-y-1">
      {showButton && (
        <div className="relative">
          {!blocked && (
            <span className="absolute inset-0 animate-ping rounded-none border border-white/40 pointer-events-none" />
          )}
          <button
            type="button"
            disabled={blocked}
            onClick={onRun}
            className="relative w-full border border-white bg-white py-1.5 text-[8px] tracking-[0.12em] text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            LOCK {amountUsdc} USDC
          </button>
        </div>
      )}

      {inFlight && label && (
        <div className="border border-white/30 bg-white/[0.04] px-1.5 py-1 text-[8px] tracking-[0.12em] text-white/80 animate-pulse">
          {label}
        </div>
      )}

      {state === "confirmed" && txHash && (
        <div className="border border-white/30 px-1.5 py-1 text-[8px] tracking-[0.12em] space-y-0.5">
          <div className="text-white">CONFIRMED</div>
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-white/70 underline decoration-white/30 hover:text-white"
          >
            {txHash.slice(0, 12)}…{txHash.slice(-6)}
          </a>
        </div>
      )}

      {state === "error" && error && (
        <button
          type="button"
          onClick={onReset}
          className="mt-0.5 w-full border border-white/25 py-1 text-[8px] tracking-[0.12em] text-white/60 hover:bg-white/10"
        >
          RETRY LOCK
        </button>
      )}

      {!escrowConfigured && (
        <div className="border border-amber-400/40 bg-amber-400/10 px-1.5 py-1 text-[8px] leading-snug text-amber-200/85">
          Escrow wallet not configured. Set VITE_ESCROW_WALLET in env to enable on-chain locking.
        </div>
      )}
      {escrowConfigured && !isConnected && (
        <div className="border border-white/20 px-1.5 py-1 text-[8px] tracking-[0.1em] text-white/50">
          CONNECT WALLET FIRST
        </div>
      )}
      {isConnected && !onCorrectChain && state === "idle" && (
        <div className="border border-white/20 px-1.5 py-1 text-[8px] tracking-[0.1em] text-white/50">
          WRONG CHAIN · WILL SWITCH ON LOCK
        </div>
      )}
    </div>
  );
}

function VerifyView({
  mode,
  activeJobId,
  activeListingId,
  onOpenProgress,
}: {
  mode: TradingMode;
  activeJobId: string | null;
  activeListingId: string | null;
  onOpenProgress?: () => void;
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

  const {
    snapshot: activeJobSnapshot,
    pipelineSteps,
    unifiedLabel,
    running: jobRunning,
    outcome: jobOutcome,
    progressPercent,
  } = useVerificationJobState(activeJobId);

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
      if (!activeJobId) loadComposition();
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

  const activeProgressRows = useMemo<VerifyFeedRow[]>(() => {
    if (!activeJobId) return [];
    const assetLabel = activeListingId
      ? `LST-${activeListingId.slice(-6).toUpperCase()}`
      : `JOB-${activeJobId.slice(-6).toUpperCase()}`;
    const fallbackTs = activeJobSnapshot?.snapshotAt ?? new Date().toISOString();
    return pipelineSteps.map(({ step, result, message }) => ({
      ts: fallbackTs,
      asset: assetLabel,
      step,
      hash:
        step === "FINALIZE" && activeJobSnapshot?.proof?.proofHash
          ? `${activeJobSnapshot.proof.proofHash.slice(0, 6)}…${activeJobSnapshot.proof.proofHash.slice(-4)}`
          : "—",
      result,
      latency: "—",
      method: "DIRECT_KEY_TEST",
      jobId: activeJobId,
      _hint: message,
    }));
  }, [activeJobId, activeListingId, activeJobSnapshot, pipelineSteps]);

  const tableRows = useMemo(() => {
    if (activeJobId) return activeProgressRows;
    return liveFeed;
  }, [activeJobId, activeProgressRows, liveFeed]);

  const activeComposition = useMemo(() => {
    if (!activeJobId) return null;

    const manifest = activeJobSnapshot?.proof?.probeManifest;
    const bucketFromParadigm = (paradigm: string) => {
      if (paradigm === "A" || paradigm === "G") return "conn" as const;
      if (paradigm === "L5" || paradigm === "ZK") return "zk" as const;
      if (paradigm === "TEE") return "tee" as const;
      if (paradigm === "F") return "sig" as const;
      if (paradigm === "C") return "quota" as const;
      return "sig" as const;
    };

    let rows: { label: string; pct: number; throughputPerSec: number; failed?: boolean }[];
    if (manifest?.length) {
      const counts = { conn: 0, connFail: 0, zk: 0, tee: 0, sig: 0, quota: 0 };
      let probeTotal = 0;
      for (const probe of manifest) {
        if (probe.result === "SKIP") continue;
        probeTotal++;
        const bucket = bucketFromParadigm(probe.paradigm);
        counts[bucket]++;
        if (bucket === "conn" && probe.result === "FAIL") counts.connFail++;
      }
      const share = (n: number) => (probeTotal > 0 ? Math.round((n / probeTotal) * 100) : 0);
      rows = [
        {
          label: "Connectivity (L1)",
          pct: counts.connFail > 0 ? 0 : share(counts.conn),
          throughputPerSec: 0,
          failed: counts.connFail > 0,
        },
        { label: "ZK-PROOF (Compute)", pct: share(counts.zk), throughputPerSec: 0 },
        { label: "TEE Attestation", pct: share(counts.tee), throughputPerSec: 0 },
        { label: "Signature Chain", pct: share(counts.sig), throughputPerSec: 0 },
        { label: "Quota Check", pct: share(counts.quota), throughputPerSec: 0 },
      ];
    } else {
      const pctFor = (step: string) => {
        const s = pipelineSteps.find((p) => p.step === step);
        if (!s || s.status === "pending") return 0;
        if (s.status === "running") return 50;
        if (s.status === "fail") return 0;
        return 100;
      };
      rows = [
        { label: "Connectivity (L1)", pct: pctFor("CONNECTIVITY"), throughputPerSec: 0 },
        { label: "ZK-PROOF (Compute)", pct: pctFor("FINALIZE"), throughputPerSec: 0 },
        { label: "TEE Attestation", pct: pctFor("RISK_ANALYSIS"), throughputPerSec: 0 },
        { label: "Signature Chain", pct: pctFor("RATE_LIMIT"), throughputPerSec: 0 },
        { label: "Quota Check", pct: pctFor("QUOTA"), throughputPerSec: 0 },
      ];
    }

    return { progress: progressPercent, rows };
  }, [activeJobId, activeJobSnapshot, pipelineSteps, progressPercent]);

  const feedLabel = activeJobId
    ? jobRunning
      ? `LIVE · ${unifiedLabel}`
      : jobOutcome
        ? `LIVE · ${jobOutcome}`
        : `LIVE · ${unifiedLabel}`
    : feedConnected
      ? liveFeed.length > 0
        ? "LIVE"
        : "EMPTY"
      : "OFFLINE";

  const compositionBadge = activeJobId
    ? jobRunning
      ? "LIVE JOB"
      : jobOutcome
        ? jobOutcome
        : "LIVE JOB"
    : compositionLive
      ? "API"
      : "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0">
        <VerificationModeBanner method={mode === "SELL" ? "DIRECT_KEY_TEST" : "BUYER_REVERIFY"} />
      </div>
      {activeJobId && (
        <div className="shrink-0 border-b border-white/15 px-4 py-2 space-y-2">
          <div className="flex justify-end">
            {onOpenProgress && (
              <button
                type="button"
                onClick={onOpenProgress}
                className="border border-white/30 px-2 py-1 text-[9px] tracking-[0.16em] hover:bg-white/10"
              >
                OPEN PROGRESS POPUP
              </button>
            )}
          </div>
          <VerificationJobPanel jobId={activeJobId} listingId={activeListingId} />
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-12 overflow-hidden">
        <div className="col-span-8 flex min-h-0 flex-col border-r border-white/15">
          <Panel
            title="Verification Pipeline · Real-Time"
            code="F2.1"
            className="flex-1 min-h-0 border-0"
            scrollBody={false}
            right={
              <span className="flex items-center gap-1">
                <Pulse /> {feedLabel}
              </span>
            }
          >
            <TokentaScrollArea
              orientation="vertical"
              className="min-h-0 flex-1"
              viewportClassName="h-full min-h-[12rem]"
              ariaLabel="Verification pipeline real-time table"
            >
          <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10 border-b border-white/15 bg-black text-white/40">
                  <tr>
                    {["TIMESTAMP", "ASSET", "STEP", "ATTEST HASH", "RESULT", "LATENCY"].map((h) => (
                      <th key={h} className="px-3 py-1.5 text-left font-normal tracking-[0.14em]">
                        {h}
                      </th>
                    ))}
                  </tr>
            </thead>
            <tbody>
                  {tableRows.length === 0 && feedConnected && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center tracking-[0.12em] text-white/40">
                        No verification events yet — run LIST API or wait for network jobs.
                      </td>
                    </tr>
                  )}
                  {tableRows.map((v, i) => (
                    <tr
                      key={`${"jobId" in v ? (v as VerifyFeedRow).jobId : i}-${v.step}-${v.ts}`}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="px-3 py-1.5 tabular-nums text-white/60">
                        {formatFeedTimestamp(v.ts)}
                      </td>
                  <td className="px-3 py-1.5 tracking-[0.1em]">{v.asset}</td>
                      <td className="px-3 py-1.5">
                        <Tag tone="mute">{v.step}</Tag>
                      </td>
                  <td className="px-3 py-1.5 text-white/60">{v.hash}</td>
                      <td className="px-3 py-1.5">
                        <Tag tone={resultTagTone(v.result)}>{v.result}</Tag>
                      </td>
                  <td className="px-3 py-1.5 tabular-nums text-white/70">{v.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
            </TokentaScrollArea>
        </Panel>
      </div>
        <div className="col-span-4 flex min-h-0 flex-col">
          <Panel
            title="Proof Composition"
            code="F2.2"
            className="min-h-0 flex-1 border-0 border-b-0"
            scrollBody={false}
            right={<span className="text-white/40">{compositionBadge}</span>}
          >
            <TokentaScrollArea
              orientation="vertical"
              className="min-h-0 flex-1"
              viewportClassName="h-full min-h-[8rem]"
              ariaLabel="Proof composition bars"
            >
              <div className="space-y-3 p-4">
                {(activeComposition?.rows ?? (compositionLive ? composition ?? [] : [])).length ? (
                  (activeComposition?.rows ?? composition ?? []).map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/60">{b.label}</span>
                        <span>{activeComposition ? `${b.pct}%` : `${b.throughputPerSec}/s`}</span>
              </div>
                      <div className="mt-1 h-1 bg-white/10">
                        <div
                          className={`h-full ${"failed" in b && b.failed ? "bg-red-500" : "bg-white"}`}
                          style={{ width: `${"failed" in b && b.failed ? 100 : b.pct}%` }}
                        />
          </div>
              </div>
                  ))
                ) : (
                  <p className="text-[11px] text-white/40">No composition data yet.</p>
                )}
          </div>
            </TokentaScrollArea>
        </Panel>
          {mode === "SELL" && (
            <MyListingsPanel
              onPublishSuccess={() => {/* refreshed via interval */}}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ORDERS ---------------- */

function OrdersView({
  mode,
  walletAddress,
  selectedOrderId,
  activeVerificationJobId,
  onSelectOrder,
  onOpenChat,
  onOpenVerify,
  onOpenEscrow,
  onRequestPrePurchase,
}: {
  mode: TradingMode;
  walletAddress: string | null;
  selectedOrderId: string | null;
  activeVerificationJobId: string | null;
  onSelectOrder: (id: string | null) => void;
  onOpenChat: (id: string) => void;
  onOpenVerify: () => void;
  onOpenEscrow: () => void;
  onRequestPrePurchase: (orderId: string) => void;
}) {
  const [apiOrders, setApiOrders] = useState<TerminalOrderRow[]>([]);

  useEffect(() => {
    void fetchTerminalOrders({
      wallet: walletAddress ?? undefined,
      role: mode === "BUY" ? "buyer" : "seller",
    }).then(setApiOrders);
  }, [walletAddress, mode]);

  const lifecycleOrder = selectedOrderId
    ? apiOrders.find((o) => o.orderId === selectedOrderId) ?? apiOrders[0]
    : apiOrders[0];

  if (selectedOrderId) {
    return (
      <OrderDetailView
        orderId={selectedOrderId}
        mode={mode}
        activeJobId={activeVerificationJobId}
        onBack={() => onSelectOrder(null)}
        onOpenChat={() => onOpenChat(selectedOrderId)}
        onOpenVerify={onOpenVerify}
        onOpenEscrow={onOpenEscrow}
        onRequestPrePurchase={() => onRequestPrePurchase(selectedOrderId)}
      />
    );
  }

  const apiAsDisplay = apiOrders.map((o) => ({
    id: o.orderId,
    side: (mode === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL",
    asset: `LST-${o.listingId.slice(-6).toUpperCase()}`,
    qty: String(o.quantity),
    price: o.amountUsdc,
    value: o.amountUsdc,
    escrow: o.status === "ESCROW_FUNDED" ? "FUNDED" : o.status === "SETTLED" ? "RELEASED" : "PENDING",
    status:
      o.status === "SETTLED"
        ? "SETTLED"
        : o.status === "ESCROW_FUNDED"
          ? "VERIFYING"
          : "MATCHING",
    counterparty:
      mode === "SELL"
        ? o.buyerWallet
          ? `${o.buyerWallet.slice(0, 6)}…`
          : "—"
        : o.sellerWallet
          ? `${o.sellerWallet.slice(0, 6)}…`
          : "—",
  }));

  const filtered = apiAsDisplay;

  const sumStatus = (pred: (s: string) => boolean) =>
    apiOrders
      .filter((o) => pred(o.status))
      .reduce((acc, o) => acc + Number(o.amountUsdc || 0), 0)
      .toFixed(2);

  const lockedUsdc = sumStatus((s) => s === "ESCROW_FUNDED");
  const pendingUsdc = sumStatus((s) => s === "PENDING_ESCROW");
  const releasedUsdc = sumStatus((s) => s === "SETTLED");

  const lifecycleSteps = (() => {
    const o = lifecycleOrder;
    const st = o?.status ?? "PENDING_ESCROW";
    return [
      ["ORDER CREATED", o?.createdAt?.slice(11, 19) ?? "—", "DONE"],
      [
        "ESCROW FUNDED",
        "—",
        st === "PENDING_ESCROW" ? "ACTIVE" : "DONE",
      ],
      [
        "VERIFY IN PROGRESS",
        "—",
        st === "ESCROW_FUNDED" ? "ACTIVE" : st === "SETTLED" ? "DONE" : "PENDING",
      ],
      ["SETTLEMENT", "—", st === "SETTLED" ? "DONE" : "PENDING"],
    ] as const;
  })();

  const isBuy = mode === "BUY";

  // Count breakdown for the role-specific status banner.
  const activeCount = apiOrders.filter((o) => o.status !== "SETTLED").length;
  const settledCount = apiOrders.filter((o) => o.status === "SETTLED").length;
  const needsActionCount = apiOrders.filter((o) =>
    isBuy ? o.status === "PENDING_ESCROW" || o.status === "ESCROW_FUNDED" : o.status === "ESCROW_FUNDED",
  ).length;

  const headerTitle = isBuy ? "MY PURCHASES" : "MY SALES";
  const headerSubtitle = isBuy
    ? "APIs you have purchased or are paying for via Tokenta escrow"
    : "API listings you have sold or are awaiting buyer confirmation";
  const emptyMessage = isBuy
    ? "You haven't purchased any APIs yet. Switch to the Market tab to browse verified listings."
    : "You haven't sold any APIs yet. List an API first, then sales will appear here once buyers purchase.";

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Prominent role-aware header banner */}
      <div className="shrink-0 border-b border-white/15 bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="flex items-start justify-between gap-6 px-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center border ${
                isBuy ? "border-white/40 bg-white text-black" : "border-white/40 bg-white text-black"
              }`}
            >
              {isBuy ? (
                <ArrowDownRight className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[18px] tracking-[0.18em] text-white font-medium">
                {headerTitle}
              </div>
              <div className="mt-0.5 text-[10px] tracking-[0.12em] text-white/45">
                F4 · {mode} MODE · {headerSubtitle}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <StatTile label={isBuy ? "ACTIVE PURCHASES" : "ACTIVE SALES"} value={activeCount} />
            <StatTile label="NEEDS ACTION" value={needsActionCount} accent={needsActionCount > 0} />
            <StatTile label="COMPLETED" value={settledCount} muted />
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-12 min-h-0">
        <div className="col-span-9 border-r border-white/15 min-h-0 flex flex-col">
          <Panel
            title={isBuy ? "Purchases · Orders You Are Buying" : "Sales · Orders You Are Selling"}
            code="F4.1"
            className="flex-1 min-h-0 border-0"
            right={
              <span className="flex items-center gap-2">
                <span className="text-white/40">SHOWING {filtered.length}</span>
                <span className="h-3 w-px bg-white/20" />
                <span className="text-white/60">{mode} ROLE</span>
              </span>
            }
          >
          <table className="w-full text-[11px]">
            <thead className="text-white/40 border-b border-white/15">
                <tr>
                  {[
                    "ORDER ID",
                    "API LISTING",
                    "QTY",
                    "VALUE",
                    "ESCROW",
                    "STATUS",
                    isBuy ? "SELLER" : "BUYER",
                    "ACTION",
                  ].map((h) => (
                    <th key={h} className="px-3 py-1.5 text-left tracking-[0.14em] font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
            </thead>
            <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-white/40 tracking-[0.12em]">
                      <div className="mb-2 text-[12px] text-white/60">No orders yet</div>
                      <div className="text-[10px] tracking-[0.14em]">{emptyMessage}</div>
                    </td>
                  </tr>
                )}
                {filtered.map((o) => {
                  const needsAction =
                    isBuy &&
                    (o.escrow === "PENDING" || o.escrow === "FUNDED") &&
                    o.status !== "SETTLED";
                  return (
                    <tr
                      key={o.id}
                      onClick={() => onSelectOrder(o.id)}
                      className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                        needsAction ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <td className="px-3 py-2 tracking-[0.1em] underline decoration-white/30">
                        {o.id.slice(-10).toUpperCase()}
                      </td>
                  <td className="px-3 py-2">{o.asset}</td>
                  <td className="px-3 py-2 tabular-nums">{o.qty}</td>
                      <td className="px-3 py-2 tabular-nums">{o.value} USDC</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                          {o.escrow === "RELEASED" ? (
                            <Unlock className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                      {o.escrow}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                        <Tag
                          tone={
                            o.status === "DISPUTED"
                              ? "warn"
                              : o.status === "SETTLED"
                                ? "mute"
                                : "default"
                          }
                        >
                          {o.status}
                        </Tag>
                  </td>
                  <td className="px-3 py-2 text-white/60">{o.counterparty}</td>
                      <td className="px-3 py-2">
                        {needsAction ? (
                          <span className="inline-flex items-center gap-1 border border-white/40 px-1.5 py-0.5 text-[9px] tracking-[0.16em] text-white">
                            ACT NOW <ChevronRight className="w-3 h-3" />
                          </span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                        )}
                      </td>
                </tr>
                  );
                })}
            </tbody>
          </table>
        </Panel>
      </div>

        <div className="col-span-3 flex flex-col min-h-0">
          <Panel title="Escrow & Deposits" code="F4.2" className="border-0">
            <div className="p-3 border-b border-white/15">
              <DepositBreakdownPanel
                totalUsdc={Number(pendingUsdc) || Number(lockedUsdc) || 0}
                scenario="P2P"
              />
            </div>
          <div className="grid grid-cols-1 gap-px bg-white/10 text-[11px]">
            {[
                ["PENDING ESCROW", pendingUsdc],
                ["LOCKED (FUNDED)", lockedUsdc],
                [isBuy ? "PAID OUT" : "RECEIVED", releasedUsdc],
              ].map(([k, v]) => (
                <div key={k} className="bg-black px-3 py-2 flex justify-between">
                  <span className="text-white/40 tracking-[0.14em]">{k}</span>
                  <span className="tabular-nums">{v} USDC</span>
                </div>
            ))}
          </div>
        </Panel>
          <Panel
            title={`Lifecycle · ${lifecycleOrder?.orderId?.slice(-8).toUpperCase() ?? "—"}`}
            code="F4.3"
            className="border-t-0 flex-1 border-0"
          >
          <ol className="p-3 space-y-3 text-[11px]">
              {lifecycleSteps.map(([k, t, s], i) => (
              <li key={i} className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 ${
                      s === "DONE"
                        ? "bg-white"
                        : s === "ACTIVE"
                          ? "bg-white animate-pulse"
                          : "border border-white/30"
                    }`}
                  />
                <span className="flex-1 tracking-[0.1em]">{k}</span>
                <span className="text-white/50 tabular-nums">{t}</span>
              </li>
            ))}
          </ol>
        </Panel>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`min-w-[88px] border px-3 py-2 ${
        accent
          ? "border-white bg-white/[0.04]"
          : muted
            ? "border-white/15 bg-transparent"
            : "border-white/25 bg-white/[0.02]"
      }`}
    >
      <div
        className={`text-[8px] tracking-[0.18em] ${
          accent ? "text-white" : muted ? "text-white/35" : "text-white/45"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 text-[18px] font-medium tabular-nums ${
          accent ? "text-white" : muted ? "text-white/40" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------------- CHAT ---------------- */

function ChatView({
  mode,
  buySource,
  walletAddress,
  activeOrderId,
  onSelectOrder,
  onRotationJobStarted,
}: {
  mode: TradingMode;
  buySource: BuyMarketSource;
  walletAddress: string | null;
  activeOrderId: string | null;
  onSelectOrder: (id: string) => void;
  onRotationJobStarted?: (jobId: string) => void;
}) {
  const { requireAuth } = useAuth();
  const [roomOrders, setRoomOrders] = useState<TerminalOrderRow[]>([]);
  const [apiOrder, setApiOrder] = useState<TerminalOrderRow | null>(null);
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null);

  const resolvedOrderId =
    activeOrderId && roomOrders.some((o) => o.orderId === activeOrderId)
      ? activeOrderId
      : roomOrders[0]?.orderId ?? activeOrderId;

  useEffect(() => {
    void fetchTerminalOrders({
      wallet: walletAddress ?? undefined,
      role: mode === "BUY" ? "buyer" : "seller",
    }).then((rows) => {
      setRoomOrders(rows);
      if (!activeOrderId && rows[0]) onSelectOrder(rows[0].orderId);
    });
  }, [walletAddress, mode, activeOrderId, onSelectOrder]);

  useEffect(() => {
    if (!resolvedOrderId?.startsWith("ord_")) return;
    void fetchTerminalOrder(resolvedOrderId).then(setApiOrder);
    void fetchTerminalOrderEscrow(resolvedOrderId).then((e) => {
      if (e?.status && e.status !== "NOT_FOUND") setEscrowStatus(e.status);
    });
  }, [resolvedOrderId]);

  const [orderMessages, setOrderMessages] = useState<
    { ts: string; from: string; body: string }[]
  >([]);
  const [messageInput, setMessageInput] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!resolvedOrderId) return;
    let cancelled = false;
    const load = () =>
      void fetchOrderRoomMessages(resolvedOrderId).then((rows) => {
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
  }, [resolvedOrderId]);

  const isTokentaDirect = buySource === "TOKENTA_DIRECT";
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
    if (!resolvedOrderId) return;
    const res = await runOrderRoomAction(resolvedOrderId, action, payload);
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
    const refreshed = await fetchOrderRoomMessages(resolvedOrderId);
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

  if (!resolvedOrderId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-[11px] tracking-[0.16em] text-white/50">
        Connect wallet and create a P2P order to open an order room.
      </div>
    );
  }

  const ctxAsset = apiOrder ? `LST-${apiOrder.listingId.slice(-6).toUpperCase()}` : "—";
  const ctxQty = apiOrder ? String(apiOrder.quantity) : "—";
  const ctxValue = apiOrder?.amountUsdc ?? "—";
  const ctxEscrow =
    escrowStatus === "RELEASED" || apiOrder?.status === "SETTLED"
      ? "RELEASED"
      : escrowStatus === "FUNDED" || apiOrder?.status === "ESCROW_FUNDED"
        ? "FUNDED"
        : "PENDING";

  return (
    <div className="flex-1 flex min-h-0 flex-col">
      <div className="border-b border-white/15 px-4 py-2 text-[11px] text-white/50">
        Order Room: encrypted P2P chat. Key rotation templates auto-post for rotation-required orders.
      </div>
    <div className="flex-1 grid grid-cols-12 min-h-0">
      <div className="col-span-3 border-r border-white/15">
        <Panel title="Order Rooms" code="F4.1" right={<span className="text-white/40">{roomOrders.length ? "API" : "—"}</span>}>
          <ul className="text-[11px]">
            {roomOrders.map((o) => (
              <li
                key={o.orderId}
                onClick={() => onSelectOrder(o.orderId)}
                className={`px-3 py-2 border-b border-white/10 flex items-center gap-2 cursor-pointer ${
                  o.orderId === resolvedOrderId ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <Dot className="w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <div className="tracking-[0.1em]">
                    {o.orderId} · LST-{o.listingId.slice(-6).toUpperCase()}
                  </div>
                  <div className="text-white/40 truncate">
                    {o.status} · {o.amountUsdc} USDC
                  </div>
                </div>
              </li>
            ))}
            {!roomOrders.length && (
              <li className="px-3 py-4 text-white/40">No API orders yet.</li>
            )}
          </ul>
        </Panel>
      </div>
      <div className="col-span-6 border-r border-white/15 flex flex-col">
        <Panel title={`${resolvedOrderId} · ${ctxAsset}`} code="F4.2" right={<span className="flex items-center gap-1"><Pulse /> ENCRYPTED</span>} className="flex-1">
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
              const sent = await postOrderRoomMessage(resolvedOrderId, text);
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
            {[
              ["ASSET", ctxAsset],
              ["QTY", ctxQty],
              ["VALUE", `${ctxValue} USDC`],
              ["ESCROW", ctxEscrow],
              ["STATUS", apiOrder?.status ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="bg-black px-3 py-2 flex justify-between">
                <span className="text-white/40 tracking-[0.14em]">{k}</span>
                <span>{v}</span>
              </div>
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
              orderId={resolvedOrderId}
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
                  amountUsdc: apiOrder?.amountUsdc ?? "0.00",
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
  hasActiveListing = false,
  completedOrders = 0,
  leaderboardOpen,
  onLeaderboardOpenChange,
}: {
  mode: TradingMode;
  score: ReputationScoreResponse | null;
  live: boolean;
  effectiveTimezone: string;
  hasActiveListing?: boolean;
  completedOrders?: number;
  leaderboardOpen: boolean;
  onLeaderboardOpenChange: (open: boolean) => void;
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

  const xpInput = {
    verifiedRuns: score?.executionHistory?.verifiedRuns ?? 0,
    anchoredReceipts: score?.executionHistory?.anchoredReceipts ?? 0,
    composite: score?.composite ?? null,
    hasActiveListing,
    completedOrders,
  };

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-12 overflow-hidden">
        <div className="col-span-3 flex min-h-0 flex-col overflow-hidden border-r border-white/15">
          <TokentaScrollArea
            orientation="vertical"
            className="min-h-0 flex-1"
            ariaLabel="Reputation trust metrics"
          >
            <div className="shrink-0 border-b border-white/15 p-2">
              <TrustLayerStatusPanel
                status={score?.status}
                tier={score?.tier}
                confidence={score?.confidence}
                verifiedRuns={score?.executionHistory?.verifiedRuns}
                anchoredReceipts={score?.executionHistory?.anchoredReceipts}
                nextMilestone={score?.nextMilestone}
                live={live}
                composite={score?.composite ?? null}
                hasActiveListing={hasActiveListing}
                completedOrders={completedOrders}
                onOpenLeaderboard={() => onLeaderboardOpenChange(true)}
              />
            </div>
            <Panel
              title="Trust Vector · Proof-Weighted"
              code="F5.1"
              className="border-0"
              scrollBody={false}
              right={<span className="text-white/40">{live ? "API" : "—"}</span>}
            >
              <div className="space-y-4 p-4">
                <ReputationLevelBadge xpInput={xpInput} />
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
                    <div className="mt-2 text-[10px] tracking-[0.18em] text-white/50">
                      CONFIDENCE {score.confidence} ({score.confidenceScore})
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-px bg-white/10 text-[10px]">
                  {[
                    ["VERIFIED RUNS", score?.executionHistory?.verifiedRuns ?? 0],
                    ["ANCHORED RECEIPTS", score?.executionHistory?.anchoredReceipts ?? 0],
                    ["CONFIDENCE", score?.confidence ?? "LOW"],
                    ["NEXT MILESTONE", score?.nextMilestone ?? "Complete 3 anchored verifications"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-black px-2 py-1.5">
                      <div className="text-[8px] tracking-[0.16em] text-white/35">{label}</div>
                      <div className="mt-0.5 text-white/75 leading-snug">{value}</div>
                </div>
              ))}
            </div>
                {isUnverified ? (
                  <p className="text-[11px] leading-relaxed text-white/50">
                    Reputation is derived from verifiable execution events, not reviews. Complete
                    anchored verifications to reveal your trust vector and earn XP toward the next
                    level.
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
                        <div className="mt-1 h-1 bg-white/10">
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
                  <div className="space-y-1 border-t border-white/10 pt-2 text-[10px] text-white/50">
                    {score.compliance.positiveFactors.slice(0, 2).map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                )}
          </div>
        </Panel>
          </TokentaScrollArea>
      </div>
        <div className="col-span-8 flex min-h-0 flex-col overflow-hidden">
          <Panel
            title="Reputation Ledger · Append-Only"
            code="F5.2"
            className="min-h-0 flex-1 border-0"
            right={<span>{live ? "API · REPLAY" : "—"}</span>}
          >
          <table className="w-full text-[11px]">
              <thead className="border-b border-white/15 text-white/40">
                <tr>
                  {["TIME", "ACTOR", "EVENT", "DELTA", "SCORE"].map((h) => (
                    <th key={h} className="px-3 py-1.5 text-left font-normal tracking-[0.14em]">
                      {h}
                    </th>
                  ))}
                </tr>
            </thead>
            <tbody>
                {ledger.map((r, i) => (
                  <tr
                    key={`${r.occurredAt ?? r.ts}-${r.actor}-${i}`}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-3 py-1.5 tabular-nums text-white/60">
                      {formatTerminalTimestamp(r.occurredAt ?? r.ts, effectiveTimezone)}
                    </td>
                  <td className="px-3 py-1.5 tracking-[0.1em]">{r.actor}</td>
                    <td className="px-3 py-1.5">
                      <Tag tone={r.delta.startsWith("-") ? "warn" : "mute"}>{r.event}</Tag>
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">{r.delta}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.score}</td>
                </tr>
              ))}
                {!ledger.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-white/40">
                      No reputation events yet. Run your first verification to start earning XP.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
      <ReputationLeaderboardModal
        open={leaderboardOpen}
        onClose={() => onLeaderboardOpenChange(false)}
        xpInput={xpInput}
        tier={score?.tier}
        compositeDisplay={compositeDisplay}
        nextMilestone={score?.nextMilestone}
      />
    </>
  );
}

/* ---------------- WALLET ---------------- */

function WalletView({
  mode,
  walletAddress,
  onRequireAuth,
}: {
  mode: TradingMode;
  walletAddress: string | null;
  onRequireAuth: (label: string) => boolean;
}) {
  const [summary, setSummary] = useState<WalletSummaryResponse | null>(null);
  const [income, setIncome] = useState<SellerIncomeResponse | null>(null);
  const [live, setLive] = useState(false);
  const [amount, setAmount] = useState("100.00");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useTerminalToast();

  const refresh = useCallback(() => {
    void fetchTerminalWalletSummary().then((s) => {
      if (s) {
        setLive(true);
        setSummary(s);
      }
    });
    if (mode === "SELL" && walletAddress) {
      void fetchSellerIncome().then(setIncome);
    }
  }, [mode, walletAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const balances = summary?.balances ?? [
    { asset: "USDC", total: "0.00", available: "0.00", escrowed: "0.00", staked: "0.00", valueUsdc: "0.00" },
  ];
  const stream = summary?.settlementStream ?? [];

  const onPaymentAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!onRequireAuth(mode === "BUY" ? "Depositing funds" : "Withdrawing sale income")) return;
    setBusy(true);
    setActionMsg(null);
    try {
      if (mode === "BUY") {
        const s = await walletDepositTerminal(amount);
        if (!s) throw new Error("Deposit failed");
        setSummary(s);
        setActionMsg(`Deposited ${amount} USDC`);
      } else {
        const r = await walletWithdrawTerminal(amount);
        if (r?.summary) setSummary(r.summary);
        setActionMsg(
          r?.txHash
            ? `Withdrawn ${amount} USDC · tx ${r.txHash.slice(0, 16)}…`
            : `Withdrawn ${amount} USDC`,
        );
        void fetchSellerIncome().then(setIncome);
      }
      setLive(true);
    } catch (err) {
      showToast({
        title: mode === "BUY" ? "DEPOSIT FAILED" : "WITHDRAW FAILED",
        message: err instanceof Error ? err.message : "Action failed",
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-12 min-h-0">
      <div className="col-span-8 border-r border-white/15 flex flex-col">
        <Panel title="Balances" code="F6.1" right={<span className="text-white/40">{live ? "API" : "—"}</span>}>
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
          <form className="p-3 space-y-3" onSubmit={onPaymentAction}>
            {mode === "SELL" && income && (
              <div className="border border-white/20 p-2 text-[10px] space-y-1">
                <div className="text-white/40 tracking-[0.16em]">SALE INCOME</div>
                <div className="flex justify-between">
                  <span>Available</span>
                  <span className="tabular-nums">{income.availableUsdc} USDC</span>
          </div>
                <div className="flex justify-between text-white/50">
                  <span>Lifetime</span>
                  <span className="tabular-nums">{income.lifetimeEarnedUsdc} USDC</span>
          </div>
                <div className="flex justify-between text-white/50">
                  <span>Sales</span>
                  <span>{income.saleCount}</span>
                </div>
              </div>
            )}
            <div className="border border-white/20 px-2 py-1.5">
              <div className="text-[9px] tracking-[0.2em] text-white/40">AMOUNT</div>
              <input
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                className="mt-0.5 w-full bg-transparent text-[11px] tabular-nums outline-none"
              />
              <span className="text-[10px] text-white/40">USDC</span>
            </div>
            <Field label="NETWORK" value={summary?.network?.toUpperCase() ?? "BASE-SEPOLIA"} />
            <Field label="WALLET" value={walletAddress ? `${walletAddress.slice(0, 10)}…` : "NOT CONNECTED"} />
            {actionMsg && <p className="text-[11px] text-white/60">{actionMsg}</p>}
            <button
              type="submit"
              disabled={busy || !walletAddress}
              className="w-full py-2 bg-white text-black tracking-[0.24em] hover:bg-white/90 disabled:opacity-40"
            >
              {busy ? "PROCESSING…" : mode === "BUY" ? "DEPOSIT USDC" : "WITHDRAW TO WALLET"}
            </button>
          </form>
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

  const flow = data?.flow ?? [];
  const series = data?.flowSeries ?? [];
  const heatmap = data?.heatmap ?? [];
  const sla = data?.sla;
  const counterparties = data?.counterparties ?? [];

  return (
    <div className="flex-1 grid grid-cols-12 grid-rows-2 min-h-0">
      <div className="col-span-8 row-span-1 border-r border-b border-white/15">
        <Panel title={`Flow · ${mode === "BUY" ? "Spend by Asset Type" : "Revenue by Asset Type"}`} code="F7.1" right={<span className="text-white/40">{live ? "API" : "—"}</span>}>
          <div className="p-4 grid grid-cols-3 gap-px bg-white/10">
            {flow.length === 0 && (
              <div className="col-span-3 bg-black p-6 text-center text-[11px] text-white/40">
                No analytics yet. Complete trades to populate flow data.
              </div>
            )}
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
            {series.length === 0 ? (
              <div className="col-span-full flex h-full items-center justify-center text-[11px] text-white/40">—</div>
            ) : (
              series.map((h, i) => (
                <div key={i} className="bg-white" style={{ height: `${Math.min(h, 100)}%` }} />
              ))
            )}
          </div>
          <div className="px-4 pb-3 flex justify-between text-[10px] text-white/40 tracking-[0.18em]">
            <span>30D AGO</span><span>15D</span><span>TODAY</span>
          </div>
        </Panel>
      </div>
      <div className="col-span-4 row-span-1 border-b border-white/15">
        <Panel title="Counterparty Heatmap" code="F7.2" right={<span className="text-white/40">{live ? "API" : "—"}</span>}>
          <div className="p-3 grid grid-cols-7 gap-1">
            {heatmap.length === 0 ? (
              <div className="col-span-7 py-8 text-center text-[11px] text-white/40">No counterparty activity yet.</div>
            ) : (
              heatmap.map((op, i) => (
                <div key={i} className="aspect-square border border-white/10" style={{ background: `rgba(255,255,255,${op})` }} />
              ))
            )}
          </div>
          <div className="px-3 pb-3 text-[10px] text-white/40 tracking-[0.18em] flex justify-between">
            <span>LOW VOLUME</span><span>HIGH VOLUME</span>
          </div>
        </Panel>
      </div>
      <div className="col-span-6 row-span-1 border-r border-white/15">
        <Panel title="Verification SLA · 30D" code="F7.3" right={<span className="text-white/40">{live ? "API" : "—"}</span>}>
          <div className="p-4 grid grid-cols-2 gap-px bg-white/10">
            {[
              ["UPTIME COMMITMENT", sla?.uptimeCommitmentPct ?? "—"],
              ["ACTUAL", sla?.actualPct ?? "—"],
              ["MISS COUNT", sla != null ? String(sla.missCount) : "—"],
              ["CREDIT OWED", sla?.creditOwedUsdc != null ? `${sla.creditOwedUsdc} USDC` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="bg-black p-3"><div className="text-[10px] tracking-[0.2em] text-white/40">{k}</div><div className="text-[18px] tabular-nums mt-1">{v}</div></div>
            ))}
          </div>
          <div className="p-4">
            <div className="flex justify-between text-[10px] text-white/40 tracking-[0.18em] mb-1">
              <span>SLA TIMELINE</span>
              <span>{sla?.breachCount ?? 0} BREACHES</span>
            </div>
            <div className="grid grid-cols-30 gap-px" style={{ gridTemplateColumns: "repeat(30,minmax(0,1fr))" }}>
              {(sla?.timeline ?? []).map((t) => (
                <div key={t.day} className={`h-6 ${t.breach ? "bg-white" : "bg-white/15"}`} />
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <div className="col-span-6">
        <Panel title="Top Counterparties" code="F7.4" right={<span className="text-white/40">{live ? "API" : "—"}</span>}>
          <table className="w-full text-[11px]">
            <thead className="text-white/40 border-b border-white/15">
              <tr>{["RANK","ADDR / ENTITY","VOLUME","ORDERS","DELIVERY","REP"].map(h => <th key={h} className="px-3 py-1.5 text-left tracking-[0.14em] font-normal">{h}</th>)}</tr>
            </thead>
            <tbody>
              {counterparties.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                    No counterparty data yet.
                  </td>
                </tr>
              )}
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
  const [stats, setStats] = useState<{
    queueDepth: number;
    activeProbes: number;
    maxProbes: number;
    monitorLive: number;
    monitorStale: number;
    queueBackend: string;
    ok: boolean;
  } | null>(null);
  const [networkMs, setNetworkMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const t0 = performance.now();
      const m = await fetchMetricsHealth();
      if (cancelled) return;
      const elapsed = Math.round(performance.now() - t0);
      setNetworkMs(elapsed);
      const ok = m && (m.jobs_total > 0 || (m.success_rate ?? 0) > 0 || m.queue_backend !== undefined);
      setStats({
        queueDepth: m?.queue_depth ?? 0,
        activeProbes: (m as { provider_limiter?: { active: number; max: number } })?.provider_limiter?.active ?? 0,
        maxProbes: (m as { provider_limiter?: { active: number; max: number } })?.provider_limiter?.max ?? 0,
        monitorLive: m?.monitor_live ?? 0,
        monitorStale: m?.monitor_stale ?? 0,
        queueBackend: m?.queue_backend ?? "memory",
        ok: Boolean(ok),
      });
    };
    void load();
    const id = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const sysLabel = stats?.ok ? "SYS NOMINAL" : stats ? "SYS OFFLINE" : "SYS BOOTING";
  const sysColor = stats?.ok ? "" : stats ? "text-amber-300/80" : "text-white/40";
  const rpcLabel = networkMs != null ? `RPC ${networkMs}ms` : "RPC —";
  const queueLabel = stats ? `QUEUE ${stats.queueDepth} · ${stats.queueBackend.toUpperCase()}` : "QUEUE —";
  const probeLabel = stats ? `PROBES ${stats.activeProbes}/${stats.maxProbes}` : "PROBES —";

  return (
    <footer
      data-tour="bottom-bar"
      className="tokenta-terminal__footer border-t border-white/15 flex items-stretch tracking-[0.18em] text-white/50"
    >
      <div className="tokenta-footer__left tokenta-type-footer">
        <span className={`flex items-center gap-1.5 shrink-0 ${sysColor}`}>
          <Activity className="w-3 h-3 shrink-0" /> {sysLabel}
        </span>
        <span className="tokenta-footer__detail shrink-0">{rpcLabel}</span>
        <span className="tokenta-footer__detail shrink-0">{probeLabel}</span>
        <span className="tokenta-footer__detail shrink-0">{queueLabel}</span>
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

