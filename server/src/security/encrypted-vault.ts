/**
 * AES-256-GCM encrypted in-memory vault for dev/staging (not production KMS).
 * Enable: DEV_CREDENTIAL_VAULT_ENCRYPTED=true + CREDENTIAL_VAULT_KEY
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { CredentialVault } from "./credential-vault.js";

function vaultKey(): Buffer {
  const secret =
    process.env.CREDENTIAL_VAULT_KEY ??
    process.env.BIND_SIGNATURE_SECRET ??
    "tokenta-dev-vault-key-change-me";
  return scryptSync(secret, "tokenta-credential-vault-v1", 32);
}

export class EncryptedDevVault implements CredentialVault {
  private blobs = new Map<string, string>();

  async put(ref: string, plaintext: string): Promise<void> {
    const iv = randomBytes(12);
    const key = vaultKey();
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    this.blobs.set(ref, Buffer.concat([iv, tag, enc]).toString("base64"));
  }

  async get(ref: string): Promise<string | null> {
    const blob = this.blobs.get(ref);
    if (!blob) return null;
    const buf = Buffer.from(blob, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", vaultKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }

  async delete(ref: string): Promise<void> {
    this.blobs.delete(ref);
  }
}

export function isEncryptedVaultEnabled(): boolean {
  return process.env.DEV_CREDENTIAL_VAULT_ENCRYPTED === "true";
}
