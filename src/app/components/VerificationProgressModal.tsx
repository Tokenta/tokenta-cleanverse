import { useState } from "react";
import { X, CheckCircle2, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useVerificationJobState, type PipelineStepStatus } from "../hooks/useVerificationJobState";
import { publishListing } from "../api/verification";
import { useTerminalToast } from "../context/TerminalToastContext";

function stepTone(status: PipelineStepStatus): string {
  switch (status) {
    case "pass":
      return "border-white/40 bg-white/[0.06] text-white";
    case "fail":
      return "border-red-500/50 bg-red-500/10 text-red-300";
    case "review":
      return "border-amber-400/50 bg-amber-400/10 text-amber-200";
    case "running":
      return "border-white/30 bg-white/[0.04] text-white animate-pulse";
    default:
      return "border-white/15 bg-black text-white/40";
  }
}

function outcomeClass(outcome: string | null): string {
  if (outcome === "PASS") return "text-white";
  if (outcome === "FAIL") return "text-red-400";
  if (outcome === "REVIEW" || outcome === "DEGRADED") return "text-amber-300";
  return "text-white/70";
}

function bandLabel(band: string | undefined): string {
  if (!band) return "—";
  const map: Record<string, string> = {
    MICRO_0_1K: "< 1K",
    SMALL_1K_10K: "1K – 10K",
    MEDIUM_10K_100K: "10K – 100K",
    LARGE_100K_1M: "100K – 1M",
    XL_1M_PLUS: "1M+",
    UNKNOWN: "Unknown",
    INSUFFICIENT: "Insufficient",
  };
  return map[band] ?? band;
}

