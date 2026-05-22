import { afterEach, describe, expect, it } from "vitest";
import { getLiveMonitorIntervals } from "./scheduler.js";

describe("live-monitor scheduler intervals", () => {
  afterEach(() => {
    delete process.env.LIVE_MONITOR_DIRECT_INTERVAL_MS;
    delete process.env.LIVE_MONITOR_P2P_INTERVAL_MS;
    delete process.env.LIVE_MONITOR_STATE_TICK_MS;
  });

  it("defaults to 5m direct and 30m p2p per mechanism §12", () => {
    const i = getLiveMonitorIntervals();
    expect(i.directMs).toBe(5 * 60 * 1000);
    expect(i.p2pMs).toBe(30 * 60 * 1000);
    expect(i.stateMs).toBe(60_000);
  });

  it("reads env overrides", () => {
    process.env.LIVE_MONITOR_DIRECT_INTERVAL_MS = "120000";
    process.env.LIVE_MONITOR_P2P_INTERVAL_MS = "900000";
    const i = getLiveMonitorIntervals();
    expect(i.directMs).toBe(120_000);
    expect(i.p2pMs).toBe(900_000);
  });
});
