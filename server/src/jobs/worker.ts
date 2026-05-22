import { runVerificationJob } from "../verification/orchestrator.js";
import { jobStore } from "./store.js";
import { enqueueVerificationJob, registerJobHandler } from "./queue.js";
import { listingStore } from "../listings/store.js";
import { persistJobCompletion, persistJobStart } from "../db/repository.js";
import { appendOrderVerification } from "../orders/verification-trail.js";
import { scheduleFraudMonitor } from "../verification/fraud-monitor.js";
import { touchL1, markRevoked } from "../live-monitor/state.js";
import { secureZeroFields } from "../security/secure-zero.js";
import { maybeAutoAnchor } from "../verification/proof-anchor.js";
import { resolveJobApiKey } from "./job-credential-resolver.js";
import type { VerificationStepName } from "../types/verification.js";

export async function processJob(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  const startedAt = new Date().toISOString();
  jobStore.update(jobId, { status: "RUNNING", startedAt });
  const running = jobStore.get(jobId);
  if (running) void persistJobStart(running).catch(() => {});
  jobStore.emit(jobId, {
    type: "step_started",
    jobId,
    step: "CONNECTIVITY",
    message: "Job running",
    timestamp: new Date().toISOString(),
  });

  const stepOrder: VerificationStepName[] = [
    "CONNECTIVITY",
    "QUOTA",
    "RATE_LIMIT",
    "RISK_ANALYSIS",
    "FINALIZE",
  ];
  let lastStep: VerificationStepName = "CONNECTIVITY";

  try {
    const hasKey = await resolveJobApiKey(job);
    if (!hasKey && (!job.request.apiKey || job.request.apiKey.length < 8)) {
      throw new Error("apiKey missing and credentialRef could not be resolved");
    }

    const proof = await runVerificationJob({
      ...job.request,
      jobId,
      onStep: (step, message) => {
        if (step !== lastStep) {
          jobStore.emit(jobId, {
            type: "step_completed",
            jobId,
            step: lastStep,
            message: `${lastStep} done`,
            timestamp: new Date().toISOString(),
          });
          lastStep = step;
          jobStore.emit(jobId, {
            type: "step_started",
            jobId,
            step,
            message,
            timestamp: new Date().toISOString(),
          });
        }
      },
    });

    const oldKeyForFraud = job.request.oldApiKey;
    secureZeroFields(job.request);

    const terminal = proof.terminalOutcome;
    const status = terminal === "FAIL" ? "FAILED" : "PASSED";

    const completedAt = new Date().toISOString();
    const after = jobStore.get(jobId);
    const durationMs =
      after?.startedAt != null
        ? new Date(completedAt).getTime() - new Date(after.startedAt).getTime()
        : undefined;
    jobStore.update(jobId, { status, proof, stepsCompleted: 5, completedAt, durationMs });

    if (job.request.orderId && proof) {
      appendOrderVerification(job.request.orderId, {
        jobId,
        proofHash: proof.proofHash,
        context: job.request.context,
        terminalOutcome: proof.terminalOutcome,
        totalTokensUsed: proof.totalTokensUsed,
        failureCode: proof.failureCode,
      });
    }

    if (
      job.request.context === "KEY_ROTATION" &&
      job.request.orderId &&
      oldKeyForFraud &&
      proof.terminalOutcome === "PASS"
    ) {
      scheduleFraudMonitor({
        orderId: job.request.orderId,
        provider: job.request.provider,
        oldApiKey: oldKeyForFraud,
      });
    }

    if (job.request.context === "LIVE" && job.listingId) {
      if (proof.terminalOutcome === "PASS") {
        touchL1(job.listingId);
      } else if (
        proof.failureCode === "INVALID_KEY" ||
        proof.failureCode === "KEY_REVOKED"
      ) {
        markRevoked(job.listingId, proof.failureCode);
      }
    }

    if (proof?.proofHash) {
      maybeAutoAnchor(proof.proofHash, jobId, job.listingId);
    }

    if (job.listingId && proof) {
      listingStore.bindVerification(job.listingId, proof);
      void persistJobCompletion(job, proof).catch((err) => {
        console.warn("[persist] job completion failed:", err);
      });
    }

    jobStore.emit(jobId, {
      type: terminal === "FAIL" ? "job_failed" : "job_completed",
      jobId,
      step: "FINALIZE",
      message: `Completed: ${terminal}`,
      proof,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    secureZeroFields(job.request);
    const msg = e instanceof Error ? e.message : "Unknown error";
    jobStore.update(jobId, { status: "FAILED", error: msg });
    jobStore.emit(jobId, {
      type: "job_failed",
      jobId,
      message: msg,
      timestamp: new Date().toISOString(),
    });
  }
}

export function enqueueJob(jobId: string): void {
  enqueueVerificationJob(jobId);
}

registerJobHandler(processJob);
