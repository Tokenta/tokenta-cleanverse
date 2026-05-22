/**
 * Ops overrides — engine §15 audit trail for manual lock/cache actions.
 */

import { globalLockStore } from "../verification/lock-store.js";
import { globalCacheStore } from "../verification/cache-store.js";
import { recordAudit } from "../security/audit-log.js";

export function opsUnlockFingerprint(
  fingerprint: string,
  reason: string,
): { ok: boolean; state?: string; error?: string } {
  const prev = globalLockStore.get(fingerprint);
  if (prev === "UNLOCKED") {
    return { ok: false, error: "already unlocked" };
  }
  globalLockStore.clear(fingerprint);
  const next = globalLockStore.get(fingerprint);
  recordAudit({
    type: "OPS_OVERRIDE",
    keyFingerprint: fingerprint,
    from: prev,
    to: next,
    reason: reason || "ops_unlock",
  });
  return { ok: true, state: next };
}

export function opsInvalidateCache(
  fingerprint: string,
  reason: string,
): { ok: boolean } {
  globalCacheStore.invalidateByFingerprint(fingerprint, reason || "ops_invalidate");
  recordAudit({
    type: "CACHE_INVALIDATE",
    keyFingerprint: fingerprint,
    reason: reason || "ops_invalidate",
  });
  return { ok: true };
}
