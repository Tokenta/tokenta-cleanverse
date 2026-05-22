import { useEffect, useState } from "react";
import {
  fetchTerminalReputation,
  type ReputationScoreResponse,
} from "../api/verification";

/** Shared reputation score for TopBar + Reputation panel (same API source). */
export function useTerminalReputation(pollMs = 10_000) {
  const [score, setScore] = useState<ReputationScoreResponse | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const load = () => {
      void fetchTerminalReputation().then((s) => {
        if (s) {
          setLive(true);
          setScore(s);
        }
      });
    };
    load();
    const t = window.setInterval(load, pollMs);
    return () => window.clearInterval(t);
  }, [pollMs]);

  const compositeDisplay = score?.compositeDisplay ?? (live ? "--" : null);
  const isUnverified = (score?.status ?? "UNVERIFIED") === "UNVERIFIED";

  return {
    score,
    live,
    compositeDisplay,
    isUnverified,
    tier: score?.tier ?? "NONE",
    status: score?.status ?? "UNVERIFIED",
  };
}
