/** Mechanism spec §4D — calls before budget */

import type { ProbeEnvelope } from "./envelope.js";
import type { VerificationLockState } from "../types/verification.js";

export interface BudgetState {
  probeCallCount: number;
  livenessCallCount: number;
  accumulatedTokens: number;
  probeModelId: string;
  lockState: VerificationLockState;
  cooldownActive: boolean;
}

export type ProbeDenyReason =
  | "LOCK_BLOCKS_L2"
  | "MAX_PROBE_CALLS"
  | "MAX_LIVENESS_CALLS"
  | "COOLDOWN"
  | "ENVELOPE_EXCEEDED";

export function canRunLiveness(state: BudgetState, envelope: ProbeEnvelope): ProbeDenyReason | null {
  if (state.cooldownActive) return "COOLDOWN";
  if (state.lockState === "TERMINAL_FAIL_LOCKED") return "LOCK_BLOCKS_L2";
  if (state.livenessCallCount >= envelope.maxLivenessCalls) return "MAX_LIVENESS_CALLS";
  return null;
}

export function canRunMicroProbe(
  state: BudgetState,
  envelope: ProbeEnvelope,
  estimatedTokens: number,
): ProbeDenyReason | null {
  if (state.cooldownActive) return "COOLDOWN";
  if (
    state.lockState === "TERMINAL_FAIL_LOCKED" ||
    state.lockState === "COOLDOWN_LOCKED"
  ) {
    return "LOCK_BLOCKS_L2";
  }
  if (state.probeCallCount >= envelope.maxProbeCalls) return "MAX_PROBE_CALLS";
  if (state.accumulatedTokens + estimatedTokens > envelope.operationalMaxProbeTokens) {
    return "ENVELOPE_EXCEEDED";
  }
  return null;
}

export function shouldStopDespiteEnvelopeRoom(
  state: BudgetState,
  envelope: ProbeEnvelope,
): boolean {
  return state.probeCallCount >= envelope.maxProbeCalls;
}
