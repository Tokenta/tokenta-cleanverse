/**
 * Redis list queue for verification jobs when USE_REDIS_QUEUE=true and REDIS_URL set.
 * Falls back silently if Redis is unavailable.
 */

type JobHandler = (jobId: string) => Promise<void>;

const QUEUE_KEY = "tokenta:verification:jobs";

let consumerStarted = false;

export function isRedisQueueEnabled(): boolean {
  return process.env.USE_REDIS_QUEUE === "true" && !!process.env.REDIS_URL;
}

export async function enqueueRedisJob(jobId: string): Promise<boolean> {
  if (!isRedisQueueEnabled()) return false;
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    await redis.lpush(QUEUE_KEY, jobId);
    await redis.quit();
    return true;
  } catch (err) {
    console.warn("[redis-queue] enqueue failed, fallback to memory:", err);
    return false;
  }
}

export function startRedisQueueConsumer(handler: JobHandler): void {
  if (!isRedisQueueEnabled() || consumerStarted) return;
  consumerStarted = true;

  void (async () => {
    try {
      const { default: Redis } = await import("ioredis");
      const redis = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
      redis.on("error", (e) => console.warn("[redis-queue]", e.message));
      console.log("[redis-queue] consumer listening on", QUEUE_KEY);
      while (true) {
        const res = await redis.brpop(QUEUE_KEY, 5);
        if (res?.[1]) await handler(res[1]);
      }
    } catch (err) {
      console.warn("[redis-queue] consumer not started:", err);
      consumerStarted = false;
    }
  })();
}
