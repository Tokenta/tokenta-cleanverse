/**
 * Full DB path: migrate + persist listing/job round-trip.
 * DATABASE_URL=... USE_DB_PERSISTENCE=true npx tsx scripts/db-integration-smoke.ts
 */
import "../src/jobs/worker.js";
import app from "../src/api/server.js";
import { getPrisma, isDbPersistenceEnabled } from "../src/db/prisma.js";
import { pollJobUntilTerminal } from "../src/test/helpers.js";

async function main() {
  if (!isDbPersistenceEnabled()) {
    console.error("Set USE_DB_PERSISTENCE=true and DATABASE_URL");
    process.exit(1);
  }

  process.env.VERIFICATION_MOCK = "true";

  const prisma = getPrisma();
  if (!prisma) {
    console.error("Prisma unavailable");
    process.exit(1);
  }

  const create = await app.request("/api/v1/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: "sk-mock-db-integration",
      quotaToSell: 8000,
      askPriceUsdc: 9.99,
      providerKind: "openai",
    }),
  });
  if (create.status !== 202) {
    console.error("listing create failed", create.status, await create.text());
    process.exit(1);
  }
  const { jobId } = (await create.json()) as { jobId: string };
  const finished = await pollJobUntilTerminal(
    (id) => app.request(`/api/v1/verification/jobs/${id}`),
    jobId,
    15_000,
  );

  const row = await prisma.verificationJob.findUnique({ where: { id: jobId } });
  if (!row?.proofHash) {
    console.error("job not persisted", row);
    process.exit(1);
  }

  console.log("DB integration OK", {
    jobId,
    terminalOutcome: finished.terminalOutcome,
    proofHash: row.proofHash?.slice(0, 16),
    status: row.status,
  });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
