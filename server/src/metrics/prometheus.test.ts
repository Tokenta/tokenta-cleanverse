import { describe, expect, it } from "vitest";
import { renderPrometheusMetrics } from "./prometheus.js";

describe("prometheus metrics", () => {
  it("renders text exposition format", async () => {
    const text = await renderPrometheusMetrics();
    expect(text).toContain("tokenta_verification_jobs_total");
    expect(text).toContain("tokenta_verification_slo_under_60s_pct");
    expect(text).toContain("tokenta_queue_backend_info");
  });
});
