/**
 * Prometheus text exposition for Grafana / Alertmanager (engine §18).
 */

import { jobStore } from "../jobs/store.js";
import { tickMonitorStates } from "../live-monitor/state.js";
import { queueBackend } from "../jobs/queue.js";
import { providerLimiterStats } from "../jobs/provider-limiter.js";
import { getBullQueueStats } from "../jobs/bull-queue-stats.js";

function line(name: string, value: number, labels?: Record<string, string>): string {
  const labelStr = labels
    ? `{${Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",")}}`
    : "";
  return `${name}${labelStr} ${value}`;
}

export async function renderPrometheusMetrics(): Promise<string> {
  const m = jobStore.getHealthMetrics();
  const monitor = tickMonitorStates();
  const limiter = providerLimiterStats();
  const lines: string[] = [
    "# HELP tokenta_verification_jobs_total Total verification jobs observed in process",
    "# TYPE tokenta_verification_jobs_total gauge",
    line("tokenta_verification_jobs_total", m.jobs_total),
    "# HELP tokenta_verification_jobs_passed Jobs with PASSED terminal status",
    "# TYPE tokenta_verification_jobs_passed gauge",
    line("tokenta_verification_jobs_passed", m.jobs_passed),
    "# HELP tokenta_verification_jobs_failed Jobs with FAILED terminal status",
    "# TYPE tokenta_verification_jobs_failed gauge",
    line("tokenta_verification_jobs_failed", m.jobs_failed),
    "# HELP tokenta_verification_queue_depth Active queued or running jobs",
    "# TYPE tokenta_verification_queue_depth gauge",
    line("tokenta_verification_queue_depth", m.queue_depth),
    "# HELP tokenta_verification_success_rate_pct Percent of finished jobs that passed",
    "# TYPE tokenta_verification_success_rate_pct gauge",
    line("tokenta_verification_success_rate_pct", m.success_rate),
    "# HELP tokenta_verification_p50_duration_ms Median job duration milliseconds",
    "# TYPE tokenta_verification_p50_duration_ms gauge",
    line("tokenta_verification_p50_duration_ms", m.p50_duration_ms),
    "# HELP tokenta_verification_slo_under_60s_pct Percent of jobs completing under 60s",
    "# TYPE tokenta_verification_slo_under_60s_pct gauge",
    line("tokenta_verification_slo_under_60s_pct", m.slo_standard_under_60s_pct),
    "# HELP tokenta_verification_avg_tokens_used Average tokens burned per finished job",
    "# TYPE tokenta_verification_avg_tokens_used gauge",
    line("tokenta_verification_avg_tokens_used", m.avg_tokens_used),
    "# HELP tokenta_listing_monitor_live Listings in LIVE monitor state",
    "# TYPE tokenta_listing_monitor_live gauge",
    line("tokenta_listing_monitor_live", monitor.live),
    "# HELP tokenta_listing_monitor_stale Listings in STALE monitor state",
    "# TYPE tokenta_listing_monitor_stale gauge",
    line("tokenta_listing_monitor_stale", monitor.stale),
    "# HELP tokenta_listing_monitor_revoked Listings in REVOKED monitor state",
    "# TYPE tokenta_listing_monitor_revoked gauge",
    line("tokenta_listing_monitor_revoked", monitor.revoked),
    "# HELP tokenta_provider_limiter_active In-flight provider HTTP slots",
    "# TYPE tokenta_provider_limiter_active gauge",
    line("tokenta_provider_limiter_active", limiter.active),
    "# HELP tokenta_provider_limiter_queued Waiting for provider slot",
    "# TYPE tokenta_provider_limiter_queued gauge",
    line("tokenta_provider_limiter_queued", limiter.queued),
    "# HELP tokenta_queue_backend_info Queue backend label (1=active)",
    "# TYPE tokenta_queue_backend_info gauge",
    line("tokenta_queue_backend_info", 1, { backend: queueBackend() }),
  ];

  const bull = await getBullQueueStats();
  if (bull) {
    lines.push(
      "# HELP tokenta_bullmq_waiting Jobs waiting in BullMQ",
      "# TYPE tokenta_bullmq_waiting gauge",
      line("tokenta_bullmq_waiting", bull.waiting, { queue: bull.queue }),
      "# HELP tokenta_bullmq_active Jobs active in BullMQ",
      "# TYPE tokenta_bullmq_active gauge",
      line("tokenta_bullmq_active", bull.active, { queue: bull.queue }),
      "# HELP tokenta_bullmq_dlq_waiting Jobs in dead-letter queue",
      "# TYPE tokenta_bullmq_dlq_waiting gauge",
      line("tokenta_bullmq_dlq_waiting", bull.dlqWaiting),
    );
  }

  return `${lines.join("\n")}\n`;
}
