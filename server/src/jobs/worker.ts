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
import { resolveVerificationProvider } from "../verification/providers/catalog.js";
import type { VerificationStepName } from "../types/verification.js";

function formatJobFailureMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : "Unknown error";
  if (raw === "fetch failed") {
    return "PROBE_NETWORK_UNREACHABLE: provider API unreachable (set VERIFICATION_MOCK=true in server/.env for local dev, or check OPENAI_COMPATIBLE_BASE_URL)";
  }
  if (raw.includes("Cannot convert argument to a ByteString")) {
    return "INVALID_KEY_FORMAT: API key contains non-ASCII characters (likely pasted Chinese text or hidden whitespace). Clear the API key field and paste only the raw key (e.g. sk-...).";
  }
  if (raw.startsWith("INVALID_KEY_FORMAT")) return raw;
  return raw;
}

function isAsciiApiKey(key: string): boolean {
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) return false;
  }
  return key.length >= 8;
}

export async function processJob(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  const startedAt = new Date().toISOString();
  jobStore.update(jobId, { status: "RUNNING", startedAt });
  const running = jobStore.get(jobId);
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
    if (running) await persistJobStart(running);

    const hasKey = await resolveJobApiKey(job);
    if (!hasKey && (!job.request.apiKey || job.request.apiKey.length < 8)) {
      throw new Error("apiKey missing and credentialRef could not be resolved");
    }
    if (job.request.apiKey && !isAsciiApiKey(job.request.apiKey)) {
      throw new Error(
        "INVALID_KEY_FORMAT: API key contains non-ASCII characters. Re-paste only the raw key (no surrounding text).",
      );
    }

    if (job.listingId) {
      const listing = listingStore.get(job.listingId);
      if (listing?.providerKind) {
        const resolved = resolveVerificationProvider(listing.providerKind, {
          compatibleBaseUrl: job.request.compatibleBaseUrl,
          claimedModel: job.request.claimedModel,
        });
        job.request.provider = resolved.kind;
        job.request.providerSlug = resolved.listingProviderKind;
        job.request.compatibleBaseUrl = resolved.compatibleBaseUrl ?? job.request.compatibleBaseUrl;
        job.request.l1Strategy = resolved.l1Strategy;
        if (!job.request.claimedModel?.trim()) {
          job.request.claimedModel = resolved.defaultModel;
        }
      }
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

    const lastStepMessage =
      terminal === "FAIL"
        ? (proof.failureMessage ?? `${lastStep} failed (${proof.failureCode ?? "FAIL"})`)
        : `${lastStep} done`;
    jobStore.emit(jobId, {
      type: terminal === "FAIL" ? "step_failed" : "step_completed",
      jobId,
      step: lastStep,
      message: lastStepMessage,
      proof: terminal === "FAIL" ? proof : undefined,
      timestamp: new Date().toISOString(),
    });

    const completedAt = new Date().toISOString();
    const after = jobStore.get(jobId);
    const durationMs =
      after?.startedAt != null
        ? new Date(completedAt).getTime() - new Date(after.startedAt).getTime()
        : undefined;
    const stepsCompleted =
      terminal === "PASS"
        ? job.stepsTotal
        : Math.max(after?.stepsCompleted ?? 0, 1);
    jobStore.update(jobId, { status, proof, stepsCompleted, completedAt, durationMs });

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
      await persistJobCompletion(job, proof);
    }

    jobStore.emit(jobId, {
      type: terminal === "FAIL" ? "job_failed" : "job_completed",
      jobId,
      step: "FINALIZE",
      message:
        terminal === "FAIL"
          ? (proof.failureMessage ?? `Completed: ${terminal} (${proof.failureCode ?? ""})`)
          : `Completed: ${terminal}`,
      proof,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    secureZeroFields(job.request);
    const msg = formatJobFailureMessage(e);
    jobStore.emit(jobId, {
      type: "step_failed",
      jobId,
      step: lastStep,
      message: msg,
      timestamp: new Date().toISOString(),
    });
    const afterErr = jobStore.get(jobId);
    jobStore.update(jobId, {
      status: "FAILED",
      error: msg,
      stepsCompleted: Math.max(afterErr?.stepsCompleted ?? 0, 1),
    });
    jobStore.emit(jobId, {
      type: "job_failed",
      jobId,
      step: "FINALIZE",
      message: msg,
      timestamp: new Date().toISOString(),
    });
  }
}

export function enqueueJob(jobId: string): void {
  enqueueVerificationJob(jobId);
}

registerJobHandler(processJob);
