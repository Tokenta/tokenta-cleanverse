import type {
  VerificationJobEvent,
  VerificationJobResponse,
  VerificationJobStatus,
  VerificationProof,
  CreateVerificationJobRequest,
} from "../types/verification.js";

export interface StoredJob {
  id: string;
  status: VerificationJobStatus;
  request: CreateVerificationJobRequest;
  listingId?: string;
  keyFingerprint?: string;
  proof?: VerificationProof;
  stepsCompleted: number;
  stepsTotal: number;
  events: VerificationJobEvent[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

type EventListener = (event: VerificationJobEvent) => void;

export class JobStore {
  private jobs = new Map<string, StoredJob>();
  private listeners = new Map<string, Set<EventListener>>();

  create(
    request: CreateVerificationJobRequest,
    meta?: { listingId?: string; keyFingerprint?: string },
  ): StoredJob {
    const id = `vj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const job: StoredJob = {
      id,
      status: "QUEUED",
      request,
      listingId: meta?.listingId,
      keyFingerprint: meta?.keyFingerprint,
      stepsCompleted: 0,
      stepsTotal: 5,
      events: [],
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    return job;
  }

  findByProofHash(proofHash: string): StoredJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.proof?.proofHash === proofHash) return job;
    }
    return undefined;
  }

  get(id: string): StoredJob | undefined {
    return this.jobs.get(id);
  }

  update(id: string, patch: Partial<StoredJob>): StoredJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    Object.assign(job, patch);
    return job;
  }

  toResponse(job: StoredJob): VerificationJobResponse {
    return {
      jobId: job.id,
      status: job.status,
      terminalOutcome: job.proof?.terminalOutcome,
      proof: job.proof,
      stepsCompleted: job.stepsCompleted,
      stepsTotal: job.stepsTotal,
      createdAt: job.createdAt,
    };
  }

  emit(jobId: string, event: VerificationJobEvent): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.events.push(event);
      if (event.step) {
        const stepIndex = ["CONNECTIVITY", "QUOTA", "RATE_LIMIT", "RISK_ANALYSIS", "FINALIZE"].indexOf(event.step);
        if (stepIndex >= 0 && event.type === "step_completed") {
          job.stepsCompleted = Math.max(job.stepsCompleted, stepIndex + 1);
        }
      }
    }
    const subs = this.listeners.get(jobId);
    if (subs) subs.forEach((fn) => fn(event));
  }

  subscribe(jobId: string, fn: EventListener): () => void {
    if (!this.listeners.has(jobId)) this.listeners.set(jobId, new Set());
    this.listeners.get(jobId)!.add(fn);
    return () => this.listeners.get(jobId)?.delete(fn);
  }

  countActive(): number {
    let n = 0;
    for (const j of this.jobs.values()) {
      if (j.status === "QUEUED" || j.status === "RUNNING") n++;
    }
    return n;
  }

  listJobs(): StoredJob[] {
    return [...this.jobs.values()];
  }

  listRecent(limit = 50): VerificationJobEvent[] {
    const all: VerificationJobEvent[] = [];
    for (const job of this.jobs.values()) {
      all.push(...job.events);
    }
    return all.slice(-limit);
  }

  getHealthMetrics(): {
    queue_depth: number;
    success_rate: number;
    jobs_total: number;
    jobs_passed: number;
    jobs_failed: number;
    avg_tokens_used: number;
    p50_duration_ms: number;
    slo_standard_under_60s_pct: number;
  } {
    const jobs = this.listJobs();
    const finished = jobs.filter((j) => j.status === "PASSED" || j.status === "FAILED");
    const passed = finished.filter((j) => j.status === "PASSED").length;
    const tokens = finished
      .map((j) => j.proof?.totalTokensUsed ?? 0)
      .filter((t) => t > 0);
    const avgTokens =
      tokens.length > 0 ? tokens.reduce((a, b) => a + b, 0) / tokens.length : 0;

    const durations = finished
      .map((j) => j.durationMs)
      .filter((d): d is number => d != null && d > 0)
      .sort((a, b) => a - b);
    const p50 =
      durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
    const under60 = durations.filter((d) => d < 60_000).length;
    const sloPct = durations.length ? (under60 / durations.length) * 100 : 100;

    return {
      queue_depth: this.countActive(),
      success_rate: finished.length ? (passed / finished.length) * 100 : 100,
      jobs_total: jobs.length,
      jobs_passed: passed,
      jobs_failed: finished.length - passed,
      avg_tokens_used: Math.round(avgTokens),
      p50_duration_ms: p50,
      slo_standard_under_60s_pct: Number(sloPct.toFixed(1)),
    };
  }
}

export const jobStore = new JobStore();
