import { beforeEach, describe, expect, it } from "vitest";
import { jobStore } from "./store.js";
import { processJob } from "./worker.js";

const MOCK_KEY = "sk-mock-worker-zeroize-test-key";

describe("worker ephemeral key zeroize", () => {
  beforeEach(() => {
    process.env.VERIFICATION_MOCK = "true";
    jobStore["jobs"].clear();
  });

  it("clears apiKey from job request after successful verification", async () => {
    const job = jobStore.create({
      context: "LISTING_DRAFT",
      provider: "openai",
      apiKey: MOCK_KEY,
      declaredQuantity: 1000,
      claimedModel: "gpt-4o-mini",
      costLiability: "SELLER_PAID",
    });

    await processJob(job.id);

    const stored = jobStore.get(job.id);
    expect(stored?.status).toBe("PASSED");
    expect(stored?.request.apiKey).toBe("");
    expect(job.request.apiKey).toBe("");
  });

  it("clears apiKey after failed verification", async () => {
    const job = jobStore.create({
      context: "LISTING_DRAFT",
      provider: "openai",
      apiKey: "short",
      declaredQuantity: 1000,
      costLiability: "SELLER_PAID",
    });

    await processJob(job.id);

    expect(jobStore.get(job.id)?.request.apiKey).toBe("");
  });
});
