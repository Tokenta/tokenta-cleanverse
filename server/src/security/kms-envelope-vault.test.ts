import { afterEach, describe, expect, it } from "vitest";
import { KmsEnvelopeVault, kmsEnvelopeRef, isKmsEnvelopeRef } from "./kms-envelope-vault.js";

describe("kms-envelope-vault", () => {
  afterEach(() => {
    delete process.env.KMS_MASTER_KEY;
  });

  it("round-trips plaintext with envelope ref", async () => {
    const v = new KmsEnvelopeVault();
    const ref = kmsEnvelopeRef("lst_1");
    expect(isKmsEnvelopeRef(ref)).toBe(true);
    await v.put(ref, "sk-kms-envelope-secret-key");
    expect(await v.get(ref)).toBe("sk-kms-envelope-secret-key");
    await v.delete(ref);
    expect(await v.get(ref)).toBeNull();
  });
});
