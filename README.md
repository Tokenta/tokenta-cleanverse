# Tokenta Cleanverse Terminal

Tokenta Cleanverse is a full-stack engineering prototype for verifying AI API assets and enforcing counterparty policy before testnet settlement. It combines a React terminal with a TypeScript verification service, configurable queue and persistence adapters, security controls, observability, and Cleanverse policy integration.

The repository demonstrates implemented and tested system boundaries. It does not claim a production cloud deployment or audited financial infrastructure.

## What This Repository Demonstrates

- An asynchronous verification pipeline with provider routing, budgets, abuse controls, lock-state transitions, evidence records, and terminal scoring.
- Queue abstraction with an in-process default plus opt-in Redis and BullMQ execution.
- In-memory development state plus opt-in PostgreSQL persistence through Prisma migrations.
- Server-side credential handling, encrypted vault adapters, worker key zeroization, JWT/JWKS validation, signatures, and audit events.
- Escrow receipt checks, proof anchoring, and settlement adapters with explicit testnet and dry-run modes.
- JSON health, Prometheus metrics, worker heartbeats, queue telemetry, and an importable Grafana dashboard definition.
- Credential-free unit, integration, end-to-end, migration, persistence, and queue smoke tests in GitHub Actions.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the request flow, runtime modes, failure boundaries, and source-level evidence map.

## Runtime Shape

| Layer | Technology | Default local mode | Optional mode |
| --- | --- | --- | --- |
| Terminal | React, TypeScript, Vite, Privy, Wagmi | Vite development server | Vercel build |
| API | Node.js, Hono, TypeScript | In-process HTTP service | Container deployment |
| Jobs | Queue interface and worker | In-process queue | Redis list or BullMQ |
| Data | Repository interfaces | In-memory stores | PostgreSQL and Prisma |
| Settlement | Viem adapters | Mock or dry-run | Configured testnet RPC and signer |
| Telemetry | Health and Prometheus endpoints | Process metrics | Grafana dashboard import |

## Cleanverse Policy Path

Before the settlement path proceeds, the backend orchestrator can resolve buyer and seller identity, evaluate the configured RuleV2 policy, and validate settlement eligibility through the Cleanverse adapters. A denied or unavailable policy result fails closed before broadcast.

Relevant implementation paths:

- `server/src/services/ComplianceOrchestrator.ts`
- `server/src/integrations/cleanverse/`
- `server/src/integrations/cleanverse/CVASettlementAdapter.ts`
- `server/src/api/verification-e2e.test.ts`

## Run Locally

Prerequisites: Node.js 22 and npm 10 or newer.

Install and build the terminal:

```bash
npm ci
npm run build
```

Install and verify the server:

```bash
npm ci --prefix server
npm run db:generate --prefix server
npm test --prefix server
npm run test:e2e --prefix server
```

Start both processes during development:

```bash
npm run dev:server
npm run dev
```

Copy `.env.example` and `server/.env.example` before configuring integrations. Keep `VERIFICATION_MOCK=true` for credential-free development. Never commit live API keys or settlement private keys.

## Optional PostgreSQL and Redis

The default path does not require external services. To exercise the persistence and queue adapters:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Configuration and parity commands are documented in the [development runbook](./docs/VERIFICATION-DEV-RUNBOOK.md) and [migration guide](./server/prisma/MIGRATE.md).

## API and Operations Evidence

- [Architecture and failure modes](./ARCHITECTURE.md)
- [Verification development runbook](./docs/VERIFICATION-DEV-RUNBOOK.md)
- [Settlement flow](./docs/SETTLEMENT-FLOW.md)
- [Verification OpenAPI](./swagger/public/openapi/verification.json)
- [Terminal OpenAPI](./swagger/public/openapi/terminal.json)
- [Grafana verification dashboard](./docs/monitoring/grafana-verification-slo.json)
- [GitHub Actions verification workflow](./.github/workflows/verification-ci.yml)
- [Contribution guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)

## Public Testnet Evidence

- Terminal demo: [tokenta-terminal.vercel.app](https://tokenta-terminal.vercel.app)
- Backend API: [tokenta-terminal-api.onrender.com](https://tokenta-terminal-api.onrender.com)
- Monad testnet transaction: [0xc633aa34ee5ab19c77b7de07ce8712e46f0dfba8b67d2c025a521d96f8eb39ca](https://testnet.monadexplorer.com/tx/0xc633aa34ee5ab19c77b7de07ce8712e46f0dfba8b67d2c025a521d96f8eb39ca)

The committed Cleanverse demo configuration references Monad testnet chain ID `10143`. Separate terminal settlement modules also support Base Sepolia through environment configuration. These links and modules are testnet evidence only.

## Project Status

This codebase is under active development. The local Compose topology and regional worker configuration are reproducible development scaffolding, not evidence of a deployed multi-region service. Review [SECURITY.md](./SECURITY.md) before using any part of the system outside an isolated test environment.
