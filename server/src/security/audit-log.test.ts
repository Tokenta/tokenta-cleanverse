import { beforeEach, describe, expect, it } from "vitest";
import { listAudit, recordAudit, resetAuditForTest } from "./audit-log.js";

describe("audit-log", () => {
  beforeEach(() => resetAuditForTest());

  it("filters entries by type", () => {
    recordAudit({ type: "BIND_VERIFICATION", listingId: "L1", jobId: "J1" });
    recordAudit({ type: "ESCROW_FUND", orderId: "O1", amountUsdc: "10" });
    recordAudit({ type: "CACHE_INVALIDATE", keyFingerprint: "fp1" });

    const bindOnly = listAudit(50, "BIND_VERIFICATION");
    expect(bindOnly).toHaveLength(1);
    expect(bindOnly[0]?.type).toBe("BIND_VERIFICATION");

    const all = listAudit(50);
    expect(all.length).toBeGreaterThanOrEqual(3);
  });
});
