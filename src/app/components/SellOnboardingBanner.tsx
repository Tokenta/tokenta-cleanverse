import { ArrowRight, Plus, ShieldCheck, Receipt, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STORAGE_KEY = "tokenta-sell-onboard-dismissed";

export function hasSellerDismissedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function markSellerOnboardingDismissed() {
  localStorage.setItem(STORAGE_KEY, "1");
}

/**
 * Prominent onboarding banner shown at the top of the SELL workspace when the
 * seller has no listings yet. Walks them through the three-step journey:
 *   1. List API → 2. Verify → 3. Receive escrow.
 *
 * Hides after the seller publishes their first listing, or after they click
 * the close button (persisted in localStorage so it never reappears).
 */
export function SellOnboardingBanner({
  visible,
  onListApi,
  onStartTour,
  onDismiss,
}: {
  visible: boolean;
  onListApi: () => void;
  onStartTour: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0 overflow-hidden border-b border-white/15 bg-gradient-to-b from-white/[0.06] to-transparent"
        >
          <div className="relative px-4 py-4">
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss onboarding banner"
              className="absolute right-2 top-2 border border-white/15 p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] text-white/45">
              <Sparkles className="h-3 w-3" />
              WELCOME TO SELL MODE
            </div>
            <div className="mt-1 text-[16px] tracking-[0.14em] text-white font-medium">
              Start earning from your unused API quota
            </div>
            <div className="mt-1 text-[11px] tracking-[0.04em] text-white/55 max-w-2xl leading-relaxed">
              List your API key, run a quick verification (~25–75 token burn), and let buyers
              purchase through Tokenta&apos;s escrow. You receive payment only after the buyer
              confirms the API is working — no upfront deposit required.
            </div>

            {/* 3-step preview */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <StepCard
                step="1"
                icon={<Plus className="h-3.5 w-3.5" />}
                title="List API for Sale"
                description="Enter API key, quota, and ask price"
              />
              <StepCard
                step="2"
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                title="Verify & Publish"
                description="Auto-runs L1+L2 pipeline. Confirm to go live."
              />
              <StepCard
                step="3"
                icon={<Receipt className="h-3.5 w-3.5" />}
                title="Receive Escrow"
                description="Buyer pays, Tokenta holds, you receive funds"
              />
            </div>

            {/* CTAs */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onListApi}
                className="flex items-center gap-2 border border-white bg-white px-4 py-2 text-[10px] tracking-[0.18em] text-black hover:bg-white/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                START · LIST API FOR SALE
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onStartTour}
                className="flex items-center gap-2 border border-white/30 px-4 py-2 text-[10px] tracking-[0.16em] text-white hover:bg-white/[0.06] transition-colors"
              >
                TAKE GUIDED SELLER TOUR
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-white/15 bg-black/40 px-3 py-2.5 flex items-start gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-white/30 text-[10px] tracking-[0.1em] text-white">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] text-white">
          <span className="text-white/55">{icon}</span>
          {title}
        </div>
        <div className="mt-0.5 text-[9px] text-white/45 leading-snug">{description}</div>
      </div>
    </div>
  );
}
