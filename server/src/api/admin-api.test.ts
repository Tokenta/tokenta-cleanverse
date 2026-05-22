import { describe, expect, it } from "vitest";
import app from "./server.js";

describe("admin API", () => {
  it("GET worker-heartbeats and openapi", async () => {
    const hb = await app.request("/api/v1/admin/worker-heartbeat", { method: "POST" });
    expect(hb.status).toBe(200);

    const list = await app.request("/api/v1/admin/worker-heartbeats");
    expect(list.status).toBe(200);
    const body = (await list.json()) as { workers: unknown[] };
    expect(body.workers.length).toBeGreaterThan(0);

    const oa = await app.request("/api/v1/openapi.json");
    expect(oa.status).toBe(200);
    const spec = (await oa.json()) as { openapi: string };
    expect(spec.openapi).toContain("3.1");

    const prevRegional = process.env.USE_REGIONAL_QUEUES;
    const prevRegions = process.env.WORKER_REGIONS;
    process.env.USE_REGIONAL_QUEUES = "true";
    process.env.WORKER_REGIONS = "us-east-1,eu-west-1";
    const topo = await app.request("/api/v1/admin/worker-topology");
    expect(topo.status).toBe(200);
    const topoBody = (await topo.json()) as {
      regionalQueuesEnabled: boolean;
      regions: { queueName: string }[];
    };
    expect(topoBody.regionalQueuesEnabled).toBe(true);
    expect(topoBody.regions.length).toBe(2);
    expect(topoBody.regions[0]?.queueName).toContain("tokenta:verification:");
    if (prevRegional === undefined) delete process.env.USE_REGIONAL_QUEUES;
    else process.env.USE_REGIONAL_QUEUES = prevRegional;
    if (prevRegions === undefined) delete process.env.WORKER_REGIONS;
    else process.env.WORKER_REGIONS = prevRegions;
  });
});
