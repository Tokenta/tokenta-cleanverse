/**
 * Engine §17 — multi-region worker topology (scaffold).
 */

export interface WorkerRegionInfo {
  region: string;
  role: "api" | "worker";
  queueName: string;
  active: boolean;
}

const BULL_QUEUE_PREFIX = "tokenta-verification";

export function getLocalWorkerRegion(): string {
  return process.env.WORKER_REGION ?? "local";
}

export function parseWorkerRegions(): string[] {
  const raw = process.env.WORKER_REGIONS ?? getLocalWorkerRegion();
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function queueNameForRegion(region: string): string {
  const slug = region.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `${BULL_QUEUE_PREFIX}-${slug}`;
}

export function bullQueueName(): string {
  const region = getLocalWorkerRegion();
  if (process.env.USE_REGIONAL_QUEUES === "true") {
    return queueNameForRegion(region);
  }
  return `${BULL_QUEUE_PREFIX}-standard`;
}

export function bullDlqName(): string {
  return `${BULL_QUEUE_PREFIX}-dlq`;
}

export function getWorkerTopology(): {
  localRegion: string;
  regionalQueuesEnabled: boolean;
  regions: WorkerRegionInfo[];
} {
  const local = getLocalWorkerRegion();
  const regional = process.env.USE_REGIONAL_QUEUES === "true";
  const regions = parseWorkerRegions().map((region) => ({
    region,
    role: region === local ? ("worker" as const) : ("worker" as const),
    queueName: queueNameForRegion(region),
    active: region === local,
  }));

  return {
    localRegion: local,
    regionalQueuesEnabled: regional,
    regions,
  };
}
