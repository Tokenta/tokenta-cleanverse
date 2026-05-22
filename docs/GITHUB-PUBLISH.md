# Publishing Tokenta Terminal to GitHub

Target organization: [https://github.com/Tokenta](https://github.com/Tokenta)

## Prerequisites

1. Create an empty repository under the Tokenta org (e.g. `tokenta-terminal`).
2. Install [GitHub CLI](https://cli.github.com/) and authenticate:

```powershell
gh auth login
gh auth status
```

The agent cannot log into your GitHub account; you must complete `gh auth login` locally.

## One-time git setup (this workspace)

```powershell
cd "e:\Web3\Tokenta\Tokenta Terminal\Tokenta Terminal Design Proposal"
git init
git add .
git commit -m "Initial commit: Tokenta Terminal design proposal and verification stack"
git branch -M main
git remote add origin https://github.com/Tokenta/tokenta-terminal.git
git push -u origin main
```

## Pull request workflow

```powershell
git checkout -b feature/timezone-reputation-api
git add .
git commit -m "Add terminal timezone system and unify TopBar reputation with API"
git push -u origin feature/timezone-reputation-api
gh pr create --repo Tokenta/tokenta-terminal --title "Terminal timezone + reputation nav sync" --body "## Summary
- Local terminal clock per IANA timezone (browser-first, optional IP hint)
- TopBar reputation matches GET /api/v1/terminal/reputation

## Test plan
- [ ] npm run dev (frontend) + server npm run dev
- [ ] TopBar clock shows local zone label
- [ ] TopBar reputation matches Reputation panel composite
- [ ] server npm test"
```

## Secrets

Never commit `.env`, `server/.env`, or private keys. Use GitHub Actions secrets for CI tokens.
