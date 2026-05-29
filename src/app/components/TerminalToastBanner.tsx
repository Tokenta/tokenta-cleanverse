import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { TerminalToastKind } from "../context/TerminalToastContext";

const KIND_STYLES: Record<
  TerminalToastKind,
  { border: string; bg: string; title: string; body: string; accent: string }
> = {
  error: {
    border: "border-red-500/50",
    bg: "bg-red-950/95",
    title: "text-red-300",
    body: "text-red-100/90",
    accent: "bg-red-500",
  },
  warn: {
    border: "border-amber-400/50",
    bg: "bg-amber-950/95",
    title: "text-amber-200",
    body: "text-amber-100/90",
    accent: "bg-amber-400",
  },
  success: {
    border: "border-emerald-500/45",
    bg: "bg-emerald-950/95",
    title: "text-emerald-300",
    body: "text-emerald-100/90",
    accent: "bg-emerald-500",
  },
  info: {
    border: "border-white/35",
    bg: "bg-black/95",
    title: "text-white/70",
    body: "text-white/85",
    accent: "bg-white",
  },
};

const DEFAULT_TITLES: Record<TerminalToastKind, string> = {
  error: "ERROR",
  warn: "NOTICE",
  success: "SUCCESS",
  info: "INFO",
};

export function TerminalToastBanner({
  toast,
  onDismiss,
}: {
  toast: {
    id: string;
    message: string;
    kind: TerminalToastKind;
    title?: string;
  } | null;
  onDismiss: () => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[220] flex justify-center px-3 pt-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex w-full max-w-lg border shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-sm ${KIND_STYLES[toast.kind].border} ${KIND_STYLES[toast.kind].bg}`}
            initial={{ opacity: 0, y: -48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className={`w-0.5 shrink-0 self-stretch ${KIND_STYLES[toast.kind].accent}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1 px-3 py-2.5 pr-2">
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`text-[9px] tracking-[0.22em] ${KIND_STYLES[toast.kind].title}`}
                >
                  {toast.title ?? DEFAULT_TITLES[toast.kind]}
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="shrink-0 border border-white/20 p-0.5 text-white/50 hover:border-white/40 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p
                className={`mt-1 text-[11px] leading-relaxed tracking-[0.03em] ${KIND_STYLES[toast.kind].body}`}
              >
                {toast.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
