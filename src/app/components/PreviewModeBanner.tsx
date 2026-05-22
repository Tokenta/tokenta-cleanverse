import { motion } from "motion/react";
import { useAuth } from "../auth/AuthContext";

export function PreviewModeBanner() {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) return null;

  return (
    <motion.div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/20 bg-white/[0.04] px-4 py-1.5 text-[10px] tracking-[0.16em]">
      <span className="text-white/55">
        PREVIEW MODE — Explore the terminal. Connect to list, trade, escrow, and settle.
      </span>
      <button
        type="button"
        onClick={() => login()}
        className="shrink-0 border border-white bg-white px-3 py-1 text-[10px] tracking-[0.2em] text-black hover:bg-white/90"
      >
        SIGN IN
      </button>
    </motion.div>
  );
}
