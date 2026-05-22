import { afterEach, describe, expect, it } from "vitest";
import { withProviderSlot, resetProviderLimiterForTest, providerLimiterStats } from "./provider-limiter.js";

describe("provider-limiter", () => {
  afterEach(() => {
    resetProviderLimiterForTest();
    delete process.env.PROVIDER_MAX_CONCURRENT;
  });

  it("limits concurrent slots", async () => {
    process.env.PROVIDER_MAX_CONCURRENT = "2";
    const releaseFns: Array<() => void> = [];
    const p1 = withProviderSlot(
      () =>
        new Promise<void>((r) => {
          releaseFns.push(r);
        }),
    );
    const p2 = withProviderSlot(
      () =>
        new Promise<void>((r) => {
          releaseFns.push(r);
        }),
    );
    await Promise.resolve();
    expect(providerLimiterStats().active).toBe(2);

    const p3Started = withProviderSlot(async () => "ok");
    await Promise.resolve();
    expect(providerLimiterStats().queued).toBeGreaterThanOrEqual(1);

    releaseFns.forEach((r) => r());
    await Promise.all([p1, p2, p3Started]);
  });
});
