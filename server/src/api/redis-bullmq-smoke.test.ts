/**
 * CI smoke — enqueue via BullMQ when REDIS_URL set (skipped locally without Redis).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { jobStore } from "../jobs/store.js";
import "../jobs/worker.js";
import { enqueueBullJob, isBullMqEnabled } from "../jobs/bull-queue.js";

const runRedis = process.env.RUN_REDIS_BULLMQ_SMOKE === "true" && isBullMqEnabled();

describe.runIf(runRedis)("redis bullmq smoke", () => {
  beforeEach(() => {
    jobStore["jobs"].clear();
    process.env.VERIFICATION_MOCK = "true";
  });

  it("enqueues job to BullMQ", async () => {
    const job = jobStore.create({
      apiKey: "sk-mock-redis-bullmq-smoke",
      declaredQuantity: 1000,
      provider: "openai",
    });
    const ok = await enqueueBullJob(job.id);
    expect(ok).toBe(true);
  });
});
