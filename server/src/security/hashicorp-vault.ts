/**
 * HashiCorp Vault KV v2 stub (engine §15). Production: VAULT_ADDR + VAULT_TOKEN.
 */

import type { CredentialVault } from "./credential-vault.js";

function vaultPathFromRef(ref: string): string {
  const slug = ref.replace(/[^a-zA-Z0-9/_-]/g, "_");
  return `tokenta/credentials/${slug}`;
}

export function isHashicorpVaultEnabled(): boolean {
  return (
    process.env.HASHICORP_VAULT_ENABLED === "true" &&
    !!process.env.VAULT_ADDR &&
    !!process.env.VAULT_TOKEN
  );
}

export class HashicorpVault implements CredentialVault {
  constructor(
    private baseUrl: string,
    private token: string,
    private mount = process.env.VAULT_KV_MOUNT ?? "secret",
  ) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}/v1/${this.mount}/data/${path}`;
  }

  async put(ref: string, plaintext: string): Promise<void> {
    const path = vaultPathFromRef(ref);
    const res = await fetch(this.url(path), {
      method: "POST",
      headers: { "X-Vault-Token": this.token, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { apiKey: plaintext } }),
    });
    if (!res.ok) {
      throw new Error(`Vault write failed: ${res.status}`);
    }
  }

  async get(ref: string): Promise<string | null> {
    const path = vaultPathFromRef(ref);
    const res = await fetch(this.url(path), {
      headers: { "X-Vault-Token": this.token },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { data?: { apiKey?: string } } };
    return body.data?.data?.apiKey ?? null;
  }

  async delete(ref: string): Promise<void> {
    const path = vaultPathFromRef(ref);
    const metaUrl = `${this.baseUrl.replace(/\/$/, "")}/v1/${this.mount}/metadata/${path}`;
    await fetch(metaUrl, {
      method: "DELETE",
      headers: { "X-Vault-Token": this.token },
    }).catch(() => {});
  }
}
