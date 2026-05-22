/**
 * Single-leader LIVE monitor tick when Redis available (§12 distributed cron scaffold).
 */

const LOCK_KEY = "tokenta:live-monitor:leader";
const LOCK_TTL_SEC = 90;

let memoryLeader = true;

export async function acquireLiveMonitorLeadership(): Promise<boolean> {
  const url = process.env.REDIS_URL;
  if (!url || process.env.LIVE_MONITOR_DISTRIBUTED_LOCK === "false") {
    return memoryLeader;
  }

  try {
    const Redis = (await import("ioredis")).default;
    const redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    const token = `${process.pid}-${Date.now()}`;
    const ok = await redis.set(LOCK_KEY, token, "EX", LOCK_TTL_SEC, "NX");
    await redis.quit();
    return ok === "OK";
  } catch {
    return memoryLeader;
  }
}

export function resetSchedulerLockForTest(): void {
  memoryLeader = true;
}
