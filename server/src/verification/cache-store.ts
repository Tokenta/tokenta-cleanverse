/** Mechanism spec §4B — verification result cache */

import type { VerificationProof } from "../types/verification.js";
import { recordAudit } from "../security/audit-log.js";

interface CacheEntry {
  proof: VerificationProof;
  expiresAt: number;
}

export function quantityBucket(declaredQuantity: number): string {
  if (declaredQuantity < 1_000) return "<1k";
  if (declaredQuantity < 10_000) return "1k-10k";
  if (declaredQuantity < 1_000_000) return "10k-1M";
  return "1M+";
}

export function buildCacheKey(
  provider: string,
  keyFingerprint: string,
  accessMethod: string,
  declaredQuantity: number,
  probeModelId: string,
): string {
  return `${provider}|${keyFingerprint}|${accessMethod}|${quantityBucket(declaredQuantity)}|${probeModelId}`;
}

/** PRE_PURCHASE — scope cache to order + buyer (mechanism §4B / engine Phase 3) */
export function buildScopedCacheKey(
  baseKey: string,
  orderId?: string,
  buyerId?: string,
): string {
  if (!orderId || !buyerId) return baseKey;
  return `${baseKey}|order:${orderId}|buyer:${buyerId}`;
}

export class VerificationCacheStore {
  private cache = new Map<string, CacheEntry>();

  get(key: string): VerificationProof | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return { ...entry.proof, cacheHit: true };
  }

  put(key: string, proof: VerificationProof, ttlSeconds: number): void {
    this.cache.set(key, {
      proof: { ...proof, cacheHit: false },
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidateByFingerprint(keyFingerprint: string, reason = "fingerprint_invalidate"): void {
    let removed = 0;
    for (const k of this.cache.keys()) {
      if (k.includes(keyFingerprint)) {
        this.cache.delete(k);
        removed++;
      }
    }
    if (removed > 0) {
      recordAudit({
        type: "CACHE_INVALIDATE",
        keyFingerprint,
        reason: `${reason}:${removed}`,
      });
    }
  }
}

export const globalCacheStore = new VerificationCacheStore();
