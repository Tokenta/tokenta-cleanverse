import { describe, expect, it } from "vitest";
import { acquireLiveMonitorLeadership } from "./scheduler-lock.js";

describe("scheduler-lock", () => {
  it("allows tick without redis", async () => {
    delete process.env.REDIS_URL;
    expect(await acquireLiveMonitorLeadership()).toBe(true);
  });
});
