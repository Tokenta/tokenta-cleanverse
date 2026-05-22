import { useEffect, useState } from "react";
import { fetchTerminalTimezone } from "../api/verification";
import {
  detectBrowserTimezone,
  formatTerminalClock,
  persistTimezone,
  type TerminalTimezoneState,
} from "../timezone/terminal-timezone";

export function useTerminalTimezone(): {
  clock: string;
  timezone: TerminalTimezoneState;
} {
  const browserTz = detectBrowserTimezone();
  const [timezone, setTimezone] = useState<TerminalTimezoneState>({
    effectiveTimezone: browserTz,
    source: "browser",
    displayLabel: browserTz.split("/").pop() ?? "UTC",
    utcOffsetMinutes: 0,
  });
  const [clock, setClock] = useState(() => formatTerminalClock(browserTz));

  useEffect(() => {
    let cancelled = false;
    void fetchTerminalTimezone().then((res) => {
      if (cancelled || !res) return;
      persistTimezone(res.effectiveTimezone);
      setTimezone({
        effectiveTimezone: res.effectiveTimezone,
        source: res.source,
        displayLabel: res.displayLabel,
        utcOffsetMinutes: res.utcOffsetMinutes,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tz = timezone.effectiveTimezone;
    const tick = () => setClock(formatTerminalClock(tz));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timezone.effectiveTimezone]);

  return { clock, timezone };
}
