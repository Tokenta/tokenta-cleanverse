import { describe, it, expect, beforeEach } from "vitest";
import { VerificationLockStore } from "./lock-store.js";

describe("VerificationLockStore TERMINAL_FAIL_LOCKED", () => {
  let store: VerificationLockStore;

  beforeEach(() => {
    store = new VerificationLockStore();
  });

  it("blocks L2 after QUOTA_EXHAUSTED terminal failure", () => {
    const fp = "abc123fingerprint";
    store.applyFailure(fp, "QUOTA_EXHAUSTED");
    expect(store.get(fp)).toBe("TERMINAL_FAIL_LOCKED");
    expect(store.canProbeL2(fp, false)).toBe(false);
    expect(store.canProbeL2(fp, true)).toBe(false);
  });

  it("blocks L2 after INVALID_KEY without auto-unlock", () => {
    const fp = "def456";
    store.applyFailure(fp, "INVALID_KEY");
    expect(store.get(fp)).toBe("TERMINAL_FAIL_LOCKED");
  });

  it("allows probe after unlock via clear", () => {
    const fp = "ghi789";
    store.applyFailure(fp, "MODEL_NOT_ENTITLED");
    store.clear(fp);
    expect(store.get(fp)).toBe("UNLOCKED");
    expect(store.canProbeL2(fp, false)).toBe(true);
  });
});
