/**
 * Smoke test: USE_DB_PERSISTENCE=true DATABASE_URL=... npx tsx scripts/persistence-smoke.ts
 */
import { getPrisma, isDbPersistenceEnabled } from "../src/db/prisma.js";

async function main() {
  if (!isDbPersistenceEnabled()) {
    console.error("Set USE_DB_PERSISTENCE=true and DATABASE_URL");
    process.exit(1);
  }
  const prisma = getPrisma();
  if (!prisma) {
    console.error("Prisma client unavailable");
    process.exit(1);
  }
  await prisma.$queryRaw`SELECT 1`;
  const count = await prisma.verificationJob.count();
  console.log("DB OK — verification_jobs count:", count);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
