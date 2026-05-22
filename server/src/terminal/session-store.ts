import type { TerminalSessionRecord } from "./types.js";

const sessions = new Map<string, TerminalSessionRecord>();

const TTL_SEC = Number(process.env.TERMINAL_SESSION_TTL_SEC ?? 86400);

export function createTerminalSession(
  walletAddress: string | null,
  timezone?: { timezone: string; timezoneSource?: "browser" | "ip" | "utc" },
): TerminalSessionRecord {
  const sessionId = `tsess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const now = Date.now();
  const record: TerminalSessionRecord = {
    sessionId,
    walletAddress,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_SEC * 1000).toISOString(),
    capabilities: ["verify", "proof", "receipt", "anchor"],
    ...(timezone?.timezone
      ? {
          timezone: timezone.timezone,
          timezoneSource: timezone.timezoneSource ?? "browser",
        }
      : {}),
  };
  sessions.set(sessionId, record);
  return record;
}

export function updateSessionTimezone(
  sessionId: string,
  timezone: string,
  timezoneSource: "browser" | "ip" | "utc" = "browser",
): TerminalSessionRecord | undefined {
  const s = getTerminalSession(sessionId);
  if (!s) return undefined;
  s.timezone = timezone;
  s.timezoneSource = timezoneSource;
  return s;
}

export function getTerminalSession(sessionId: string): TerminalSessionRecord | undefined {
  const s = sessions.get(sessionId);
  if (!s) return undefined;
  if (new Date(s.expiresAt).getTime() < Date.now()) {
    sessions.delete(sessionId);
    return undefined;
  }
  return s;
}

export function deleteTerminalSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function resetTerminalSessionsForTest(): void {
  sessions.clear();
}

export function isTerminalSessionRequired(): boolean {
  return process.env.TERMINAL_SESSION_REQUIRED === "true";
}
