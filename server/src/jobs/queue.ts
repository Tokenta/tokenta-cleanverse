/**
 * Job queue abstraction — memory default; BullMQ or Redis list when configured.
 */

import { enqueueBullJob, isBullMqEnabled, startBullMqConsumer } from "./bull-queue.js";
import { enqueueRedisJob, isRedisQueueEnabled, startRedisQueueConsumer } from "./redis-queue.js";
import { jobStore } from "./store.js";

type JobHandler = (jobId: string) => Promise<void>;

let handler: JobHandler | null = null;
const pending: string[] = [];
let processing = false;

/** Higher priority dequeued first (engine §6 fair queue — in-process). */
const priorityOf = (jobId: string): number => {
  const job = jobStore.get(jobId);
  const ctx = job?.request.context;
  if (ctx === "PRE_PURCHASE" || ctx === "KEY_ROTATION") return 0;
  if (ctx === "TOKENTA_BUYBACK" || ctx === "LISTING_DRAFT") return 1;
  return 2;
};

function dequeueFair(): string | undefined {
  if (pending.length === 0) return undefined;
  let bestIdx = 0;
  let bestPri = priorityOf(pending[0]!);
  for (let i = 1; i < pending.length; i++) {
    const p = priorityOf(pending[i]!);
    if (p < bestPri) {
      bestPri = p;
      bestIdx = i;
    }
  }
  return pending.splice(bestIdx, 1)[0];
}

async function drain(): Promise<void> {
  if (processing || !handler) return;
  processing = true;
  while (pending.length > 0) {
    const id = dequeueFair();
    if (!id) break;
    await handler(id);
  }
  processing = false;
}

export function registerJobHandler(fn: JobHandler): void {
  handler = fn;
  if (isBullMqEnabled()) {
    startBullMqConsumer(fn);
  } else if (isRedisQueueEnabled()) {
    startRedisQueueConsumer(fn);
  }
  void drain();
}

export async function enqueueVerificationJob(jobId: string): Promise<void> {
  if (isBullMqEnabled()) {
    const ok = await enqueueBullJob(jobId);
    if (ok) return;
  }
  if (isRedisQueueEnabled()) {
    const ok = await enqueueRedisJob(jobId);
    if (ok) return;
  }
  pending.push(jobId);
  setImmediate(() => void drain());
}

export function queueBackend(): "memory" | "redis" | "bullmq" {
  if (isBullMqEnabled()) return "bullmq";
  if (isRedisQueueEnabled()) return "redis";
  return "memory";
}
