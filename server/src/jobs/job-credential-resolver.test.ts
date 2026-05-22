import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { jobStore } from "./store.js";
import { listingStore } from "../listings/store.js";
import { resolveJobApiKey } from "./job-credential-resolver.js";
import { resetVaultForTest, storeListingCredential } from "../security/credential-vault.js";

describe("job-credential-resolver", () => {
  beforeEach(() => {
    jobStore["jobs"].clear();
    listingStore["listings"].clear();
    resetVaultForTest();
    process.env.DEV_CREDENTIAL_VAULT = "true";
  });

  afterEach(() => {
    delete process.env.DEV_CREDENTIAL_VAULT;
    resetVaultForTest();
  });

  it("loads apiKey from listing credentialRef when job payload omits key", async () => {
    const listing = listingStore.create({
      providerKind: "openai",
      quotaToSell: 5000,
      askPriceUsdc: 10,
      keyFingerprint: "fp_resolver_test",
      verificationJobId: "vj_placeholder",
    });
    const ref = await storeListingCredential(listing.id, "sk-vault-resolver-test-key-12345");
    if (ref) listingStore.setCredentialRef(listing.id, ref);

    const job = jobStore.create(
      { provider: "openai", apiKey: "", declaredQuantity: 5000, context: "LIVE", l1Only: true },
      { listingId: listing.id, keyFingerprint: listing.keyFingerprint },
    );

    const ok = await resolveJobApiKey(job);
    expect(ok).toBe(true);
    expect(job.request.apiKey).toBe("sk-vault-resolver-test-key-12345");
  });
});
