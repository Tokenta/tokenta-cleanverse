import { describe, expect, it, beforeEach } from "vitest";
import { VerificationLockStore } from "./lock-store.js";
import { listAudit, resetAuditForTest } from "../security/audit-log.js";

describe("lock-store audit", () => {
  beforeEach(() => resetAuditForTest());

  it("records LOCK_TRANSITION on state change", () => {
    const store = new VerificationLockStore();
    store.set("fp-audit", "COOLDOWN_LOCKED", "test");
    const entries = listAudit(5);
    expect(entries.some((e) => e.type === "LOCK_TRANSITION" && e.to === "COOLDOWN_LOCKED")).toBe(
      true,
    );
  });
});
