# Contributing to Tokenta Cleanverse

Contributions that improve verification correctness, security boundaries, operational clarity, tests, or documentation are welcome.

## Prerequisites

- Node.js 22
- npm 10 or newer
- Docker with Compose for optional PostgreSQL and Redis checks

## Local Setup

Install and build the terminal:

```bash
npm ci
npm run build
```

Install the server, generate Prisma Client, and run the credential-free suite:

```bash
npm ci --prefix server
npm run db:generate --prefix server
npm test --prefix server
npm run test:e2e --prefix server
```

For interactive development, copy the example environment files and keep `VERIFICATION_MOCK=true`. Never commit `.env` files or live provider keys.

## Optional Infrastructure Checks

Start PostgreSQL and Redis from the repository root:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Then run the persistence path from `server/` with `USE_DB_PERSISTENCE=true` and the `DATABASE_URL` documented in `server/prisma/MIGRATE.md`.

For the BullMQ smoke test, configure `REDIS_URL`, `USE_BULLMQ=true`, and `RUN_REDIS_BULLMQ_SMOKE=true`, then run:

```bash
npm run test:redis-bullmq --prefix server
```

## Change Expectations

- Add a focused test before changing verification, security, queue, persistence, or settlement behavior.
- Keep required tests deterministic and independent of paid APIs or repository secrets.
- Put live-provider tests in an explicitly gated smoke path.
- Update OpenAPI output when a public route or response contract changes.
- Update `ARCHITECTURE.md` when a runtime boundary or degraded mode changes.
- Do not add production-scale, performance, uptime, or compliance claims without reproducible public evidence.

## Pull Requests

Keep each pull request focused. Include:

- the problem and root cause;
- the behavioral or documentation change;
- commands run and their results;
- security, migration, or rollback considerations;
- screenshots only when the user interface materially changed.

Before requesting review, run:

```bash
npm run build
npm test --prefix server
npm run test:e2e --prefix server
git diff --check
```

## Security Issues

Do not open a public issue for a suspected vulnerability or exposed credential. Follow [SECURITY.md](./SECURITY.md).
