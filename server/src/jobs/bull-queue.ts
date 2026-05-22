/**
 * BullMQ verification queue + DLQ when USE_BULLMQ=true and REDIS_URL set.
 */

type JobHandler = (jobId: string) => Promise<void>;

import { bullQueueName } from "./worker-regions.js";

function queueName(): string {
  return bullQueueName();
}
const DLQ_NAME = "tokenta:verification:dlq";

let workerStarted = false;
let queueInstance: import("bullmq").Queue | null = null;

export function isBullMqEnabled(): boolean {
  return process.env.USE_BULLMQ === "true" && !!process.env.REDIS_URL;
}

function connectionOpts() {
  return { url: process.env.REDIS_URL! };
}

async function getQueue(): Promise<import("bullmq").Queue> {
  if (!queueInstance) {
    const { Queue } = await import("bullmq");
    queueInstance = new Queue(queueName(), { connection: connectionOpts() });
  }
  return queueInstance;
}

export async function enqueueBullJob(jobId: string): Promise<boolean> {
  if (!isBullMqEnabled()) return false;
  try {
    const queue = await getQueue();
    await queue.add(
      "verify",
      { jobId },
      {
        jobId: `verify-${jobId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: false,
      },
    );
    return true;
  } catch (err) {
    console.warn("[bull-queue] enqueue failed:", err);
    return false;
  }
}

export function startBullMqConsumer(handler: JobHandler): void {
  if (!isBullMqEnabled() || workerStarted) return;
  workerStarted = true;

  void (async () => {
    try {
      const { Worker, Queue } = await import("bullmq");
      const dlq = new Queue(DLQ_NAME, { connection: connectionOpts() });

      const worker = new Worker(
        queueName(),
        async (job) => {
          const jobId = job.data.jobId as string;
          if (!jobId) throw new Error("missing jobId");
          await handler(jobId);
        },
        { connection: connectionOpts(), concurrency: 1 },
      );

      worker.on("failed", async (job, err) => {
        if (!job) return;
        const attempts = job.opts.attempts ?? 1;
        if (job.attemptsMade >= attempts) {
          await dlq.add("dead", {
            jobId: job.data.jobId,
            error: err.message,
            failedAt: new Date().toISOString(),
          });
          console.warn("[bull-queue] moved to DLQ:", job.data.jobId, err.message);
        }
      });

      console.log("[bull-queue] worker listening on", queueName());
    } catch (err) {
      console.warn("[bull-queue] worker not started:", err);
      workerStarted = false;
    }
  })();
}
