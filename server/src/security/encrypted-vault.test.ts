import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EncryptedDevVault } from "./encrypted-vault.js";
import { resetVaultForTest, retrieveListingCredential, storeListingCredential } from "./credential-vault.js";

describe("encrypted-vault", () => {
  beforeEach(() => {
    resetVaultForTest();
    process.env.DEV_CREDENTIAL_VAULT = "true";
    process.env.DEV_CREDENTIAL_VAULT_ENCRYPTED = "true";
    process.env.CREDENTIAL_VAULT_KEY = "test-vault-key-32chars-minimum!!";
  });

  afterEach(() => {
    resetVaultForTest();
    delete process.env.DEV_CREDENTIAL_VAULT_ENCRYPTED;
  });

  it("round-trips ciphertext without storing plaintext in map", async () => {
    const v = new EncryptedDevVault();
    await v.put("listing/x", "sk-secret-value");
    const raw = (v as unknown as { blobs: Map<string, string> }).blobs.get("listing/x");
    expect(raw).not.toContain("sk-secret");
    expect(await v.get("listing/x")).toBe("sk-secret-value");
  });

  it("integrates via credential-vault store/retrieve", async () => {
    const ref = await storeListingCredential("lst_enc", "sk-mock-encrypted");
    expect(ref).toBe("listing/lst_enc");
    const key = await retrieveListingCredential(ref!);
    expect(key).toBe("sk-mock-encrypted");
  });
});
