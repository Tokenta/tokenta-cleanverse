import { CheckCircle2, ArrowRight, X, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

/**
 * Final congratulations modal shown after a seller successfully publishes their
 * first listing to the marketplace. Acts as the end of the seller onboarding
 * journey and shows next-step shortcuts (Orders, My Listings, Reputation).
 */
export function SellJourneyCongratsModal({
  open,
  onClose,
  onGoToOrders,
  onGoToMarket,
  onStartTour,
  listingLabel,
  estimatedRevenueUsdc,
}: {
  open: boolean;
  onClose: () => void;
  onGoToOrders: () => void;
  onGoToMarket: () => void;
  onStartTour?: () => void;
  listingLabel?: string | null;
  estimatedRevenueUsdc?: string | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[135] flex items-center justify-center p-4 font-mono">
          <motion.div
            className="absolute inset-0 bg-black/92"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-xl border border-white/30 bg-black text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-white/15 px-4 py-2">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/70">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-white/30">SJ.0 ·</span> SELLER JOURNEY COMPLETE
              </div>
              <button
                type="button"
                onClick={onClose}
                className="border border-white/30 p-1 text-white/60 hover:bg-white hover:text-black transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            <div className="px-6 py-6 space-y-5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative flex h-14 w-14 items-center justify-center border border-white/40 bg-white/[0.05]">
                  <CheckCircle2 className="h-7 w-7 text-white" strokeWidth={1.5} />
                  <span className="absolute inset-0 animate-ping border border-white/30 pointer-events-none" />
                </div>
                <div className="text-[20px] tracking-[0.18em] font-medium text-white">
                  CONGRATULATIONS
                </div>
                <p className="max-w-sm text-[11px] leading-relaxed text-white/65 tracking-[0.04em]">
                  Your API is now live on the Tokenta marketplace and visible to all verified
                  buyers. You have completed the full seller onboarding journey.
                </p>
              </div>

              {/* Listing summary */}
              {listingLabel && (
                <div className="grid grid-cols-2 gap-px bg-white/10 text-[11px]">
                  <div className="bg-black px-3 py-2 flex flex-col">
                    <span className="text-[9px] tracking-[0.22em] text-white/35">LISTING</span>
                    <span className="mt-0.5 text-white tabular-nums">{listingLabel}</span>
                  </div>
                  <div className="bg-black px-3 py-2 flex flex-col">
                    <span className="text-[9px] tracking-[0.22em] text-white/35">EST. REVENUE</span>
                    <span className="mt-0.5 text-white tabular-nums">
                      ${estimatedRevenueUsdc ?? "—"} USDC
                    </span>
                  </div>
                </div>
              )}

              {/* Next steps checklist */}
              <div className="space-y-2">
                <div className="text-[9px] tracking-[0.22em] text-white/40 mb-1">
                  WHAT HAPPENS NEXT
                </div>
                <NextStep
                  step="1"
                  title="Buyers can discover your listing"
                  description="Your API appears in the Market view with capability score, capacity band, and proof hash."
                />
                <NextStep
                  step="2"
                  title="Tokenta escrows buyer payments"
                  description="When a buyer purchases, their USDC is held by Tokenta — not by you."
                />
                <NextStep
                  step="3"
                  title="Buyer confirms the API works"
                  description="After testing, the buyer releases escrow. Funds (minus 2.5% fee) settle to your wallet."
                />
                <NextStep
                  step="4"
                  title="Track sales in Orders"
                  description="The Orders tab (F4) shows all sales with status, escrow state, and buyer wallet."
                />
              </div>

              {/* CTAs */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={onGoToOrders}
                  className="w-full flex items-center justify-between border border-white bg-white px-3 py-2.5 text-[11px] tracking-[0.18em] text-black hover:bg-white/90 transition-colors"
                >
                  <span>VIEW MY SALES IN ORDERS</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onGoToMarket}
                    className="flex items-center justify-center gap-1.5 border border-white/30 px-3 py-2 text-[10px] tracking-[0.16em] text-white hover:bg-white/[0.06] transition-colors"
                  >
                    SEE LISTING IN MARKET
                  </button>
                  {onStartTour && (
                    <button
                      type="button"
                      onClick={onStartTour}
                      className="flex items-center justify-center gap-1.5 border border-white/20 px-3 py-2 text-[10px] tracking-[0.16em] text-white/70 hover:bg-white/[0.06] transition-colors"
                    >
                      REPLAY SELLER TOUR
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function NextStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border border-white/10 px-3 py-2 text-[10px]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-white/30 text-[9px] tracking-[0.1em] text-white/70">
        {step}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-white tracking-[0.08em]">{title}</div>
        <div className="text-white/45 leading-snug">{description}</div>
      </div>
    </div>
  );
}
