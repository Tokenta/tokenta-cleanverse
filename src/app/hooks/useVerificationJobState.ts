import { useEffect, useMemo, useState } from "react";
import {
  getVerificationJob,
  subscribeJobEvents,
  type VerificationJobEvent,
  type VerificationJobResponse,
  type VerificationProof,
} from "../api/verification";

export const VERIFY_PIPELINE_STEPS = [
  "CONNECTIVITY",
  "QUOTA",
  "RATE_LIMIT",
  "RISK_ANALYSIS",
  "FINALIZE",
] as const;

export type VerifyPipelineStep = (typeof VERIFY_PIPELINE_STEPS)[number];

export type PipelineStepStatus = "pending" | "running" | "pass" | "fail" | "review";

function engineRunning(snapshot: VerificationJobResponse | null): boolean {
  const s = String(snapshot?.status ?? "").toUpperCase();
  const t = String(snapshot?.terminalStatus ?? "").toLowerCase();
  return (
    s === "QUEUED" ||
    s === "RUNNING" ||
    t === "queued" ||
    t === "running" ||
    t === "verifying"
  );
}

function stepStatusFor(
  step: VerifyPipelineStep,
  events: VerificationJobEvent[],
  snapshot: VerificationJobResponse | null,
): PipelineStepStatus {
  const failed = events.some((e) => e.type === "job_failed");
  const completed = events.some((e) => e.type === "job_completed");
  const stepFailed = events.some((e) => e.type === "step_failed" && e.step === step);
  const stepDone = events.some((e) => e.type === "step_completed" && e.step === step);
  const started = events.some((e) => e.type === "step_started" && e.step === step);
  const outcome =
    snapshot?.proof?.terminalOutcome ?? snapshot?.terminalOutcome ?? null;

  if (stepFailed) return "fail";
  if (failed && started && !stepDone && step !== "FINALIZE") return "fail";
  if (step === "FINALIZE") {
    if (failed) return outcome === "REVIEW" ? "review" : "fail";
    if (completed || stepDone) {
      if (outcome === "PASS") return "pass";
      if (outcome === "REVIEW" || outcome === "DEGRADED") return "review";
      if (outcome === "FAIL") return "fail";
      return "pass";
    }
    if (started || engineRunning(snapshot)) return "running";
    return "pending";
  }
  if (stepDone) return "pass";
  if (started && engineRunning(snapshot)) return "running";
  if (started && !engineRunning(snapshot) && !failed) return "pass";
  return "pending";
}

export function resultLabelForStatus(status: PipelineStepStatus): string {
  switch (status) {
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    case "review":
      return "REVIEW";
    case "running":
      return "RUNNING";
    default:
      return "PENDING";
  }
}

export function useVerificationJobState(jobId: string | null) {
  const [events, setEvents] = useState<VerificationJobEvent[]>([]);
  const [snapshot, setSnapshot] = useState<VerificationJobResponse | null>(null);

  useEffect(() => {
    if (!jobId) {
      setEvents([]);
      setSnapshot(null);
      return;
    }

    let cancelled = false;
    const seen = new Set<string>();
    const makeKey = (ev: VerificationJobEvent) =>
      `${ev.type}:${ev.step ?? ""}:${ev.timestamp}:${ev.message ?? ""}`;

    const sync = () =>
      void getVerificationJob(jobId)
        .then((job) => {
          if (cancelled) return;
          setSnapshot(job);
          const list = job.events ?? [];
          setEvents(list);
          for (const ev of list) seen.add(makeKey(ev));
        })
        .catch(() => {});

    sync();
    const unsub = subscribeJobEvents(
      jobId,
      (ev) => {
        if (cancelled) return;
        const key = makeKey(ev);
        if (seen.has(key)) return;
        seen.add(key);
        setEvents((prev) => [...prev, ev]);
        if (ev.proof) {
          setSnapshot((prev) =>
            prev
              ? { ...prev, proof: ev.proof, terminalOutcome: ev.proof?.terminalOutcome ?? prev.terminalOutcome }
              : prev,
          );
        }
        if (ev.type === "job_completed" || ev.type === "job_failed") sync();
      },
      () => sync(),
    );
    const poll = setInterval(sync, 2000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      unsub();
    };
  }, [jobId]);

  const proof: VerificationProof | undefined = snapshot?.proof;
  const outcome = proof?.terminalOutcome ?? snapshot?.terminalOutcome ?? null;
  const running = engineRunning(snapshot);
  const done = !running && (outcome != null || snapshot?.status === "PASSED" || snapshot?.status === "FAILED");

  const unifiedLabel = useMemo(() => {
    if (running) return "RUNNING";
    if (outcome) return outcome;
    const s = String(snapshot?.status ?? "").toUpperCase();
    if (s === "PASSED") return proof?.terminalOutcome ?? "PASS";
    if (s === "FAILED") return proof?.terminalOutcome ?? "FAIL";
    return String(snapshot?.terminalStatus ?? snapshot?.status ?? "—").toUpperCase();
  }, [running, outcome, snapshot, proof?.terminalOutcome]);

  const pipelineSteps = useMemo(
    () =>
      VERIFY_PIPELINE_STEPS.map((step) => {
        const status = stepStatusFor(step, events, snapshot);
        return {
          step,
          status,
          result: resultLabelForStatus(status),
          message: [...events]
            .reverse()
            .find((e) => e.step === step)?.message,
        };
      }),
    [events, snapshot],
  );

  const progressPercent =
    snapshot?.progress?.percent ??
    Math.round(
      ((snapshot?.stepsCompleted ?? 0) / Math.max(snapshot?.stepsTotal ?? 5, 1)) * 100,
    );

  return {
    events,
    snapshot,
    proof,
    outcome,
    running,
    done,
    unifiedLabel,
    pipelineSteps,
    progressPercent,
    failureMessage: proof?.failureMessage ?? snapshot?.error ?? null,
    failureCode: proof?.failureCode ?? null,
  };
}
