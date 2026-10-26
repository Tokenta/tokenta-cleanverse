import { useEffect, useMemo, useRef, useState } from "react";
import { useTerminalToast } from "../context/TerminalToastContext";
import {
  cancelTerminalJob,
  getVerificationJob,
  subscribeJobEvents,
  terminalReceiptExportUrl,
  type VerificationJobEvent,
  type VerificationProof,
} from "../api/verification";

const PIPELINE_STEPS = ["CONNECTIVITY", "QUOTA", "RATE_LIMIT", "RISK_ANALYSIS", "FINALIZE"] as const;

function stepState(
  step: (typeof PIPELINE_STEPS)[number],
  events: VerificationJobEvent[],
  jobStatus: string | null,
  terminalOutcome?: string | null,
): "pending" | "active" | "done" | "failed" | "review" {
  const failed = events.some((e) => e.type === "job_failed");
  const completed = events.some((e) => e.type === "job_completed");
  const started = events.filter((e) => e.step === step);
  const stepFailed = events.some((e) => e.type === "step_failed" && e.step === step);
  const done = events.some((e) => e.type === "step_completed" && e.step === step);

  if (stepFailed) return "failed";
  if (failed && !completed && started.length > 0 && !done) return "failed";
  if (done || completed) {
    // FINALIZE reflects the terminal outcome more precisely
    if (step === "FINALIZE" && (terminalOutcome === "REVIEW" || terminalOutcome === "DEGRADED")) {
      return "review";
    }
    return "done";
  }
  if (started.length > 0 && !done) return "active";
  if (jobStatus === "RUNNING" && step === "CONNECTIVITY") return "active";
  return "pending";
}

