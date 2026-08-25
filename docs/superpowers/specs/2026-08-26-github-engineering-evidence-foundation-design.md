# GitHub Engineering Evidence Foundation Design

**Date:** 2026-08-26
**Status:** Approved for implementation
**Repositories:** `Tokenta/tokenta-cleanverse`, `Tokenta/api-inspector`, `ToniAdreal/ToniAdreal`

## Purpose

Create a truthful, reviewable public engineering baseline for backend, infrastructure, full-stack, product engineering, and technical product roles. The work must improve evidence rather than simulate activity: every profile statement should link to code, tests, documentation, or a visible GitHub result.

## Current Evidence Gaps

The public repositories contain meaningful verification, settlement, queueing, database, and observability work, but the presentation layer obscures it:

- `tokenta-cleanverse` cannot install its frontend dependencies because `@privy-io/wagmi@1` requires Privy React Auth v2 while the application uses Privy React Auth v3.
- GitHub Actions rejects `verification-ci.yml` before creating jobs because a job-level `if` references the unavailable `secrets` context.
- `api-inspector` builds but has no automated tests or CI, and its README advertises an npm package that is not published.
- The personal profile contains too many visual badges and several claims that are inconsistent, difficult to verify, or not represented in the public repositories.
- Repository metadata and community files do not yet make the projects easy to discover, evaluate, or contribute to.

## Design Principles

1. Evidence before claims. Public copy describes only behavior that can be inspected in the linked repositories.
2. Quality before volume. Tests, CI, architecture notes, and issue/PR discussion are stronger signals than manufactured contribution streaks.
3. Optional integrations must not break required checks. Secret-dependent smoke tests remain visible but skip safely when credentials are unavailable.
4. Reproducibility is part of the product. A reviewer should be able to clone, install, build, and test with documented commands.
5. Separate role narratives share one technical foundation. Backend and infrastructure evidence leads; product judgment appears through architecture decisions, risk controls, and clear documentation.

## Phase 1 Scope

### Tokenta Cleanverse

- Align Privy packages so a clean frontend install succeeds.
- Correct the invalid GitHub Actions condition while preserving the optional live OpenAI smoke test.
- Add a frontend build job so the repaired dependency graph remains enforced.
- Add concise contribution, security, and architecture documentation grounded in the existing codebase.
- Add a repository license only if ownership and intended licensing are unambiguous; otherwise record it as an owner decision rather than guessing.

### API Inspector

- Add deterministic tests for scoring and argument parsing with no live provider credentials.
- Add GitHub Actions for clean install, build, and tests.
- Replace unpublished npm installation commands with source-based commands that work today.
- Add concise contributing and security guidance.

### Personal Profile

- Replace the current long-form resume page with a compact engineering portfolio.
- Lead with backend, infrastructure, and product engineering.
- Link directly to Tokenta Cleanverse and API Inspector.
- Describe tested behaviors and system components without unsupported scale, latency, uptime, certification, or location claims.
- Use the current contact email and remove decorative badge density that competes with technical evidence.

## Verification Strategy

### Local verification

- `tokenta-cleanverse`: clean frontend install and production build; server install, Prisma generation, unit/integration tests, and relevant smoke tests.
- GitHub Actions: static workflow validation plus a real pull-request run after publication.
- `api-inspector`: clean install, TypeScript build, deterministic Node tests, and package dry run.
- Profile: link and claim audit, Markdown structure review, and repository diff review.

### Public verification

Each repository is published as a reviewable branch and pull request. Required CI checks must complete before any merge recommendation. Repository metadata changes are made only after the code and documentation are verifiable.

## Non-Goals

- Artificial commits, backdated activity, automated low-value pull requests, or achievement farming.
- Claiming AWS, Kubernetes, Terraform, Kafka, gRPC, multi-region production scale, uptime, or latency without public implementation and measurement evidence.
- Publishing an npm release, merging pull requests, changing branch protection, or deploying production systems in this phase.
- Editing the user's existing dirty checkouts; all implementation occurs in isolated worktrees.

## Success Criteria

- A fresh reviewer can install and build both public engineering repositories.
- Required CI creates jobs and reports meaningful results instead of failing workflow validation.
- API Inspector has deterministic automated tests and no longer advertises an unavailable package.
- The profile provides a short, coherent role narrative with direct evidence links and no identified contradictions.
- All changes are available as focused GitHub pull requests for review, with the original local work preserved.
