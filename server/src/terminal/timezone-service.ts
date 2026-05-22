/**
 * Terminal timezone resolution — browser-first, optional IP hint.
 */

const IANA_RE = /^[A-Za-z_]+\/[A-Za-z0-9_+-]+$/;

export type TimezoneSource = "browser" | "ip" | "utc" | "session";

export interface TimezoneResolution {
  effectiveTimezone: string;
  source: TimezoneSource;
  utcOffsetMinutes: number;
  displayLabel: string;
  serverTimeUtc: string;
  localTime: string;
  localDate: string;
}

export function isValidIanaTimezone(tz: string): boolean {
  if (!IANA_RE.test(tz)) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function utcOffsetMinutes(timeZone: string, at = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(at);
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const m = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
    if (!m) return 0;
    const sign = m[1] === "-" ? -1 : 1;
    const hours = Number(m[2]);
    const mins = Number(m[3] ?? 0);
    return sign * (hours * 60 + mins);
  } catch {
    return 0;
  }
}

export function timezoneAbbreviation(timeZone: string, at = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(at);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return "UTC";
  }
}

export function formatLocalTime(timeZone: string, at = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(at);
}

export function formatLocalDate(timeZone: string, at = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  return real || null;
}

async function lookupTimezoneByIp(ip: string): Promise<string | null> {
  if (process.env.TERMINAL_TIMEZONE_IP_LOOKUP !== "true") return null;
  if (!ip || ip === "127.0.0.1" || ip.startsWith("::1") || ip.startsWith("192.168.")) {
    return null;
  }
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=timezone,status`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const body = (await res.json()) as { status?: string; timezone?: string };
    if (body.status === "success" && body.timezone && isValidIanaTimezone(body.timezone)) {
      return body.timezone;
    }
  } catch {
    /* optional lookup */
  }
  return null;
}

export async function resolveTerminalTimezone(input: {
  sessionTimezone?: string | null;
  headerTimezone?: string | null;
  headerSource?: string | null;
  requestHeaders: Headers;
}): Promise<TimezoneResolution> {
  const now = new Date();
  let effective = "UTC";
  let source: TimezoneSource = "utc";

  const browserTz =
    input.headerTimezone && isValidIanaTimezone(input.headerTimezone)
      ? input.headerTimezone
      : null;
  const sessionTz =
    input.sessionTimezone && isValidIanaTimezone(input.sessionTimezone)
      ? input.sessionTimezone
      : null;

  if (sessionTz) {
    effective = sessionTz;
    source = "session";
  } else if (browserTz) {
    effective = browserTz;
    source = input.headerSource === "browser" ? "browser" : "browser";
  } else {
    const ip = clientIpFromHeaders(input.requestHeaders);
    if (ip) {
      const ipTz = await lookupTimezoneByIp(ip);
      if (ipTz) {
        effective = ipTz;
        source = "ip";
      }
    }
  }

  return {
    effectiveTimezone: effective,
    source,
    utcOffsetMinutes: utcOffsetMinutes(effective, now),
    displayLabel: timezoneAbbreviation(effective, now),
    serverTimeUtc: now.toISOString(),
    localTime: formatLocalTime(effective, now),
    localDate: formatLocalDate(effective, now),
  };
}
