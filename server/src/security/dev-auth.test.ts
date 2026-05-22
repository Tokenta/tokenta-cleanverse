import { afterEach, describe, expect, it } from "vitest";
import app from "../api/server.js";

describe("dev-auth middleware", () => {
  const prevRequire = process.env.REQUIRE_API_AUTH;
  const prevToken = process.env.API_DEV_TOKEN;

  afterEach(() => {
    process.env.REQUIRE_API_AUTH = prevRequire;
    process.env.API_DEV_TOKEN = prevToken;
  });

  it("allows verification when auth disabled", async () => {
    process.env.REQUIRE_API_AUTH = "false";
    const res = await app.request("/api/v1/verification/feed");
    expect(res.status).toBe(200);
  });

  it("rejects without token when auth required", async () => {
    process.env.REQUIRE_API_AUTH = "true";
    process.env.API_DEV_TOKEN = "test-secret-token";
    const res = await app.request("/api/v1/verification/feed");
    expect(res.status).toBe(401);
  });

  it("accepts Bearer token when auth required", async () => {
    process.env.REQUIRE_API_AUTH = "true";
    process.env.API_DEV_TOKEN = "test-secret-token";
    const res = await app.request("/api/v1/verification/feed", {
      headers: { Authorization: "Bearer test-secret-token" },
    });
    expect(res.status).toBe(200);
  });
});
