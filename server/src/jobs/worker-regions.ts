/**
 * Engine §17 — multi-region worker topology (scaffold).
 */

export interface WorkerRegionInfo {
  region: string;
  role: "api" | "worker";
  queueName: string;
  active: boolean;
}

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
  return `tokenta:verification:${slug}`;
}

export function bullQueueName(): string {
  const region = getLocalWorkerRegion();
  if (process.env.USE_REGIONAL_QUEUES === "true") {
    return queueNameForRegion(region);
  }
  return "tokenta:verification:standard";
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
