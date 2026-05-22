/**
 * Engine spec §15 — API key lifecycle. Production: KMS/Vault via ciphertextRef only.
 * DEV_CREDENTIAL_VAULT=true enables in-process vault for local smoke tests only.
 */

import { EncryptedDevVault, isEncryptedVaultEnabled } from "./encrypted-vault.js";
import { KmsEnvelopeVault, kmsEnvelopeRef } from "./kms-envelope-vault.js";
import { HashicorpVault, isHashicorpVaultEnabled } from "./hashicorp-vault.js";

export interface CredentialVault {
  put(ref: string, plaintext: string): Promise<void>;
  get(ref: string): Promise<string | null>;
  delete(ref: string): Promise<void>;
}

class DevInMemoryVault implements CredentialVault {
  private secrets = new Map<string, string>();

  async put(ref: string, plaintext: string): Promise<void> {
    this.secrets.set(ref, plaintext);
  }

  async get(ref: string): Promise<string | null> {
    return this.secrets.get(ref) ?? null;
  }

  async delete(ref: string): Promise<void> {
    this.secrets.delete(ref);
  }
}

/** Envelope encryption with KMS-wrapped data key (stub master key locally). */
class KmsVaultStub extends KmsEnvelopeVault {}

let vault: CredentialVault | null = null;

export function resetVaultForTest(): void {
  vault = null;
}

export function getCredentialVault(): CredentialVault | null {
  if (isHashicorpVaultEnabled()) {
    if (!vault) {
      vault = new HashicorpVault(process.env.VAULT_ADDR!, process.env.VAULT_TOKEN!);
    }
    return vault;
  }
  if (process.env.KMS_VAULT_ENABLED === "true") {
    if (!vault) vault = new KmsVaultStub();
    return vault;
  }
  if (process.env.DEV_CREDENTIAL_VAULT === "true") {
    if (!vault) {
      vault = isEncryptedVaultEnabled() ? new EncryptedDevVault() : new DevInMemoryVault();
    }
    return vault;
  }
  return null;
}

export async function storeListingCredential(
  listingId: string,
  apiKey: string,
): Promise<string | null> {
  const v = getCredentialVault();
  if (!v) return null;
  const ref = isHashicorpVaultEnabled()
    ? `vault:listing/${listingId}`
    : process.env.KMS_VAULT_ENABLED === "true"
      ? kmsEnvelopeRef(listingId)
      : `listing/${listingId}`;
  await v.put(ref, apiKey);
  return ref;
}

export async function retrieveListingCredential(ref: string): Promise<string | null> {
  const v = getCredentialVault();
  if (!v) return null;
  return v.get(ref);
}

export async function zeroizeListingCredential(ref: string): Promise<void> {
  const v = getCredentialVault();
  if (!v) return;
  await v.delete(ref);
}
