import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import tokentaLogo from "../../assets/tokenta-logo.png";
import { TOUR_STEPS, type TourPlacement, type TourStep } from "../tour-steps";

const PAD = 10;
const TOOLTIP_GAP = 16;
const VIEW_MARGIN = 16;
const ESTIMATED_CARD_W = 352;
const ESTIMATED_CARD_H = 300;

type Rect = { top: number; left: number; width: number; height: number };
type TooltipPos = { top: number; left: number };

function measureTarget(selector: string | undefined): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

function computeClampedTooltipPosition(
  rect: Rect,
  preferred: TourPlacement,
  cardW: number,
  cardH: number,
): TooltipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rectBottom = rect.top + rect.height;

  const spaceAbove = rect.top - VIEW_MARGIN;
  const spaceBelow = vh - VIEW_MARGIN - rectBottom;

  let placement = preferred;
  if (preferred === "top" && spaceAbove < cardH + TOOLTIP_GAP && spaceBelow > spaceAbove) {
    placement = "bottom";
  } else if (preferred === "bottom" && spaceBelow < cardH + TOOLTIP_GAP && spaceAbove > spaceBelow) {
    placement = "top";
  }

  let top = 0;
  let left = cx - cardW / 2;

  switch (placement) {
    case "top":
      top = rect.top - TOOLTIP_GAP - cardH;
      break;
    case "bottom":
      top = rectBottom + TOOLTIP_GAP;
      break;
    case "left":
      top = cy - cardH / 2;
      left = rect.left - TOOLTIP_GAP - cardW;
      break;
    case "right":
      top = cy - cardH / 2;
      left = rect.left + rect.width + TOOLTIP_GAP;
      break;
    default:
      top = rectBottom + TOOLTIP_GAP;
  }

  top = Math.max(VIEW_MARGIN, Math.min(top, vh - cardH - VIEW_MARGIN));
  left = Math.max(VIEW_MARGIN, Math.min(left, vw - cardW - VIEW_MARGIN));

  return { top, left };
}

type Props = {
  open: boolean;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: () => void;
  onSkip: () => void;
};

export function UserTour({ open, stepIndex, onStepChange, onComplete, onSkip }: Props) {
  const step = TOUR_STEPS[stepIndex];
  const isCongrats = step?.kind === "congrats";
  const isCenter = step?.kind === "center";
  const [spot, setSpot] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const placement = step?.placement ?? "bottom";

  const remeasure = useCallback(() => {
    if (!open || isCenter || isCongrats) {
      setSpot(null);
      return;
    }
    setSpot(measureTarget(step?.target));
  }, [open, isCenter, isCongrats, step?.target]);

  const updateTooltipPosition = useCallback(() => {
    if (!open || isCenter || isCongrats || !spot) {
      setTooltipPos(null);
      return;
    }
    const card = cardRef.current;
    const cardW = card?.offsetWidth ?? ESTIMATED_CARD_W;
    const cardH = card?.offsetHeight ?? ESTIMATED_CARD_H;
    setTooltipPos(computeClampedTooltipPosition(spot, placement, cardW, cardH));
  }, [open, isCenter, isCongrats, spot, placement]);

  useEffect(() => {
    remeasure();
    const onResize = () => remeasure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const id = window.setInterval(remeasure, 200);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.clearInterval(id);
    };
  }, [remeasure, stepIndex]);

  useLayoutEffect(() => {
    updateTooltipPosition();
  }, [updateTooltipPosition, stepIndex, spot]);

  useEffect(() => {
    if (!cardRef.current || isCenter || isCongrats) return;
    const observer = new ResizeObserver(() => updateTooltipPosition());
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [updateTooltipPosition, isCenter, isCongrats, stepIndex]);

  if (!open || !step) return null;

  const total = TOUR_STEPS.length - 1;
  const progress = isCongrats ? 100 : Math.round((stepIndex / total) * 100);

  const goNext = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      onComplete();
      return;
    }
    if (stepIndex === TOUR_STEPS.length - 2) {
      onStepChange(TOUR_STEPS.length - 1);
      return;
    }
    onStepChange(stepIndex + 1);
  };

  const goPrev = () => {
    if (stepIndex > 0) onStepChange(stepIndex - 1);
  };

  return (
    <div className="fixed inset-0 z-[110] font-mono text-white" aria-modal role="dialog">
      {/* Dim layer */}
      {!isCongrats && (
        <>
          {isCenter ? (
            <motion.div
              className="absolute inset-0 bg-black/88"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ) : spot ? (
            <motion.div
              className="absolute border border-white/70 bg-transparent pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.88)",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-black/88" />
          )}
        </>
      )}

      {!isCongrats && (
        <div className="absolute inset-0 z-[111] pointer-events-auto" aria-hidden />
      )}

      {isCongrats ? (
        <CongratsView onEnter={onComplete} />
      ) : isCenter ? (
        <motion.div
          key={step.id}
          className="pointer-events-auto absolute z-[112] w-[min(22rem,calc(100vw-2rem))] border border-white/25 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <TourCard
            step={step}
            stepIndex={stepIndex}
            totalSteps={TOUR_STEPS.length - 1}
            progress={progress}
            onPrev={goPrev}
            onNext={goNext}
            onSkip={onSkip}
            showPrev={stepIndex > 0}
            isLastContent={stepIndex === TOUR_STEPS.length - 2}
          />
        </motion.div>
      ) : (
        <motion.div
          ref={cardRef}
          key={step.id}
          className="pointer-events-auto absolute z-[112] w-[min(22rem,calc(100vw-2rem))] border border-white/25 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          style={
            tooltipPos
              ? { top: tooltipPos.top, left: tooltipPos.left }
              : { top: VIEW_MARGIN, left: VIEW_MARGIN, visibility: "hidden" as const }
          }
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <TourCard
            step={step}
            stepIndex={stepIndex}
            totalSteps={TOUR_STEPS.length - 1}
            progress={progress}
            onPrev={goPrev}
            onNext={goNext}
            onSkip={onSkip}
            showPrev={stepIndex > 0}
            isLastContent={stepIndex === TOUR_STEPS.length - 2}
          />
        </motion.div>
      )}
    </div>
  );
}

