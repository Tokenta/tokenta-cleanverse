import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, LogOut, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

type WalletMenuProps = {
  onOpenWallet?: () => void;
  compact?: boolean;
};

export function WalletMenu({ onOpenWallet, compact }: WalletMenuProps) {
  const { ready, isAuthenticated, login, logout, address, shortAddress } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [address]);

  if (!ready) {
    return (
      <div className="border border-white/20 px-3 py-1.5 text-[10px] tracking-[0.18em] text-white/40">
        WALLET…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => login()}
        className="flex items-center gap-2 border border-white/30 bg-black px-3 py-1.5 text-[11px] tracking-[0.14em] hover:border-white"
        aria-label="Sign in with wallet or email"
      >
        <Wallet className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span>WALLET</span>}
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-white/30 bg-black px-3 py-1.5 text-[11px] tracking-[0.14em] hover:border-white"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Wallet className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span className="tabular-nums">{shortAddress}</span>}
        <ChevronDown className={`h-3 w-3 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[150] mt-1 min-w-[14rem] border border-white/25 bg-black py-1 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
        >
          <div className="border-b border-white/15 px-3 py-2">
            <div className="text-[9px] tracking-[0.22em] text-white/40">CONNECTED</div>
            <div className="mt-1 break-all text-[11px] tabular-nums text-white">{address}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={copyAddress}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] tracking-[0.16em] text-white/70 hover:bg-white hover:text-black"
          >
            <Copy className="h-3 w-3" />
            {copied ? "COPIED" : "COPY ADDRESS"}
          </button>
          {onOpenWallet && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenWallet();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] tracking-[0.16em] text-white/70 hover:bg-white hover:text-black"
            >
              <Wallet className="h-3 w-3" /> WALLET & SETTLE (F6)
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
            className="flex w-full items-center gap-2 border-t border-white/15 px-3 py-2 text-left text-[10px] tracking-[0.16em] text-white/70 hover:bg-white hover:text-black"
          >
            <LogOut className="h-3 w-3" /> DISCONNECT
          </button>
        </div>
      )}
    </div>
  );
}
