import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import tokentaLogo from "../../assets/tokenta-logo.png";
import type { TradingMode } from "../trading-types";

export type Role = TradingMode;

const ROLE_META: Record<
  Role,
  { label: string; tagline: string; flow: string; Icon: typeof ArrowDownRight }
> = {
  BUY: {
    label: "BUY",
    tagline: "DISCOVER · VERIFY · SETTLE",
    flow: "BROWSE → VERIFY → ESCROW → RECEIVE KEY",
    Icon: ArrowDownRight,
  },
  SELL: {
    label: "SELL",
    tagline: "LIST · PROVE · EARN",
    flow: "LIST OR BUYBACK → VERIFY → ROTATE → SETTLE",
    Icon: ArrowUpRight,
  },
};

const DURATION_MS = 2600;

const logoGuardStyle = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitUserDrag: "none",
} as React.CSSProperties;

function ProtectedLogo({
  className,
  wrapperClassName,
}: {
  className: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={wrapperClassName}>
      <img
        src={tokentaLogo}
        alt=""
        role="presentation"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        className={`object-contain select-none pointer-events-none ${className}`}
        style={logoGuardStyle}
      />
    </div>
  );
}

type Props = {
  role: Role;
  onComplete: () => void;
};

export function RoleTransitionOverlay({ role, onComplete }: Props) {
  const meta = ROLE_META[role];
  const Icon = meta.Icon;

  useEffect(() => {
    const timer = setTimeout(onComplete, DURATION_MS);
    return () => clearTimeout(timer);
  }, [role, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col bg-black font-mono text-white overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-white/30"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.9, times: [0, 0.2, 0.7, 1], ease: "easeInOut" }}
      />

      <header
        className="relative z-10 flex items-center justify-between border-b border-white/15 px-4 py-2"
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.12 }}
      >
        <ProtectedLogo wrapperClassName="flex h-6 w-[11.5rem] shrink-0 items-center" className="h-6 w-full object-left opacity-90" />
        <span className="text-[10px] tracking-[0.28em] text-white/40">MODE SWITCH · IN PROGRESS</span>
        <span className="text-[10px] tracking-[0.18em] text-white/50 tabular-nums">SYS · HANDSHAKE</span>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <motion.div
          className="mb-8 flex items-center gap-3 border border-white/20 px-4 py-2 text-[10px] tracking-[0.28em] text-white/50"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          INITIALIZING WORKSPACE
        </motion.div>

        <motion.p
          className="text-[11px] tracking-[0.42em] text-white/40"
          initial={{ opacity: 0, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, letterSpacing: "0.42em" }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          WELCOME TO
        </motion.p>

        <motion.div
          className="mt-3 flex h-[clamp(2.5rem,6vw,3.25rem)] w-[min(20rem,82vw)] items-center justify-center"
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <ProtectedLogo
            wrapperClassName="flex h-full w-full items-center justify-center"
            className="h-full w-full"
          />
        </motion.div>

        <motion.div
          className="mt-4 flex items-center gap-3"
          initial={{ opacity: 0, x: role === "BUY" ? -28 : 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="flex h-10 w-10 items-center justify-center border border-white bg-white text-black"
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.35, delay: 0.7, type: "spring", stiffness: 320, damping: 22 }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </motion.span>
          <span className="text-[clamp(1.5rem,4vw,2.25rem)] tracking-[0.32em]">{meta.label}</span>
        </motion.div>

        <motion.p
          className="mt-6 text-[11px] tracking-[0.32em] text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.85 }}
        >
          {meta.tagline}
        </motion.p>

        <motion.p
          className="mt-3 max-w-lg text-center text-[10px] tracking-[0.14em] text-white/30"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.0 }}
        >
          {meta.flow}
        </motion.p>

        <motion.div
          className="mt-12 h-px w-full max-w-md overflow-hidden bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-white"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: DURATION_MS / 1000 - 0.35, delay: 0.35, ease: "linear" }}
          />
        </motion.div>
      </div>

      <motion.footer
        className="relative z-10 flex items-center justify-between border-t border-white/15 px-4 py-1.5 text-[10px] tracking-[0.18em] text-white/40"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <span>NON-CUSTODIAL · VERIFIABLE AI ASSET EXCHANGE</span>
        <span className="tabular-nums">{meta.label} MODE</span>
      </motion.footer>

      <motion.div
        className="pointer-events-none absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0, 1] }}
        transition={{ duration: 0.55, delay: DURATION_MS / 1000 - 0.55, ease: "easeIn" }}
      />
    </motion.div>
  );
}
