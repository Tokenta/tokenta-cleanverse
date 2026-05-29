import "./config/load-env.js";
import "./config/network.js";
import { serve } from "@hono/node-server";
import app from "./api/server.js";
import { startLiveMonitorScheduler } from "./live-monitor/scheduler.js";
import { reconcilePendingAnchors } from "./terminal/anchor-reconcile.js";

const port = Number(process.env.PORT ?? 8787);

console.log(`Tokenta verification API http://localhost:${port}`);
console.log(`VERIFICATION_MOCK=${process.env.VERIFICATION_MOCK ?? "false"} (set true for sk-mock keys)`);
console.log(
  `SETTLEMENT network=${process.env.SETTLEMENT_NETWORK ?? "base-sepolia"} chain=${process.env.SETTLEMENT_CHAIN_ID ?? 84532}`,
);

startLiveMonitorScheduler();

const reconcileMs = Number(process.env.SETTLEMENT_ANCHOR_RECONCILE_MS ?? 60_000);
if (reconcileMs > 0 && process.env.SETTLEMENT_DRY_RUN !== "true") {
  setInterval(() => {
    void reconcilePendingAnchors().then((r) => {
      if (r.confirmed > 0) {
        console.log(`[anchor-reconcile] confirmed=${r.confirmed} checked=${r.checked}`);
      }
    });
  }, reconcileMs);
}

serve({ fetch: app.fetch, port });
