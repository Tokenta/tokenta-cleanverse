/**
 * Load server/.env before any module reads process.env (orchestrator MOCK_MODE, etc.).
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

for (const name of [".env", ".env.local"]) {
  const path = resolve(serverRoot, name);
  if (existsSync(path)) {
    config({ path, override: false });
  }
}
