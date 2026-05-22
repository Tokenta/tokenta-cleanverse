/** Mechanism §11 — fingerprint blocklist (dev: env comma-separated) */

const ENV_BLOCKLIST = process.env.VERIFICATION_BLACKLIST_FINGERPRINTS ?? "";

const staticBlock = new Set(
  ENV_BLOCKLIST.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export function isBlacklistedFingerprint(keyFingerprint: string): boolean {
  return staticBlock.has(keyFingerprint);
}
