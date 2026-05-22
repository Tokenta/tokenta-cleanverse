import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobStore } from "./store.js";
import { enqueueVerificationJob, registerJobHandler } from "./queue.js";

describe("fair queue priority", () => {
  beforeEach(() => {
    jobStore["jobs"].clear();
  });

  it("runs PRE_PURCHASE before LIVE context jobs", async () => {
    const order: string[] = [];
    registerJobHandler(async (id) => {
      order.push(id);
    });

    const live = jobStore.create({
      apiKey: "sk-mock-fair-queue-live",
      declaredQuantity: 1000,
      provider: "openai",
      context: "LIVE",
      l1Only: true,
    });
    const pre = jobStore.create({
      apiKey: "sk-mock-fair-queue-pre",
      declaredQuantity: 1000,
      provider: "openai",
      context: "PRE_PURCHASE",
      orderId: "ord_fair",
      payerPaysFee: true,
    });

    await enqueueVerificationJob(live.id);
    await enqueueVerificationJob(pre.id);

    await new Promise((r) => setTimeout(r, 200));
    expect(order[0]).toBe(pre.id);
    expect(order[1]).toBe(live.id);
  });
});