export function VerificationProgressModal({
  open,
  onClose,
  jobId,
  listingId,
  listingSnapshot,
  onPublished,
  onStartSellerTour,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string | null;
  listingId?: string | null;
  listingSnapshot?: { quotaToSell: number; askPriceUsdc: number; providerKind: string } | null;
  onPublished?: () => void;
  onStartSellerTour?: () => void;
}) {
  const {
    events,
    proof,
    outcome,
    running,
    done,
    unifiedLabel,
    pipelineSteps,
    progressPercent,
    failureMessage,
    failureCode,
  } = useVerificationJobState(open ? jobId : null);

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const { showToast } = useTerminalToast();

  const listingLabel = listingId
    ? `LST-${listingId.slice(-6).toUpperCase()}`
    : jobId
      ? `JOB-${jobId.slice(-6).toUpperCase()}`
      : "—";

  const showPublishFlow =
    done && outcome === "PASS" && listingId && listingSnapshot && !published;

  const estimatedRevenue = listingSnapshot
    ? (listingSnapshot.quotaToSell * listingSnapshot.askPriceUsdc).toFixed(2)
    : null;

  const handlePublish = async () => {
    if (!listingId) return;
    setPublishing(true);
    try {
      const result = await publishListing(listingId);
      if ("error" in result) {
        // Already LIVE means the worker auto-published (autoListAfterVerify=true path) — treat as success.
        if (result.code === "INVALID_LISTING_STATE" && result.currentStatus === "LIVE") {
          setPublished(true);
          onPublished?.();
        } else {
          showToast({ message: result.error, title: "PUBLISH" });
        }
      } else {
        setPublished(true);
        onPublished?.();
      }
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Publish failed — is API server running?",
        title: "PUBLISH",
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && jobId && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 font-mono">
          <motion.div
            className="absolute inset-0 bg-black/92"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col border border-white/25 bg-black text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-white/15 px-4 py-2">
              <div className="text-[11px] tracking-[0.18em] uppercase text-white/70">
                <span className="text-white/30">VF.0 · </span>
                API Verification Progress
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* Asset + outcome header */}
              <div className="flex flex-wrap items-end justify-between gap-3 border border-white/15 bg-white/[0.03] p-3">
                <div>
                  <div className="text-[9px] tracking-[0.22em] text-white/40">ASSET</div>
                  <div className="text-[12px] tracking-[0.14em]">{listingLabel}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] tracking-[0.22em] text-white/40">OUTCOME · STATUS</div>
                  <div className={`text-2xl font-medium tracking-[0.12em] ${outcomeClass(outcome)}`}>
                    {outcome ?? (running ? "…" : "—")}
                  </div>
                  <div className="text-[10px] tracking-[0.16em] text-white/50 mt-0.5">
                    {running ? "LIVE" : done ? "COMPLETED" : "SYNC"} · {unifiedLabel}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="mb-1 flex justify-between text-[10px] tracking-[0.14em] text-white/50">
                  <span>PIPELINE PROGRESS</span>
                  <span className="tabular-nums">{progressPercent}%</span>
                </div>
                <div className="h-1 bg-white/10">
                  <div
                    className={`h-full transition-all ${running ? "bg-white animate-pulse" : outcome === "FAIL" ? "bg-red-500" : "bg-white"}`}
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
              </div>

              {/* Pipeline steps */}
              <ol className="grid gap-2 sm:grid-cols-5">
                {pipelineSteps.map(({ step, status, result, message }) => (
                  <li
                    key={step}
                    className={`border px-2 py-2 text-[10px] tracking-[0.1em] ${stepTone(status)}`}
                  >
                    <div className="text-white/40 text-[8px] mb-1">{step}</div>
                    <div className="font-medium">{result}</div>
                    {message && (
                      <div className="mt-1 text-[8px] leading-snug text-white/50 line-clamp-2">
                        {message}
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              {/* Failure detail */}
              {(failureMessage || failureCode) && (
                <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] leading-relaxed text-red-300">
                  {failureCode && (
                    <span className="block text-[9px] tracking-[0.18em] text-red-400/80 mb-1">
                      {failureCode}
                    </span>
                  )}
                  {failureMessage}
                </p>
              )}

              {outcome === "REVIEW" && !failureMessage && (
                <p className="border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[10px] leading-relaxed text-amber-200/90">
                  Verification finished with outcome REVIEW. The key responded but needs manual
                  review (capacity band, alignment, or policy). Check capability score and band in
                  the Verify tab.
                </p>
              )}

              {/* Proof metrics */}
              {proof && (
                <div className="grid grid-cols-3 gap-2 text-[10px] tabular-nums border border-white/10 p-2">
                  <div>
                    <span className="text-white/40">BURN </span>
                    <span>{proof.totalTokensUsed} tok</span>
                  </div>
                  <div>
                    <span className="text-white/40">CAP </span>
                    <span>{(proof.capabilityScore * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-white/40">BAND </span>
                    <span>{bandLabel(proof.estimatedExecutableQuantityRange?.band)}</span>
                  </div>
                </div>
              )}

              {/* ---- CONFIRM & PUBLISH FLOW (PASS only) ---- */}
              {showPublishFlow && (
                <div className="border border-white/25 bg-white/[0.03] p-3 space-y-3">
                  <div className="text-[9px] tracking-[0.22em] text-white/40 mb-2">
                    STEP 2 OF 2 · CONFIRM LISTING
                  </div>

                  {/* Listing preview */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                    <div className="text-white/40">Provider</div>
                    <div className="uppercase tracking-wider">
                      {listingSnapshot.providerKind}
                    </div>
                    <div className="text-white/40">Quota to sell</div>
                    <div className="tabular-nums">
                      {listingSnapshot.quotaToSell.toLocaleString()} tokens
                    </div>
                    <div className="text-white/40">Ask price</div>
                    <div className="tabular-nums">
                      ${listingSnapshot.askPriceUsdc.toFixed(4)} USDC / token
                    </div>
                    <div className="text-white/40">Capability</div>
                    <div className="tabular-nums">
                      {proof ? `${(proof.capabilityScore * 100).toFixed(0)}%` : "—"}
                    </div>
                    <div className="text-white/40">Capacity band</div>
                    <div>{bandLabel(proof?.estimatedExecutableQuantityRange?.band)}</div>
                  </div>

                  {/* Estimated income */}
                  {estimatedRevenue && (
                    <div className="border-t border-white/10 pt-2 flex justify-between text-[10px]">
                      <span className="text-white/40">Estimated gross revenue</span>
                      <span className="tabular-nums text-white">${estimatedRevenue} USDC</span>
                    </div>
                  )}
                  <p className="text-[9px] leading-snug text-white/35">
                    Tokenta holds buyer payment in escrow until the buyer confirms the API is
                    working. Once confirmed, funds are released to your seller account.
                  </p>

                  <button
                    type="button"
                    disabled={publishing}
                    onClick={handlePublish}
                    className="w-full flex items-center justify-center gap-2 border border-white py-2 text-[10px] tracking-[0.18em] hover:bg-white hover:text-black transition-colors disabled:opacity-40"
                  >
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    {publishing ? "PUBLISHING…" : "CONFIRM & PUBLISH TO MARKETPLACE"}
                  </button>
                </div>
              )}

              {/* ---- PUBLISHED SUCCESS STATE ---- */}
              {published && (
                <div className="border border-white/25 bg-white/[0.03] p-3 space-y-2 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-white" />
                  <div className="text-[11px] tracking-[0.18em] text-white">LISTING IS LIVE</div>
                  <p className="text-[9px] leading-snug text-white/50">
                    Your API is now visible on the marketplace. Buyers can purchase it and payment
                    will be held in escrow until they confirm it is working.
                  </p>
                  <div className="flex flex-col gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => onPublished?.()}
                      className="border border-white/30 px-3 py-1 text-[10px] tracking-[0.16em] hover:bg-white/10"
                    >
                      VIEW IN MARKETPLACE
                    </button>
                    {onStartSellerTour && (
                      <button
                        type="button"
                        onClick={onStartSellerTour}
                        className="border border-white/20 px-3 py-1 text-[10px] tracking-[0.16em] text-white/60 hover:bg-white/[0.06]"
                      >
                        GUIDE TOUR · SELLER JOURNEY
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Event log */}
              <div>
                <div className="mb-2 text-[9px] tracking-[0.2em] text-white/40">EVENT LOG</div>
                <ul className="max-h-36 overflow-y-auto border border-white/10 divide-y divide-white/5 text-[10px]">
                  {events.length === 0 && (
                    <li className="px-2 py-3 text-white/40">Waiting for verification events…</li>
                  )}
                  {events.map((ev, i) => (
                    <li
                      key={`${ev.timestamp}-${ev.type}-${i}`}
                      className={`px-2 py-1 ${
                        ev.type === "job_failed" || ev.type === "step_failed"
                          ? "text-red-300"
                          : "text-white/60"
                      }`}
                    >
                      <span className="text-white/30 tabular-nums mr-2">
                        {ev.timestamp?.slice(11, 19) ?? ""}
                      </span>
                      {ev.step ?? ev.type}: {ev.message ?? ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <footer className="shrink-0 flex justify-end gap-2 border-t border-white/15 px-4 py-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-white/30 px-3 py-1.5 text-[10px] tracking-[0.16em] hover:bg-white/10"
              >
                {done ? "CLOSE" : "HIDE · VIEW IN F2"}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
