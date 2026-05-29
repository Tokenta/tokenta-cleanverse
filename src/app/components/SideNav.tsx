import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, Search, BookOpen } from "lucide-react";
import { NAV_ITEMS, type NavKey } from "../nav-config";
import type { BuyMarketSource, TradingMode } from "../trading-types";
import { useTokentaWallet } from "../hooks/useTokentaWallet";

const SIDEBAR_OPEN_KEY = "tokenta-sidebar-open";
export const SIDEBAR_WIDTH_OPEN = 224;
export const SIDEBAR_WIDTH_COLLAPSED = 44;

export function getInitialSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SIDEBAR_OPEN_KEY) !== "0";
}

export function persistSidebarOpen(open: boolean) {
  localStorage.setItem(SIDEBAR_OPEN_KEY, open ? "1" : "0");
}

export function SideNav({
  open,
  onToggle,
  nav,
  setNav,
  mode,
  buySource,
  onListApi,
  onBrowseMarket,
  onOpenTourMenu,
  tourCompleted,
}: {
  open: boolean;
  onToggle: () => void;
  nav: NavKey;
  setNav: (n: NavKey) => void;
  mode: TradingMode;
  buySource: BuyMarketSource;
  onListApi: () => void;
  onBrowseMarket: () => void;
  onOpenTourMenu: () => void;
  tourCompleted?: boolean;
}) {
  const { shortAddress } = useTokentaWallet();
  const activeItem = NAV_ITEMS.find((n) => n.key === nav);

  return (
    <motion.nav
      data-tour="side-nav"
      data-collapsed={open ? "false" : "true"}
      className="tokenta-sidenav relative flex shrink-0 flex-col overflow-hidden border-r border-white/15 bg-black"
      initial={false}
      animate={{ width: open ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_COLLAPSED }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      aria-label="Workspace navigation"
    >
      <div className="tokenta-sidenav__header flex shrink-0 items-center border-b border-white/15">
        {open && (
          <div className="tokenta-type-nav min-w-0 flex-1 truncate px-3 py-2 tracking-[0.28em] text-white/40">
            {mode} MODE · WORKSPACE
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={open}
          aria-label={open ? "Collapse workspace sidebar" : "Expand workspace sidebar"}
          className={`tokenta-sidenav__toggle flex h-9 shrink-0 items-center justify-center border-white/15 text-white/60 transition-colors hover:bg-white/5 hover:text-white ${
            open ? "w-9 border-l" : "w-full border-b"
          }`}
        >
          {open ? <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((n) => {
          const Icon = n.icon;
          const active = nav === n.key;
          const chatDisabled = n.key === "CHAT" && mode === "BUY" && buySource === "TOKENTA_DIRECT";
          return (
            <li key={n.key}>
              <button
                type="button"
                disabled={chatDisabled}
                title={open ? undefined : `${n.code} · ${n.label[mode]}`}
                onClick={() => !chatDisabled && setNav(n.key)}
                className={`tokenta-sidenav__item tokenta-type-nav w-full border-b border-white/10 transition-colors ${
                  open
                    ? "flex items-center gap-3 px-3 py-2 text-left"
                    : "flex flex-col items-center justify-center gap-0.5 px-1 py-2.5"
                } ${
                  chatDisabled
                    ? "cursor-not-allowed text-white/25"
                    : active
                      ? "bg-white text-black"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {open ? (
                  <>
                    <span className={`text-[10px] tracking-[0.18em] ${active ? "text-black/60" : "text-white/30"}`}>
                      {n.code}
                    </span>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="tokenta-sidenav__label min-w-0 flex-1 truncate tracking-[0.14em]">{n.label[mode]}</span>
                    {active && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" />}
                  </>
                ) : (
                  <>
                    <span className={`text-[9px] tracking-[0.14em] ${active ? "text-black/60" : "text-white/35"}`}>{n.code}</span>
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-black" : ""}`} />
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={`shrink-0 border-t border-white/15 ${open ? "space-y-2 p-3" : "flex flex-col items-center gap-2 py-2"}`}>
        {open ? (
          <>
            <div className="text-[10px] tracking-[0.22em] text-white/40">QUICK ACTION</div>
            {mode === "SELL" ? (
              <button
                type="button"
                onClick={onListApi}
                className="w-full border border-white bg-white py-2 text-[10px] tracking-[0.18em] text-black hover:bg-white/90"
              >
                + LIST API FOR SALE
              </button>
            ) : (
              <button
                type="button"
                onClick={onBrowseMarket}
                className="w-full border border-white bg-white py-2 text-[10px] tracking-[0.18em] text-black hover:bg-white/90"
              >
                BROWSE VERIFIED APIS
              </button>
            )}

            {/* Guide / Tour button */}
            <button
              type="button"
              onClick={onOpenTourMenu}
              className={`relative w-full flex items-center gap-2 border py-2 px-2 text-[10px] tracking-[0.14em] transition-colors hover:bg-white/[0.06] ${
                !tourCompleted
                  ? "border-white/40 text-white/80"
                  : "border-white/20 text-white/50"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>GUIDE · START TOUR</span>
              {!tourCompleted && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>

            <div className="pt-1 text-[10px] tracking-[0.22em] text-white/40">SESSION</div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/60">Signed</span>
              <span className="tabular-nums text-white/80">{shortAddress}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/60">Chain</span>
              <span>TOKENTA-L2</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/60">Latency</span>
              <span>42 ms</span>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              title={mode === "SELL" ? "List API for sale" : "Browse verified APIs"}
              onClick={mode === "SELL" ? onListApi : onBrowseMarket}
              className="flex h-8 w-8 items-center justify-center border border-white bg-white text-black hover:bg-white/90"
            >
              {mode === "SELL" ? <Plus className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
            </button>
            {/* Guide button (collapsed) */}
            <button
              type="button"
              title="Guide · Start Tour"
              onClick={onOpenTourMenu}
              className={`relative flex h-8 w-8 items-center justify-center border transition-colors hover:bg-white/[0.06] ${
                !tourCompleted ? "border-white/40 text-white/70" : "border-white/20 text-white/40"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {!tourCompleted && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
            <div className="w-full border-t border-white/10" />
            <span className="max-w-full truncate px-0.5 text-[8px] tracking-[0.12em] text-white/40" title={shortAddress}>
              {shortAddress}
            </span>
          </>
        )}
      </div>

      {!open && activeItem && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 top-9 w-0.5 bg-white"
          aria-hidden
        />
      )}
    </motion.nav>
  );
}

export function WorkspaceNavBar({
  nav,
  mode,
  sidebarOpen,
}: {
  nav: NavKey;
  mode: TradingMode;
  sidebarOpen: boolean;
}) {
  if (sidebarOpen) return null;
  const item = NAV_ITEMS.find((n) => n.key === nav);
  if (!item) return null;
  const Icon = item.icon;
  return (
    <div className="tokenta-workspace-navbar flex shrink-0 items-center gap-3 border-b border-white/15 bg-black px-4 py-1.5">
      <span className="text-[10px] tracking-[0.22em] text-white/40">{mode} MODE</span>
      <span className="h-3 w-px bg-white/20" />
      <span className="flex items-center gap-2 text-[10px] tracking-[0.18em] text-white">
        <span className="text-white/40">{item.code}</span>
        <Icon className="h-3.5 w-3.5" />
        {item.label[mode].toUpperCase()}
      </span>
      <span className="ml-auto text-[10px] tracking-[0.16em] text-white/35">SIDEBAR COLLAPSED · EXPAND FOR FULL NAV</span>
    </div>
  );
}
