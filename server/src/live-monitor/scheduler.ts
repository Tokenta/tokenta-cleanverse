import { tickMonitorStates, simulateDirectHeartbeats } from "./state.js";
import { runScheduledL1Probes } from "./probes.js";
import { acquireLiveMonitorLeadership } from "./scheduler-lock.js";

let started = false;

export function getLiveMonitorIntervals(): {
  directMs: number;
  p2pMs: number;
  stateMs: number;
} {
  return {
    directMs: Number(process.env.LIVE_MONITOR_DIRECT_INTERVAL_MS ?? 5 * 60 * 1000),
    p2pMs: Number(process.env.LIVE_MONITOR_P2P_INTERVAL_MS ?? 30 * 60 * 1000),
    stateMs: Number(process.env.LIVE_MONITOR_STATE_TICK_MS ?? 60_000),
  };
}

export function resetLiveMonitorSchedulerForTest(): void {
  started = false;
}

export function startLiveMonitorScheduler(): void {
  if (started) return;
  started = true;

  const enabled = process.env.LIVE_MONITOR_ENABLED !== "false";
  const { directMs, p2pMs, stateMs } = getLiveMonitorIntervals();

  if (!enabled) {
    console.log("[live-monitor] scheduler disabled (LIVE_MONITOR_ENABLED=false)");
    return;
  }

  console.log(
    `[live-monitor] direct=${directMs}ms p2p=${p2pMs}ms state=${stateMs}ms`,
  );

  const runDirect = async () => {
    if (!(await acquireLiveMonitorLeadership())) return;
    const simulated = simulateDirectHeartbeats();
    const counts = tickMonitorStates();
    if (simulated > 0) {
      console.log(
        `[live-monitor] direct heartbeat n=${simulated} LIVE=${counts.live} STALE=${counts.stale}`,
      );
    }
  };

  const runP2p = () => {
    void (async () => {
      if (!(await acquireLiveMonitorLeadership())) return;
      const p2p = await runScheduledL1Probes();
      const counts = tickMonitorStates();
      if (p2p.enqueued > 0 || p2p.skipped > 0) {
        console.log(
          `[live-monitor] p2p L1 enqueued=${p2p.enqueued} skipped=${p2p.skipped} LIVE=${counts.live}`,
        );
      }
    })();
  };

  const runStateOnly = async () => {
    if (!(await acquireLiveMonitorLeadership())) return;
    const counts = tickMonitorStates();
    if (counts.stale > 0 || counts.revoked > 0) {
      console.log(
        `[live-monitor] state LIVE=${counts.live} STALE=${counts.stale} REVOKED=${counts.revoked}`,
      );
    }
  };

  setInterval(runDirect, directMs);
  setInterval(runP2p, p2pMs);
  setInterval(runStateOnly, stateMs);

  runDirect();
  runStateOnly();
}
