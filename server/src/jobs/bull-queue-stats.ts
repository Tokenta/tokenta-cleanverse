import { isBullMqEnabled } from "./bull-queue.js";
import { bullQueueName } from "./worker-regions.js";

export async function getBullQueueStats(): Promise<{
  queue: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  dlqWaiting: number;
} | null> {
  if (!isBullMqEnabled()) return null;
  try {
    const { Queue } = await import("bullmq");
    const connection = { url: process.env.REDIS_URL! };
    const q = new Queue(bullQueueName(), { connection });
    const dlq = new Queue("tokenta:verification:dlq", { connection });
    const [counts, dlqCounts] = await Promise.all([q.getJobCounts(), dlq.getJobCounts()]);
    await q.close();
    await dlq.close();
    return {
      queue: bullQueueName(),
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      failed: counts.failed ?? 0,
      dlqWaiting: dlqCounts.waiting ?? 0,
    };
  } catch {
    return null;
  }
}
