import { describe, expect, it } from "vitest";
import {
  formatLocalTime,
  isValidIanaTimezone,
  resolveTerminalTimezone,
  utcOffsetMinutes,
} from "./timezone-service.js";

describe("timezone-service", () => {
  it("validates IANA ids", () => {
    expect(isValidIanaTimezone("America/New_York")).toBe(true);
    expect(isValidIanaTimezone("not-a-zone")).toBe(false);
  });

  it("resolves browser header timezone", async () => {
    const res = await resolveTerminalTimezone({
      headerTimezone: "Asia/Tokyo",
      headerSource: "browser",
      requestHeaders: new Headers(),
    });
    expect(res.effectiveTimezone).toBe("Asia/Tokyo");
    expect(res.source).toBe("browser");
    expect(res.localTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("falls back to UTC without hints", async () => {
    const res = await resolveTerminalTimezone({
      requestHeaders: new Headers(),
    });
    expect(res.effectiveTimezone).toBe("UTC");
    expect(res.source).toBe("utc");
  });

  it("prefers session timezone over header", async () => {
    const res = await resolveTerminalTimezone({
      sessionTimezone: "Europe/London",
      headerTimezone: "America/Los_Angeles",
      requestHeaders: new Headers(),
    });
    expect(res.effectiveTimezone).toBe("Europe/London");
    expect(res.source).toBe("session");
  });

  it("formats local clock in zone", () => {
    const at = new Date("2026-05-22T12:00:00.000Z");
    expect(formatLocalTime("UTC", at)).toBe("12:00:00");
    expect(utcOffsetMinutes("UTC", at)).toBe(0);
  });
});
