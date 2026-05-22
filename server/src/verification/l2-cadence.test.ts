import { describe, expect, it, beforeEach } from "vitest";
import { canRunScheduledL2, recordL2Probe, resetL2CadenceForTest } from "./l2-cadence.js";

describe("l2-cadence", () => {
  beforeEach(() => resetL2CadenceForTest());

  it("blocks second scheduled L2 within window", () => {
    const fp = "fp_cadence";
    recordL2Probe(fp);
    const second = canRunScheduledL2(fp, { manualTrigger: false });
    expect(second.allowed).toBe(false);
  });

  it("allows manual trigger immediately", () => {
    const fp = "fp_manual";
    recordL2Probe(fp);
    expect(canRunScheduledL2(fp, { manualTrigger: true }).allowed).toBe(true);
  });
});
