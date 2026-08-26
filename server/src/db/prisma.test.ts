import { afterEach, describe, expect, it } from "vitest";
import { getPrisma, isDbPersistenceEnabled } from "./prisma.js";

const originalEnabled = process.env.USE_DB_PERSISTENCE;
const originalUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalEnabled == null) delete process.env.USE_DB_PERSISTENCE;
  else process.env.USE_DB_PERSISTENCE = originalEnabled;

  if (originalUrl == null) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
});

describe("Prisma persistence gate", () => {
  it("stays disabled unless both the flag and database URL are present", () => {
    process.env.USE_DB_PERSISTENCE = "false";
    process.env.DATABASE_URL = "postgresql://example.invalid/tokenta";

    expect(isDbPersistenceEnabled()).toBe(false);
    expect(getPrisma()).toBeNull();
  });

  it("provides a client when persistence is explicitly configured", () => {
    process.env.USE_DB_PERSISTENCE = "true";
    process.env.DATABASE_URL = "postgresql://example.invalid/tokenta";

    expect(isDbPersistenceEnabled()).toBe(true);
    expect(getPrisma()).not.toBeNull();
  });
});
