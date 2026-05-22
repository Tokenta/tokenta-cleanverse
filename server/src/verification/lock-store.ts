/** Mechanism spec §4C — verification lock state machine */

import type { VerificationLockState } from "../types/verification.js";
import { recordAudit } from "../security/audit-log.js";

interface LockEntry {
  state: VerificationLockState;
  reason?: string;
  expiresAt?: number;
  updatedAt: number;
}

const TERMINAL_FAIL_CODES = new Set([
  "INVALID_KEY",
  "KEY_REVOKED",
  "FORBIDDEN",
  "BLACKLIST_KEY",
  "MODEL_NOT_ENTITLED",
  "QUOTA_EXHAUSTED",
  "BILLING_INACTIVE",
  "RATE_LIMIT_ZERO",
]);

export class VerificationLockStore {
  private locks = new Map<string, LockEntry>();

  get(keyFingerprint: string): VerificationLockState {
    const entry = this.locks.get(keyFingerprint);
    if (!entry) return "UNLOCKED";
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.locks.delete(keyFingerprint);
      return "UNLOCKED";
    }
    return entry.state;
  }

  set(keyFingerprint: string, state: VerificationLockState, reason?: string, ttlMs?: number): void {
    const prev = this.get(keyFingerprint);
    this.locks.set(keyFingerprint, {
      state,
      reason,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      updatedAt: Date.now(),
    });
    if (prev !== state) {
      recordAudit({
        type: "LOCK_TRANSITION",
        keyFingerprint,
        from: prev,
        to: state,
        reason,
      });
    }
  }

  canProbeL2(keyFingerprint: string, automated: boolean): boolean {
    const state = this.get(keyFingerprint);
    if (automated && state === "TERMINAL_FAIL_LOCKED") return false;
    if (automated && state === "COOLDOWN_LOCKED") return false;
    if (state === "TERMINAL_FAIL_LOCKED") return false;
    return true;
  }

  applyFailure(keyFingerprint: string, failureCode: string): void {
    if (TERMINAL_FAIL_CODES.has(failureCode)) {
      this.set(keyFingerprint, "TERMINAL_FAIL_LOCKED", failureCode);
    }
  }

  applyCooldown(keyFingerprint: string, ms = 3_600_000): void {
    this.set(keyFingerprint, "COOLDOWN_LOCKED", "VERIFICATION_ABUSE_COOLDOWN", ms);
  }

  applyPass(keyFingerprint: string): void {
    this.set(keyFingerprint, "TERMINAL_PASS_CACHED");
  }

  applyDegraded(keyFingerprint: string): void {
    this.set(keyFingerprint, "PARTIAL_SUCCESS_DEGRADED");
  }

  clear(keyFingerprint: string): void {
    this.locks.delete(keyFingerprint);
  }
}

export const globalLockStore = new VerificationLockStore();
