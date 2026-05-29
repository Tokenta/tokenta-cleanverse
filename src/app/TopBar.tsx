import tokentaLogo from "../assets/tokenta-logo.png";
import type { TradingMode } from "./trading-types";
import { TradingModeSelector } from "./components/trading-ui";
import { WalletMenu } from "./components/WalletMenu";

export function TopBar({
  mode,
  onModeChange,
  modeSwitchDisabled,
  clock,
  onOpenWallet,
  networkLabel = "BASE SEPOLIA",
  chainId = 84532,
  blockNumber,
  gasPriceGwei,
  networkLive = false,
  reputationDisplay = "--",
  reputationTier = undefined,
  reputationLive = false,
  onOpenReputation,
}: {
  mode: TradingMode;
  onModeChange: (m: TradingMode) => void;
  modeSwitchDisabled?: boolean;
  clock: string;
  onOpenWallet?: () => void;
  networkLabel?: string;
  chainId?: number;
  blockNumber?: number | null;
  gasPriceGwei?: string | null;
  networkLive?: boolean;
  reputationDisplay?: string | null;
  reputationTier?: string;
  reputationLive?: boolean;
  onOpenReputation?: () => void;
}) {
  const blockDisplay =
    blockNumber != null ? `#${blockNumber.toLocaleString()}` : networkLive ? "…" : "—";
  const gasDisplay = gasPriceGwei != null ? `${gasPriceGwei} gwei` : networkLive ? "…" : "—";
  return (
    <header data-tour="topbar" className="tokenta-topbar shrink-0 border-b border-white/15 px-4 py-2 flex items-center justify-between gap-4">
      <div className="tokenta-topbar__brand flex items-center gap-6 min-w-0">
        <div className="flex h-6 w-[11.5rem] shrink-0 items-center">
          <img
            src={tokentaLogo}
            alt=""
            role="presentation"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            className="h-6 w-full object-contain object-left select-none pointer-events-none"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitUserDrag: "none",
            } as React.CSSProperties}
          />
        </div>
        <div className="tokenta-topbar__telemetry hidden md:flex items-center gap-4 tokenta-type-nav text-white/50">
          <span>
            NET{" "}
            <span className="text-white">
              {networkLabel} ({chainId}){networkLive ? "" : " · OFFLINE"}
            </span>
          </span>
          <span>
            BLOCK <span className="text-white">{blockDisplay}</span>
          </span>
          <span>
            GAS <span className="text-white">{gasDisplay}</span>
          </span>
        </div>
      </div>

      <div className="tokenta-topbar__center flex justify-center shrink-0">
        <TradingModeSelector mode={mode} onChange={onModeChange} disabled={modeSwitchDisabled} />
      </div>

      <div className="tokenta-topbar__actions flex items-center gap-4 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onOpenReputation}
          disabled={!onOpenReputation}
          className={`tokenta-topbar__reputation hidden md:flex flex-col text-right leading-tight tokenta-type-nav ${
            onOpenReputation ? "cursor-pointer hover:text-white transition-colors" : ""
          }`}
        >
          <span className="text-[10px] text-white/40 tracking-[0.2em]">
            REPUTATION{reputationLive ? "" : " · OFFLINE"}
          </span>
          <span className="tabular-nums">
            {reputationDisplay ?? "--"}{" "}
            <span className="text-white/40">
              / 100{reputationTier && reputationTier !== "NONE" ? ` · ${reputationTier}` : ""}
            </span>
          </span>
        </button>
        <WalletMenu onOpenWallet={onOpenWallet} />
        <div className="tokenta-type-nav text-white/50 tracking-[0.18em] tokenta-mono-spacing shrink-0">{clock}</div>
      </div>
    </header>
  );
}

