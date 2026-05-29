import { describe, expect, it, beforeEach } from "vitest";
import { VerificationLockStore } from "./lock-store.js";
import { resetAuditForTest } from "../security/audit-log.js";

const TERMINAL_CODES = [
  "KEY_REVOKED",
  "FORBIDDEN",
  "BLACKLIST_KEY",
  "MODEL_NOT_ENTITLED",
  "QUOTA_EXHAUSTED",
  "BILLING_INACTIVE",
  "RATE_LIMIT_ZERO",
] as const;

describe("lock FSM §4C transition table", () => {
  let store: VerificationLockStore;

  beforeEach(() => {
    resetAuditForTest();
    store = new VerificationLockStore();
  });

  it("applyFailure(INVALID_KEY) does not terminal-lock", () => {
    const fp = "fp_invalid_key";
    store.applyFailure(fp, "INVALID_KEY");
    expect(store.get(fp)).toBe("UNLOCKED");
  });

  it.each(TERMINAL_CODES)("applyFailure(%s) -> TERMINAL_FAIL_LOCKED", (code) => {
    const fp = `fp_${code}`;
    store.applyFailure(fp, code);
    expect(store.get(fp)).toBe("TERMINAL_FAIL_LOCKED");
    expect(store.canProbeL2(fp, true)).toBe(false);
  });

  it("applyPass -> TERMINAL_PASS_CACHED", () => {
    const fp = "fp_pass";
    store.applyPass(fp);
    expect(store.get(fp)).toBe("TERMINAL_PASS_CACHED");
  });

  it("applyDegraded -> PARTIAL_SUCCESS_DEGRADED", () => {
    const fp = "fp_deg";
    store.applyDegraded(fp);
    expect(store.get(fp)).toBe("PARTIAL_SUCCESS_DEGRADED");
  });

  it("applyCooldown -> COOLDOWN_LOCKED with TTL expiry", () => {
    const fp = "fp_cd";
    store.applyCooldown(fp, 1);
    expect(store.get(fp)).toBe("COOLDOWN_LOCKED");
    expect(store.canProbeL2(fp, true)).toBe(false);
  });
});
