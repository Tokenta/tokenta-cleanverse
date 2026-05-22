# Tokenta Verification Server

Mechanism v0.4 + engine architecture v0.1 — async verification API for Tokenta Terminal.

## Quick start

```bash
cp .env.example .env
# VERIFICATION_MOCK=true for sk-mock-* keys

npm install
npm run db:generate
npm run dev
```

Terminal (repo root): `npm run dev` — Vite proxies `/api/v1` to port 8787.

## Tests

```bash
npm test
npm run test:e2e
```

## Optional infrastructure

```bash
# From repo root
docker compose -f docker-compose.dev.yml up -d

# Postgres persistence
USE_DB_PERSISTENCE=true
DATABASE_URL=postgresql://tokenta:tokenta@localhost:5432/tokenta_terminal
npm run db:migrate:deploy
npm run db:integration
```

## Metrics

- JSON health: `GET /api/v1/metrics/health`
- Prometheus: `GET /metrics/prometheus` (Grafana scrape target)

## Security flags (dev)

| Variable | Purpose |
|----------|---------|
| `DEV_CREDENTIAL_VAULT` | Store listing API keys for LIVE monitor |
| `DEV_CREDENTIAL_VAULT_ENCRYPTED` | AES-256-GCM at rest in dev vault |
| `REQUIRE_API_AUTH` + `API_DEV_TOKEN` | Bearer gate on `/api/v1/*` |
| `WALLET_AUTH` | `X-Wallet-Address` on mutating routes |
| `REQUIRE_BIND_SIGNATURE` | HMAC on bind-verification |
| `PRIVY_JWT_MODE` + `PRIVY_JWT_VERIFY` | Bearer JWT wallet extraction (dev HS256 via `PRIVY_JWT_DEV_SECRET`) |
| `PROOF_ANCHOR_AUTO_MOCK` | Auto-register mock on-chain anchor after job PASS |

Proof anchor: `GET/POST /api/v1/verification/proofs/{proofHash}/anchor` (dev registry; not production L2).

F2.2 composition: `GET /api/v1/verification/metrics/composition` (included in `/metrics/health`).

Escrow (dev): `POST /api/v1/orders/:orderId/escrow/fund|release` with optional `REQUIRE_ESCROW_SIGNATURE`.

Privy JWKS: `PRIVY_JWT_VERIFY=jwks` + `PRIVY_JWKS_URL` (RS256). LIVE monitor: `LIVE_MONITOR_DIRECT_INTERVAL_MS` (5m), `LIVE_MONITOR_P2P_INTERVAL_MS` (30m).

Worker topology: `GET /api/v1/admin/worker-topology` (`USE_REGIONAL_QUEUES`, `WORKER_REGIONS`).

KMS envelope: `KMS_VAULT_ENABLED=true` + `KMS_MASTER_KEY`. ZK/TEE mock probes: `ZK_TEE_ATTEST_MOCK=true`.

Live OpenAI CI: set repo secret `OPENAI_API_KEY`; runs `npm run test:live-openai`.

OpenAPI: `GET /api/v1/openapi.json`. Regional worker: `npm run worker:region` with `WORKER_REGION` + `USE_BULLMQ`.

PDF regen: `docs/scripts/regenerate-spec-pdfs.ps1` (requires Pandoc).

Dev runbook: `docs/VERIFICATION-DEV-RUNBOOK.md`. Worker heartbeats: `GET /api/v1/admin/worker-heartbeats`.

Settlement: `server/data/tokenta-settlement-anchor.abi.json` + `settlement-contract.ts` (viem `encodeFunctionData` for `anchorProofHash(bytes32)`).
LIVE leader lock: `LIVE_MONITOR_DISTRIBUTED_LOCK` + `REDIS_URL`.

**Terminal API (Phase 5A):** `GET /api/v1/terminal/docs` (Swagger UI), `POST /api/v1/terminal/session`, `POST /api/v1/terminal/listings/run`, `POST /api/v1/terminal/run`. Spec: `docs/tokenta-terminal-api-layer-plan.txt`.

See `docs/tokenta-verification-implementation-plan.txt` for full checklist.
