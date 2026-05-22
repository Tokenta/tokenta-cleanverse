import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getCredentialVault,
  resetVaultForTest,
  storeListingCredential,
  retrieveListingCredential,
  zeroizeListingCredential,
} from "./credential-vault.js";

describe("credential-vault", () => {
  const prev = process.env.DEV_CREDENTIAL_VAULT;

  beforeEach(() => {
    resetVaultForTest();
    process.env.DEV_CREDENTIAL_VAULT = "true";
  });

  afterEach(() => {
    process.env.DEV_CREDENTIAL_VAULT = prev;
    resetVaultForTest();
    void zeroizeListingCredential("listing/test-1");
  });

  it("stores and retrieves by listing ref", async () => {
    const ref = await storeListingCredential("test-1", "sk-test-secret");
    expect(ref).toBe("listing/test-1");
    const key = await retrieveListingCredential(ref!);
    expect(key).toBe("sk-test-secret");
    await zeroizeListingCredential(ref!);
    expect(await retrieveListingCredential(ref!)).toBeNull();
  });

  it("returns null when vault disabled", () => {
    process.env.DEV_CREDENTIAL_VAULT = "false";
    resetVaultForTest();
    expect(getCredentialVault()).toBeNull();
  });
});
