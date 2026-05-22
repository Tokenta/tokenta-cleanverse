# Tokenta Terminal — Timezone System Plan

## Goal

Every operator sees **local terminal time** aligned with settlement UTC on the backend. Users in different regions see different clock labels (e.g. `14:32:08 JST` vs `01:32:08 EDT`) while audit logs and chain events remain UTC-normalized server-side.

## Principles

1. **Browser timezone first** — `Intl.DateTimeFormat().resolvedOptions().timeZone` is the default (accurate, no IP database required).
2. **IP hint optional** — When `TERMINAL_TIMEZONE_IP_LOOKUP=true`, the server may suggest a zone from the client IP (via ip-api.com) for sessions without an explicit client zone.
3. **Session binding** — `POST /terminal/session` stores `timezone` on the terminal session; all UI polls use the same effective zone.
4. **Single formatter** — Shared `formatTerminalClock` / `formatTerminalTimestamp` on the client; server exposes `GET /terminal/timezone` for sync and debugging.
5. **UTC preserved** — API payloads keep ISO-8601 UTC; only display layer converts.

## API

| Route | Purpose |
|-------|---------|
| `POST /terminal/session` | Accept `{ timezone, timezoneSource }` |
| `GET /terminal/timezone` | Return effective zone, offset, local + UTC now |
| Headers | `X-Timezone` (IANA id), optional `X-Timezone-Source: browser` |

## UI surfaces

- TopBar clock (replaces hardcoded UTC)
- Reputation ledger `TIME` column
- Future: order room, verify feed (same formatter)

## Out of scope (Phase 2)

- Per-user timezone override UI in settings
- DST policy beyond IANA database
- Forcing IP zone over explicit browser choice
