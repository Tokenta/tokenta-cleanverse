import { afterEach, describe, expect, it } from "vitest";
import {
  bullQueueName,
  getWorkerTopology,
  queueNameForRegion,
} from "./worker-regions.js";

describe("worker-regions", () => {
  afterEach(() => {
    delete process.env.WORKER_REGION;
    delete process.env.WORKER_REGIONS;
    delete process.env.USE_REGIONAL_QUEUES;
  });

  it("uses standard queue by default", () => {
    expect(bullQueueName()).toBe("tokenta:verification:standard");
  });

  it("uses regional queue when enabled", () => {
    process.env.WORKER_REGION = "us-east-1";
    process.env.USE_REGIONAL_QUEUES = "true";
    expect(bullQueueName()).toBe("tokenta:verification:us-east-1");
    expect(queueNameForRegion("eu-west-1")).toBe("tokenta:verification:eu-west-1");
  });

  it("lists topology regions", () => {
    process.env.WORKER_REGION = "us-east-1";
    process.env.WORKER_REGIONS = "us-east-1,eu-west-1";
    const t = getWorkerTopology();
    expect(t.regions).toHaveLength(2);
    expect(t.localRegion).toBe("us-east-1");
  });
});
