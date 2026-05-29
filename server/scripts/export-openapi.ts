/**
 * Export OpenAPI specs to swagger/public/openapi/ for Vercel static docs.
 * Run: npm run swagger:export (from repo root) or tsx scripts/export-openapi.ts (from server/)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { terminalOpenApi } from "../src/api/openapi-terminal.js";
import { verificationOpenApi } from "../src/api/openapi-verification.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../../swagger/public/openapi");

const apiBase = (process.env.TOKENTA_API_BASE ?? "").replace(/\/$/, "");

function withServers<T extends { servers?: { url: string; description?: string }[] }>(
  spec: T,
  pathPrefix: string,
): T {
  const servers = apiBase
    ? [
        { url: `${apiBase}${pathPrefix}`, description: "Configured API base" },
        { url: pathPrefix, description: "Same-origin (relative)" },
      ]
    : [{ url: pathPrefix, description: "Relative to API host (e.g. localhost:8787)" }];

  return { ...spec, servers };
}

mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(outDir, "terminal.json"),
  `${JSON.stringify(withServers(terminalOpenApi, "/api/v1/terminal"), null, 2)}\n`,
  "utf8",
);

writeFileSync(
  join(outDir, "verification.json"),
  `${JSON.stringify(withServers(verificationOpenApi, "/api/v1"), null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${outDir}/terminal.json and verification.json`);
