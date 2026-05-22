# Tokenta Verification — Dev Runbook

Terminal API layer (design): `docs/tokenta-terminal-api-layer-plan.txt` — approve before Phase 5A implementation.

## Quick start

```powershell
# Terminal 1 — API + in-process worker
cd server
cp .env.example .env
# VERIFICATION_MOCK=true for sk-mock-* keys
npm install
npm run dev

# Terminal 2 — Vite UI
cd ..
cp .env.example .env
# VITE_VERIFICATION_API=  (empty uses Vite proxy to :8787)
npm run dev
```

## Docker (Postgres + Redis)

```powershell
docker compose -f docker-compose.dev.yml up -d

Optional regional BullMQ worker (requires Redis profile):

```bash
docker compose -f docker-compose.dev.yml --profile workers up -d verification-worker
```
cd server
$env:USE_DB_PERSISTENCE="true"
$env:DATABASE_URL="postgresql://tokenta:tokenta@localhost:5432/tokenta_terminal"
npm run db:migrate:deploy
$env:USE_BULLMQ="true"
$env:REDIS_URL="redis://localhost:6379"
```

## Admin audit log

`GET /api/v1/admin/audit-log` — optional `?type=BIND_VERIFICATION` or `?type=ESCROW_FUND` and `?limit=50`.

## Regional worker process

```powershell
$env:WORKER_REGION="us-east-1"
$env:USE_REGIONAL_QUEUES="true"
$env:USE_BULLMQ="true"
$env:REDIS_URL="redis://localhost:6379"
npm run worker:region
```

Heartbeat: `POST /api/v1/admin/worker-heartbeat` or automatic from `worker:region` script.

## Auth (local)

Server `.env`:

- `REQUIRE_API_AUTH=true` + `API_DEV_TOKEN=...`
- `WALLET_AUTH=true` + send `X-Wallet-Address` from Terminal

Terminal `.env`:

- `VITE_VERIFICATION_API=` (proxy) or `http://127.0.0.1:8787`
- `VITE_API_DEV_TOKEN=` (matches server)
- `VITE_WALLET_ADDRESS=0x...`

## Vault modes

| Mode | Env |
|------|-----|
| Dev in-memory | `DEV_CREDENTIAL_VAULT=true` |
| Encrypted dev | `DEV_CREDENTIAL_VAULT_ENCRYPTED=true` + `CREDENTIAL_VAULT_KEY` |
| KMS envelope stub | `KMS_VAULT_ENABLED=true` |
| HashiCorp KV | `HASHICORP_VAULT_ENABLED=true` + `VAULT_ADDR` + `VAULT_TOKEN` |

## Base Sepolia testnet

Server `server/.env`:

```env
SETTLEMENT_NETWORK=base-sepolia
SETTLEMENT_CHAIN_ID=84532
SETTLEMENT_RPC_URL=https://sepolia.base.org
PROOF_ANCHOR_RPC_URL=https://sepolia.base.org
PROOF_ANCHOR_CHAIN_ID=84532
SETTLEMENT_DRY_RUN=true
```

Terminal root `.env` (Privy wallet on chain 84532):

```env
VITE_SETTLEMENT_CHAIN_ID=84532
VITE_BLOCK_EXPLORER=https://sepolia.basescan.org
```

- Network telemetry: `GET /api/v1/terminal/network` (block, gas, dry-run, treasury signer status)
- Top bar shows live Base Sepolia block/gas when RPC is reachable
- Real anchor broadcast: set `SETTLEMENT_DRY_RUN=false`, `SETTLEMENT_CONTRACT_ADDRESS`, `TREASURY_PRIVATE_KEY` (testnet only)

## CI parity (local)

```powershell
# BullMQ + Redis (matches GitHub redis-bullmq-smoke job)
$env:REDIS_URL="redis://localhost:6379"
$env:USE_BULLMQ="true"
$env:RUN_REDIS_BULLMQ_SMOKE="true"
npm run test:redis-bullmq
```

## Tests

```powershell
cd server
npm test
npm run test:e2e
# Optional live OpenAI (secret required):
$env:OPENAI_API_KEY="sk-..."
$env:RUN_LIVE_OPENAI_SMOKE="true"
npm run test:live-openai
```

## Spec PDF export

See `docs/scripts/regenerate-spec-pdfs.md` or run `docs/scripts/regenerate-spec-pdfs.ps1` (Pandoc required).
