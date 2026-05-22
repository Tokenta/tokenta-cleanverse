# Database migrations

## First-time setup

Start Postgres (optional Docker):

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

```bash
cd server
cp .env.example .env
# DATABASE_URL=postgresql://tokenta:tokenta@localhost:5432/tokenta_terminal
# USE_DB_PERSISTENCE=true

npm run db:migrate:deploy   # applies prisma/migrations/*
npm run db:smoke            # SELECT 1 + verification_jobs count
npm run db:integration      # listing + job persist round-trip (USE_DB_PERSISTENCE=true)
```

CI runs the same path in `.github/workflows/verification-ci.yml` job `db-migrate-smoke`.

## Development (schema drift)

```bash
npm run db:migrate            # prisma migrate dev (interactive)
# or
npm run db:push               # push schema without migration history
```

Initial migration: `prisma/migrations/20260519120000_init/migration.sql` (generated from schema via `prisma migrate diff`).
