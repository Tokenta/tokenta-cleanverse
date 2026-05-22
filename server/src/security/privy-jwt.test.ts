import { afterEach, describe, expect, it } from "vitest";
import {
  decodeWalletFromJwt,
  signDevPrivyJwt,
  verifyPrivyJwt,
} from "./privy-jwt.js";

describe("privy-jwt", () => {
  const wallet = "0x1111111111111111111111111111111111111111";
  const secret = "privy-dev-secret-for-tests";

  afterEach(() => {
    delete process.env.PRIVY_JWT_VERIFY;
    delete process.env.PRIVY_JWT_DEV_SECRET;
  });

  it("decodes wallet without verify", async () => {
    const token = signDevPrivyJwt(wallet, secret);
    expect(decodeWalletFromJwt(token)).toBe(wallet.toLowerCase());
    const r = await verifyPrivyJwt(token);
    expect(r.wallet).toBe(wallet.toLowerCase());
  });

  it("rejects tampered token when verify enabled", async () => {
    process.env.PRIVY_JWT_VERIFY = "true";
    process.env.PRIVY_JWT_DEV_SECRET = secret;
    const token = signDevPrivyJwt(wallet, secret) + "x";
    expect((await verifyPrivyJwt(token)).ok).toBe(false);
  });

  it("accepts valid HS256 when verify enabled", async () => {
    process.env.PRIVY_JWT_VERIFY = "true";
    process.env.PRIVY_JWT_DEV_SECRET = secret;
    const token = signDevPrivyJwt(wallet, secret);
    const r = await verifyPrivyJwt(token);
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(wallet.toLowerCase());
  });
});
