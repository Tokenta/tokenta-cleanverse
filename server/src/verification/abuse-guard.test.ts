import { describe, it, expect, beforeEach } from "vitest";
import {
  checkAbuseBeforeJob,
  recordJobStarted,
  resetStatsForTest,
} from "./abuse-guard.js";

describe("abuse-guard §4F", () => {
  beforeEach(() => resetStatsForTest());

  it("allows jobs under daily limit", () => {
    const fp = "fp-test-1";
    for (let i = 0; i < 5; i++) {
      expect(checkAbuseBeforeJob(fp).allowed).toBe(true);
      recordJobStarted(fp);
    }
    expect(checkAbuseBeforeJob(fp).allowed).toBe(false);
  });
});
