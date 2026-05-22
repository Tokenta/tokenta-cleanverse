import { describe, expect, it } from "vitest";
import app from "./server.js";

describe("GET /metrics/prometheus", () => {
  it("returns text/plain exposition", async () => {
    const res = await app.request("/metrics/prometheus");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toContain("tokenta_verification_slo_under_60s_pct");
  });
});
