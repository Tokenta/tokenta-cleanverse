/** Mechanism §12 — at most one scheduled L2 per fingerprint per 6h */

const L2_CADENCE_MS = Number(process.env.L2_CADENCE_MS ?? 6 * 60 * 60 * 1000);

const lastL2ByFingerprint = new Map<string, number>();

export type L2CadenceCheck = { allowed: true } | { allowed: false; reason: string };

export function canRunScheduledL2(
  keyFingerprint: string,
  opts: { manualTrigger?: boolean; forceL2?: boolean; cacheInvalidated?: boolean },
): L2CadenceCheck {
  if (opts.manualTrigger || opts.forceL2 || opts.cacheInvalidated) {
    return { allowed: true };
  }

  const last = lastL2ByFingerprint.get(keyFingerprint);
  if (last == null) return { allowed: true };

  const elapsed = Date.now() - last;
  if (elapsed >= L2_CADENCE_MS) return { allowed: true };

  const mins = Math.ceil((L2_CADENCE_MS - elapsed) / 60_000);
  return {
    allowed: false,
    reason: `L2 cadence — next micro-probe allowed in ~${mins}m (§12)`,
  };
}

export function recordL2Probe(keyFingerprint: string): void {
  lastL2ByFingerprint.set(keyFingerprint, Date.now());
}

export function invalidateL2Cadence(keyFingerprint: string): void {
  lastL2ByFingerprint.delete(keyFingerprint);
}

export function resetL2CadenceForTest(): void {
  lastL2ByFingerprint.clear();
}
