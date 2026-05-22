import { beforeEach, describe, expect, it } from "vitest";
import {
  listWorkerHeartbeats,
  recordWorkerHeartbeat,
  resetHeartbeatsForTest,
} from "./worker-heartbeat.js";

describe("worker-heartbeat", () => {
  beforeEach(() => {
    resetHeartbeatsForTest();
    process.env.WORKER_REGION = "eu-west-1";
  });

  it("records and lists regional heartbeats", () => {
    recordWorkerHeartbeat("eu-west-1");
    recordWorkerHeartbeat("us-east-1");
    expect(listWorkerHeartbeats()).toHaveLength(2);
  });
});
