/**
 * Regional worker liveness registry (engine §17).
 */

import { bullQueueName, getLocalWorkerRegion } from "./worker-regions.js";
import { queueBackend } from "./queue.js";

export interface WorkerHeartbeat {
  region: string;
  queueName: string;
  queueBackend: string;
  lastSeenAt: string;
  pid: number;
}

const heartbeats = new Map<string, WorkerHeartbeat>();

export function recordWorkerHeartbeat(region?: string): WorkerHeartbeat {
  const r = region ?? getLocalWorkerRegion();
  const entry: WorkerHeartbeat = {
    region: r,
    queueName: bullQueueName(),
    queueBackend: queueBackend(),
    lastSeenAt: new Date().toISOString(),
    pid: process.pid,
  };
  heartbeats.set(r, entry);
  return entry;
}

export function listWorkerHeartbeats(): WorkerHeartbeat[] {
  return [...heartbeats.values()].sort((a, b) => a.region.localeCompare(b.region));
}

export function resetHeartbeatsForTest(): void {
  heartbeats.clear();
}
