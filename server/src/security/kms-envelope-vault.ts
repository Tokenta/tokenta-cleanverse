/**
 * KMS envelope vault — AES-256-GCM data key wrapped by KMS master key stub (§15).
 * Production: replace wrap/unwrap with AWS KMS Encrypt/Decrypt or Vault transit.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { CredentialVault } from "./credential-vault.js";

const REF_PREFIX = "kms:envelope:v1:";

function masterKey(): Buffer {
  const secret =
    process.env.KMS_MASTER_KEY ??
    process.env.CREDENTIAL_VAULT_KEY ??
    "tokenta-kms-master-stub-change-me";
  return scryptSync(secret, "tokenta-kms-envelope-v1", 32);
}

function wrapDataKey(dataKey: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

function unwrapDataKey(wrapped: string): Buffer {
  const buf = Buffer.from(wrapped, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

interface StoredEnvelope {
  wrappedKey: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

export class KmsEnvelopeVault implements CredentialVault {
  private store = new Map<string, StoredEnvelope>();

  async put(ref: string, plaintext: string): Promise<void> {
    const dataKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    this.store.set(ref, {
      wrappedKey: wrapDataKey(dataKey),
      iv: iv.toString("base64url"),
      tag: tag.toString("base64url"),
      ciphertext: enc.toString("base64url"),
    });
  }

  async get(ref: string): Promise<string | null> {
    const env = this.store.get(ref);
    if (!env) return null;
    const dataKey = unwrapDataKey(env.wrappedKey);
    const iv = Buffer.from(env.iv, "base64url");
    const tag = Buffer.from(env.tag, "base64url");
    const data = Buffer.from(env.ciphertext, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", dataKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }

  async delete(ref: string): Promise<void> {
    this.store.delete(ref);
  }
}

export function kmsEnvelopeRef(listingId: string): string {
  return `${REF_PREFIX}${listingId}`;
}

export function isKmsEnvelopeRef(ref: string): boolean {
  return ref.startsWith(REF_PREFIX);
}
