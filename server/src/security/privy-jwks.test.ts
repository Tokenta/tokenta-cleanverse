import { createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetJwksCacheForTest,
  verifyRs256WithJwks,
  fetchJwks,
} from "./privy-jwks.js";

function signRs256Jwt(wallet: string, privateKeyPem: string, kid: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({
      wallet_address: wallet,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const sig = createSign("RSA-SHA256").update(data).sign(privateKeyPem, "base64url");
  return `${data}.${sig}`;
}

describe("privy-jwks", () => {
  const wallet = "0x2222222222222222222222222222222222222222";

  beforeEach(() => resetJwksCacheForTest());
  afterEach(() => vi.restoreAllMocks());

  it("verifies RS256 token against JWKS n/e", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pub = publicKey.export({ format: "jwk" }) as { n: string; e: string; kid?: string };
    const kid = "test-rsa-1";
    const keys = [{ kty: "RSA", kid, n: pub.n, e: pub.e, alg: "RS256" }];
    const token = signRs256Jwt(wallet, privateKey.export({ type: "pkcs1", format: "pem" }) as string, kid);
    expect(verifyRs256WithJwks(token, keys)).toBe(true);
    expect(verifyRs256WithJwks(token + "x", keys)).toBe(false);
  });

  it("fetches and caches JWKS document", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pub = publicKey.export({ format: "jwk" }) as { n: string; e: string };
    const jwks = { keys: [{ kty: "RSA", kid: "k1", n: pub.n, e: pub.e, alg: "RS256" }] };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => jwks,
      })) as typeof fetch,
    );

    process.env.PRIVY_JWKS_URL = "https://auth.example/jwks.json";
    const k1 = await fetchJwks(process.env.PRIVY_JWKS_URL);
    const k2 = await fetchJwks(process.env.PRIVY_JWKS_URL);
    expect(k1).toHaveLength(1);
    expect(k2).toBe(k1);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);

    const token = signRs256Jwt(
      wallet,
      privateKey.export({ type: "pkcs1", format: "pem" }) as string,
      "k1",
    );
    expect(verifyRs256WithJwks(token, k1)).toBe(true);
  });
});
