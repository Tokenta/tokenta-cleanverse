import { afterEach, describe, expect, it } from "vitest";
import { appendAttestationProbes, buildZkTeeAttestationProbes } from "./attestation-probes.js";

describe("attestation-probes", () => {
  afterEach(() => {
    delete process.env.ZK_TEE_ATTEST_MOCK;
  });

  it("appends ZK and TEE records when mock enabled", () => {
    process.env.ZK_TEE_ATTEST_MOCK = "true";
    const probes: { paradigm: string }[] = [];
    appendAttestationProbes(probes as never);
    expect(probes).toHaveLength(2);
    expect(probes.map((p) => p.paradigm)).toEqual(["ZK", "TEE"]);
  });

  it("builds standalone probe pair", () => {
    expect(buildZkTeeAttestationProbes()).toHaveLength(2);
  });
});
