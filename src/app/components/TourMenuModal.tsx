import { X, BookOpen, ShoppingCart, Store, LayoutGrid } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  TOUR_STEPS,
  SELL_TOUR_STEPS,
  BUY_TOUR_STEPS,
  SECTION_TOURS,
  type TourStep,
  type TourNavKey,
} from "../tour-steps";

const NAV_SECTION_LABELS: { key: TourNavKey; code: string; label: string }[] = [
  { key: "MARKET", code: "F1", label: "Market" },
  { key: "VERIFY", code: "F2", label: "Verification Pipeline" },
  { key: "ESCROW", code: "F3", label: "Escrow" },
  { key: "ORDERS", code: "F4", label: "Orders" },
  { key: "CHAT", code: "F5", label: "Order Room" },
  { key: "REPUTATION", code: "F6", label: "Reputation" },
  { key: "ANALYTICS", code: "F7", label: "Analytics" },
];

export function TourMenuModal({
  open,
  onClose,
  onStartTour,
}: {
  open: boolean;
  onClose: () => void;
  onStartTour: (steps: TourStep[], startIndex?: number) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-mono">
          <motion.div
            className="absolute inset-0 bg-black/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-lg border border-white/25 bg-black text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-white/15 px-4 py-2">
              <div className="text-[11px] tracking-[0.2em] text-white/70">
                <span className="text-white/30">GUIDE · </span>
                SELECT A TOUR
              </div>
              <button
                type="button"
                onClick={onClose}
                className="border border-white/30 p-1 text-white/60 hover:bg-white hover:text-black transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            <div className="p-4 space-y-4">
              {/* Full tour */}
              <section>
                <div className="mb-2 text-[9px] tracking-[0.22em] text-white/35">COMPLETE TOUR</div>
                <TourOption
                  icon={<LayoutGrid className="h-4 w-4 shrink-0" />}
                  title="Full Platform Tour"
                  description={`${TOUR_STEPS.length - 1} steps — every workspace from Market to Analytics`}
                  onClick={() => onStartTour(TOUR_STEPS, 0)}
                />
              </section>

              {/* Journey tours */}
              <section>
                <div className="mb-2 text-[9px] tracking-[0.22em] text-white/35">BY ROLE</div>
                <div className="space-y-1.5">
                  <TourOption
                    icon={<Store className="h-4 w-4 shrink-0" />}
                    title="Seller Journey"
                    description={`${SELL_TOUR_STEPS.length - 1} steps — List API, verify, publish, receive escrow`}
                    badge="SELL"
                    onClick={() => onStartTour(SELL_TOUR_STEPS, 0)}
                  />
                  <TourOption
                    icon={<ShoppingCart className="h-4 w-4 shrink-0" />}
                    title="Buyer Journey"
                    description={`${BUY_TOUR_STEPS.length - 1} steps — Browse, purchase, lock escrow, confirm receipt`}
                    badge="BUY"
                    onClick={() => onStartTour(BUY_TOUR_STEPS, 0)}
                  />
                </div>
              </section>

              {/* Section tours */}
              <section>
                <div className="mb-2 text-[9px] tracking-[0.22em] text-white/35">INDIVIDUAL WORKSPACES</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {NAV_SECTION_LABELS.map(({ key, code, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onStartTour(SECTION_TOURS[key], 0)}
                      className="flex items-center gap-2 border border-white/20 px-3 py-2 text-left text-[10px] hover:bg-white/[0.06] transition-colors"
                    >
                      <span className="text-[9px] tracking-[0.14em] text-white/35 shrink-0">{code}</span>
                      <span className="tracking-[0.1em] text-white/70">{label}</span>
                      <BookOpen className="ml-auto h-3 w-3 shrink-0 text-white/30" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function TourOption({
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 border border-white/20 px-3 py-2.5 text-left hover:bg-white/[0.06] hover:border-white/40 transition-colors"
    >
      <span className="mt-0.5 text-white/50">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.12em] text-white">
          {title}
          {badge && (
            <span className="border border-white/30 px-1.5 py-0.5 text-[8px] tracking-[0.18em] text-white/50">
              {badge}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[9px] leading-snug text-white/40">{description}</div>
      </div>
    </button>
  );
}
