/**
 * Run verification worker for a single region (engine §17).
 * Usage: WORKER_REGION=us-east-1 USE_BULLMQ=true REDIS_URL=... tsx scripts/worker-region.ts
 */

import "../src/jobs/worker.js";
import { getWorkerTopology } from "../src/jobs/worker-regions.js";
import { recordWorkerHeartbeat } from "../src/jobs/worker-heartbeat.js";

const topo = getWorkerTopology();
console.log("[worker-region] topology", JSON.stringify(topo, null, 2));
console.log("[worker-region] listening; queue backend from env (USE_BULLMQ / USE_REDIS_QUEUE)");

recordWorkerHeartbeat();
setInterval(() => recordWorkerHeartbeat(), 30_000);
