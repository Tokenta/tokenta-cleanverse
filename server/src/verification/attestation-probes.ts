/**
 * Optional ZK / TEE attestation probe records (F2.2 / engine Phase 5 scaffold).
 * Real ZK-PROOF and TEE hardware integrations replace this when available.
 */

import type { ProbeRecord } from "../types/verification.js";

export function isZkTeeAttestMockEnabled(): boolean {
  return process.env.ZK_TEE_ATTEST_MOCK === "true";
}

export function buildZkTeeAttestationProbes(): ProbeRecord[] {
  const ts = new Date().toISOString();
  return [
    {
      paradigm: "ZK",
      endpoint: "ZK_PROOF_COMPUTE",
      probeModelId: "tokenta-zk-v0",
      httpStatus: 200,
      latencyMs: 12,
      tokensUsed: 0,
      requestsUsed: 0,
      maxTokensUsed: 0,
      result: "PASS",
      timestamp: ts,
      cached: false,
    },
    {
      paradigm: "TEE",
      endpoint: "TEE_ATTEST_ENCLAVE",
      probeModelId: "tokenta-tee-v0",
      httpStatus: 200,
      latencyMs: 8,
      tokensUsed: 0,
      requestsUsed: 0,
      maxTokensUsed: 0,
      result: "PASS",
      timestamp: ts,
      cached: false,
    },
  ];
}

export function appendAttestationProbes(probes: ProbeRecord[]): void {
  if (!isZkTeeAttestMockEnabled()) return;
  probes.push(...buildZkTeeAttestationProbes());
}
