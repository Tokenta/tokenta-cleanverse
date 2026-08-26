import { PrismaClient } from "@prisma/client";

let client: PrismaClient | null = null;

export function isDbPersistenceEnabled(): boolean {
  return process.env.USE_DB_PERSISTENCE === "true" && !!process.env.DATABASE_URL;
}

export function getPrisma(): PrismaClient | null {
  if (!isDbPersistenceEnabled()) return null;
  if (!client) client = new PrismaClient();
  return client;
}