export function VerificationJobPanel({
  jobId,
  listingId,
  onComplete,
}: {
  jobId: string;
  listingId?: string | null;
  onComplete?: (proof: VerificationProof | undefined) => void;
}) {
  const [events, setEvents] = useState<VerificationJobEvent[]>([]);
  const [proof, setProof] = useState<VerificationProof | undefined>();
  const [bindMsg, setBindMsg] = useState<string | null>(null);
  const { showToast } = useTerminalToast();
  const lastErrorToastRef = useRef<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [pollLive, setPollLive] = useState(false);

  const mergeJobSnapshot = (j: Awaited<ReturnType<typeof getVerificationJob>>) => {
    setJobStatus(String(j.status ?? ""));
    setTerminalStatus(j.terminalStatus ?? null);
    setJobError(j.error ?? null);
    if (j.events?.length) setEvents(j.events);
    if (j.proof) setProof(j.proof);
  };

  useEffect(() => {
    let cancelled = false;

    void getVerificationJob(jobId)
      .then((j) => {
        if (cancelled) return;
        mergeJobSnapshot(j);
        setPollLive(true);
      })
      .catch(() => {
        if (!cancelled) setPollLive(false);
      });

    const unsub = subscribeJobEvents(
      jobId,
      (ev) => {
        setEvents((prev) => {
          const key = `${ev.type}:${ev.step ?? ""}:${ev.timestamp}:${ev.message ?? ""}`;
          if (prev.some((p) => `${p.type}:${p.step ?? ""}:${p.timestamp}:${p.message ?? ""}` === key)) {
            return prev;
          }
          return [...prev, ev];
        });
        if (ev.proof) setProof(ev.proof);
        if (ev.type === "job_failed" && ev.message) setJobError(ev.message);
      },
      () => {
        void getVerificationJob(jobId).then((j) => {
          if (cancelled) return;
          mergeJobSnapshot(j);
          if (j.proof) onComplete?.(j.proof);
          else onComplete?.(undefined);
        });
      },
    );

    const poll = setInterval(() => {
      void getVerificationJob(jobId)
        .then((j) => {
          if (cancelled) return;
          mergeJobSnapshot(j);
        })
        .catch(() => {});
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      unsub();
    };
  }, [jobId, onComplete]);

  const outcome = proof?.terminalOutcome ?? "—";
  const band = proof?.estimatedExecutableQuantityRange;
  const headerStatus = useMemo(() => {
    if (
      jobStatus === "RUNNING" ||
      jobStatus === "running" ||
      terminalStatus === "running" ||
      terminalStatus === "verifying" ||
      terminalStatus === "queued"
    ) {
      return "RUNNING";
    }
    if (outcome && outcome !== "—") return outcome;
    return String(terminalStatus ?? jobStatus ?? "—").toUpperCase();
  }, [jobStatus, terminalStatus, outcome]);
  const failedEvent = events.find((e) => e.type === "job_failed");
  const rawError =
    proof?.failureMessage ??
    jobError ??
    failedEvent?.message ??
    null;
  const displayError = useMemo(() => {
    if (!rawError) return null;
    if (proof?.failureCode === "QUOTA_EXHAUSTED") {
      return `${rawError} Add credits to your DeepSeek (or provider) account, then re-run verification.`;
    }
    if (proof?.failureCode === "MODEL_MISMATCH") {
      return `${rawError} The endpoint answered as a different model family than claimed. If you bought this key from a reseller, this is a model swap — ask the seller for a genuine key or a refund.`;
    }
    if (rawError.includes("PROBE_NETWORK_UNREACHABLE") || rawError.includes("NETWORK_UNREACHABLE")) {
      return (
        `${rawError} ` +
        "Tip: confirm API provider is DeepSeek (not OpenAI-compatible), check VPN/firewall, or set HTTPS_PROXY in server/.env if your network requires a proxy."
      );
    }
    if (rawError.includes("INVALID_KEY_FORMAT")) {
      return `${rawError} Paste only the raw sk-... key with no Chinese labels or extra text.`;
    }
    return rawError;
  }, [rawError, proof?.failureMessage]);

  useEffect(() => {
    if (!displayError) {
      lastErrorToastRef.current = null;
      return;
    }
    if (lastErrorToastRef.current === displayError) return;
    lastErrorToastRef.current = displayError;
    showToast({ message: displayError, title: "VERIFICATION" });
  }, [displayError, showToast]);

  const pipeline = useMemo(
    () =>
      PIPELINE_STEPS.map((step) => ({
        step,
        state: stepState(step, events, jobStatus, proof?.terminalOutcome),
      })),
    [events, jobStatus, proof?.terminalOutcome],
  );

  const running =
    jobStatus === "QUEUED" ||
    jobStatus === "queued" ||
    jobStatus === "RUNNING" ||
    jobStatus === "running" ||
    terminalStatus === "queued" ||
    terminalStatus === "running" ||
    terminalStatus === "verifying";

  return (
    <div className="border border-white/25 bg-white/[0.03] p-3 text-[11px] space-y-3">
      <div className="flex justify-between tracking-[0.18em] text-[10px] text-white/50">
        <span>VERIFICATION JOB</span>
        <span className="text-white tabular-nums">
          {running ? "LIVE" : pollLive ? "DONE" : "SYNC"} · {headerStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 tabular-nums">
        <div>
          <span className="text-white/40">OUTCOME </span>
          <span
            className={
              outcome === "PASS"
                ? "text-white"
                : outcome === "FAIL"
                  ? "text-red-400"
                  : "text-amber-300"
            }
          >
            {outcome}
          </span>
        </div>
        <div>
          <span className="text-white/40">BURN </span>
          <span>{proof?.totalTokensUsed ?? "—"} tok</span>
        </div>
        <div>
          <span className="text-white/40">CAPABILITY </span>
          <span>{proof ? `${(proof.capabilityScore * 100).toFixed(0)}%` : "—"}</span>
        </div>
        <div>
          <span className="text-white/40">BAND </span>
          <span>{band?.band ?? "—"}</span>
        </div>
      </div>

      {proof?.fingerprint && proof.fingerprint.status !== "skipped" && (
        <div className="border border-white/10 p-2 space-y-1">
          <div className="text-[9px] tracking-[0.2em] text-white/40">MODEL IDENTITY</div>
          <div className="flex items-center justify-between">
            <span
              className={
                proof.fingerprint.status === "match"
                  ? "text-emerald-300"
                  : proof.fingerprint.status === "mismatch"
                    ? "text-red-400"
                    : "text-amber-300"
              }
            >
              {proof.fingerprint.status.toUpperCase()}
              {proof.fingerprint.detectedVendor
                ? ` · detected ${proof.fingerprint.detectedVendor}`
                : ""}
            </span>
            <span className="text-white/40 tabular-nums">
              {proof.fingerprint.confidence > 0
                ? `${proof.fingerprint.confidence}% conf`
                : ""}
            </span>
          </div>
          {proof.fingerprint.responseModel && (
            <div className="text-white/50">
              response model:{" "}
              <span className="text-white/80">{proof.fingerprint.responseModel}</span>
              {proof.fingerprint.claimedModel
                ? ` · claimed ${proof.fingerprint.claimedModel}`
                : ""}
            </div>
          )}
          {proof.fingerprint.evidence.slice(0, 3).map((e) => (
            <div key={e} className="text-[10px] text-white/35">
              {e}
            </div>
          ))}
        </div>
      )}

      <div className="border border-white/10 p-2">
        <div className="mb-2 text-[9px] tracking-[0.2em] text-white/40">PIPELINE</div>
        <ol className="space-y-1.5">
          {pipeline.map(({ step, state }) => (
            <li key={step} className="flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 ${
                  state === "done"
                    ? "bg-white"
                    : state === "review"
                      ? "bg-amber-400"
                      : state === "active"
                        ? "bg-white animate-pulse"
                        : state === "failed"
                          ? "bg-red-500"
                          : "border border-white/30"
                }`}
              />
              <span className="flex-1 tracking-[0.12em] text-white/70">{step}</span>
              <span
                className={`text-[9px] uppercase ${
                  state === "review" ? "text-amber-400" : state === "failed" ? "text-red-400" : "text-white/40"
                }`}
              >
                {state}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Listing status badge — replaces old manual bind button.
          Worker auto-binds after PASS; seller confirms & publishes via the
          VerificationProgressModal confirm flow. */}
      {listingId && proof?.terminalOutcome === "PASS" && (
        <div className="flex items-center justify-between border border-white/20 bg-white/[0.03] px-2 py-1.5 text-[10px] tracking-[0.14em]">
          <span className="text-white/40">LISTING STATUS</span>
          <span className="text-white">
            {bindMsg === "LIVE"
              ? "LIVE · LISTED ON MARKETPLACE"
              : "VERIFIED · PENDING PUBLISH"}
          </span>
        </div>
      )}
      {bindMsg && bindMsg !== "LIVE" && (
        <p className="text-[10px] text-white/50">{bindMsg}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {running && (
          <button
            type="button"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true);
              const ok = await cancelTerminalJob(jobId);
              setCancelling(false);
              setBindMsg(ok ? "Job cancelled" : "Cancel failed");
              if (ok) setJobStatus("cancelled");
            }}
            className="border border-white/30 px-2 py-1 text-[9px] tracking-[0.16em] hover:bg-white/10 disabled:opacity-40"
          >
            {cancelling ? "CANCELLING…" : "CANCEL JOB"}
          </button>
        )}
        {proof && (
          <a
            href={terminalReceiptExportUrl(jobId)}
            className="border border-white/30 px-2 py-1 text-[9px] tracking-[0.16em] hover:bg-white/10"
            download
          >
            EXPORT RECEIPT
          </a>
        )}
      </div>

      <ul className="max-h-28 overflow-auto border border-white/10 divide-y divide-white/5">
        {events.length === 0 && (
          <li className="px-2 py-2 text-white/40">Waiting for verification events…</li>
        )}
        {events.slice(-12).map((ev, i) => (
          <li
            key={`${ev.timestamp}-${ev.type}-${i}`}
            className={`px-2 py-1 ${ev.type === "job_failed" || ev.type === "step_failed" ? "text-red-300" : "text-white/60"}`}
          >
            <span className="text-white/30 tabular-nums mr-2">
              {ev.timestamp?.slice(11, 19) ?? ""}
            </span>
            {ev.step ?? ev.type}: {ev.message ?? ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
