import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../auth/AuthContext";

export function AuthPromptToast() {
  const { authPrompt, dismissAuthPrompt, login } = useAuth();

  return (
    <AnimatePresence>
      {authPrompt && (
        <motion.div
          className="fixed bottom-16 left-1/2 z-[180] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 border border-white/30 bg-black px-4 py-3 font-mono text-[11px] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
        >
          <p className="tracking-[0.06em] text-white/75">{authPrompt}</p>
          <motion.div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => login()}
              className="flex-1 border border-white bg-white py-1.5 text-[10px] tracking-[0.18em] text-black"
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={dismissAuthPrompt}
              className="border border-white/30 px-3 py-1.5 text-[10px] tracking-[0.18em] text-white/60"
            >
              DISMISS
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
