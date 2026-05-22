/** Mechanism spec §4F — re-verify abuse resistance */

interface FingerprintStats {
  fullJobs: number[];
  microProbes: number;
  cacheBusts: number;
  windowStart: number;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

const limits = {
  maxFullVerificationJobs: 5,
  maxMicroProbesAcrossJobs: 8,
  maxCacheBustByUser: 3,
};

const stats = new Map<string, FingerprintStats>();

function getStats(fp: string): FingerprintStats {
  let s = stats.get(fp);
  const now = Date.now();
  if (!s || now - s.windowStart > WINDOW_MS) {
    s = { fullJobs: [], microProbes: 0, cacheBusts: 0, windowStart: now };
    stats.set(fp, s);
  }
  return s;
}

export type AbuseCheckResult = { allowed: true } | { allowed: false; code: string; message: string };

export function checkAbuseBeforeJob(keyFingerprint: string, isManualCacheBust = false): AbuseCheckResult {
  const s = getStats(keyFingerprint);
  if (isManualCacheBust) {
    if (s.cacheBusts >= limits.maxCacheBustByUser) {
      return {
        allowed: false,
        code: "VERIFICATION_ABUSE_COOLDOWN",
        message: "Too many manual re-verifications in 24h",
      };
    }
    s.cacheBusts += 1;
  }
  if (s.fullJobs.length >= limits.maxFullVerificationJobs) {
    return {
      allowed: false,
      code: "VERIFICATION_ABUSE_COOLDOWN",
      message: "Maximum verification jobs per key exceeded (24h)",
    };
  }
  return { allowed: true };
}

export function recordJobStarted(keyFingerprint: string): void {
  const s = getStats(keyFingerprint);
  s.fullJobs.push(Date.now());
}

export function recordMicroProbes(keyFingerprint: string, count: number): void {
  const s = getStats(keyFingerprint);
  s.microProbes += count;
  if (s.microProbes > limits.maxMicroProbesAcrossJobs) {
    throw new Error("VERIFICATION_ABUSE_COOLDOWN");
  }
}

export function resetStatsForTest(): void {
  stats.clear();
}

/** L5 platform risk — job velocity without extra provider calls (§4F). */
export function abuseJobCount24h(keyFingerprint: string): number {
  const s = getStats(keyFingerprint);
  const cutoff = Date.now() - WINDOW_MS;
  return s.fullJobs.filter((t) => t >= cutoff).length;
}
