/** Client-side terminal timezone detection and formatting (IANA). */

const STORAGE_KEY = "tokenta.terminal.timezone";

export type TerminalTimezoneSource = "browser" | "ip" | "utc" | "session";

export interface TerminalTimezoneState {
  effectiveTimezone: string;
  source: TerminalTimezoneSource;
  displayLabel: string;
  utcOffsetMinutes: number;
}

export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    /* fall through */
  }
  return "UTC";
}

export function loadPersistedTimezone(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistTimezone(timezone: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, timezone);
  } catch {
    /* ignore */
  }
}

export function formatTerminalClock(timeZone: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const abbr = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const label = abbr && abbr.length <= 6 ? abbr : timeZone.split("/").pop() ?? "UTC";
  return `${pick("hour")}:${pick("minute")}:${pick("second")} ${label}`;
}

/** Format ISO or epoch for tables (order room, reputation ledger). */
export function formatTerminalTimestamp(
  input: string | number | Date,
  timeZone: string,
): string {
  const at = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(at.getTime())) return String(input);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(at);
}

export function timezoneRequestHeaders(): Record<string, string> {
  const tz = detectBrowserTimezone();
  return {
    "X-Timezone": tz,
    "X-Timezone-Source": "browser",
  };
}