function TourCard({
  step,
  stepIndex,
  totalSteps,
  progress,
  onPrev,
  onNext,
  onSkip,
  showPrev,
  isLastContent,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  showPrev: boolean;
  isLastContent: boolean;
}) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-white/15 px-3 py-2">
        <span className="text-[10px] tracking-[0.28em] text-white/40">USER TOUR</span>
        <span className="text-[10px] tracking-[0.2em] text-white/50">
          {String(stepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
        </span>
      </header>
      <div className="h-px bg-white/10 overflow-hidden">
        <motion.div
          className="h-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>
      <div className="space-y-2 px-3 py-3">
        <motion.div
          className="flex items-center gap-2 text-[10px] tracking-[0.22em] text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
        >
          <span>{step.code}</span>
          {step.nav && <span className="text-white/25">·</span>}
          {step.nav && <span>{step.nav} WORKSPACE</span>}
        </motion.div>
        <motion.h2
          className="text-[13px] tracking-[0.16em] uppercase text-white"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          {step.title}
        </motion.h2>
        <motion.p
          className="text-[11px] leading-relaxed tracking-[0.04em] text-white/60"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          {step.body}
        </motion.p>
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-white/15 px-3 py-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-[10px] tracking-[0.2em] text-white/40 hover:text-white transition-colors"
        >
          SKIP
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!showPrev}
            className="flex items-center gap-1 border border-white/30 px-3 py-1.5 text-[10px] tracking-[0.18em] text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="h-3 w-3" /> PREV
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-1 border border-white bg-white px-3 py-1.5 text-[10px] tracking-[0.18em] text-black hover:bg-white/90 transition-colors"
          >
            {isLastContent ? "FINISH" : "NEXT"} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </footer>
    </>
  );
}

function CongratsView({ onEnter }: { onEnter: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-[113] flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute h-px bg-white/20"
          style={{ top: `${12 + i * 7}%`, left: 0, right: 0 }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: [0, 0.5, 0.2] }}
          transition={{ duration: 0.8, delay: 0.05 * i, ease: "easeOut" }}
        />
      ))}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <motion.div
          className="mb-6 flex h-6 w-[11.5rem] items-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <img src={tokentaLogo} alt="" className="h-6 w-full object-contain opacity-90" draggable={false} />
        </motion.div>
        <motion.p
          className="text-[10px] tracking-[0.42em] text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          USER TOUR COMPLETE
        </motion.p>
        <motion.h1
          className="mt-4 text-[clamp(1.75rem,5vw,2.75rem)] tracking-[0.2em]"
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          CONGRATULATIONS
        </motion.h1>
        <motion.p
          className="mt-4 max-w-md text-[11px] tracking-[0.12em] text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          You have mapped every major workspace in Tokenta Terminal. Proof before liquidity — you are ready to operate.
        </motion.p>
        <motion.div
          className="mt-8 flex items-center gap-3 border border-white/20 px-4 py-2 text-[10px] tracking-[0.24em] text-white/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 280, damping: 22 }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          ALL MODULES UNLOCKED
        </motion.div>
        <motion.div
          className="mt-10 h-px w-full max-w-xs overflow-hidden bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-white"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
          />
        </motion.div>
        <motion.button
          type="button"
          onClick={onEnter}
          className="mt-8 border border-white bg-white px-8 py-2.5 text-[11px] tracking-[0.28em] text-black hover:bg-white/90 transition-colors"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
        >
          ENTER TERMINAL
        </motion.button>
      </div>
      <motion.footer
        className="relative z-10 border-t border-white/15 px-4 py-1.5 text-center text-[10px] tracking-[0.2em] text-white/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        TOKENTA · VERIFIABLE AI ASSET EXCHANGE · v0.4.2-α
      </motion.footer>
    </motion.div>
  );
}
