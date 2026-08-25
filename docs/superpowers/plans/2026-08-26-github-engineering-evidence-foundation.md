# GitHub Engineering Evidence Foundation Implementation Plan

> **For Toni:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish a truthful, testable public GitHub foundation that demonstrates backend, infrastructure, full-stack, and technical product engineering ability.

**Architecture:** Work in three isolated git worktrees and publish one focused branch per repository. Repair existing build and workflow defects first, then add deterministic API Inspector tests and CI, then make documentation and profile claims reflect only the resulting public evidence.

**Tech Stack:** TypeScript, Node.js 22+, React/Vite, Prisma, PostgreSQL, Redis/BullMQ, GitHub Actions, Markdown, GitHub CLI

---

### Task 1: Record the approved design and baselines

**Files:**
- Create: `docs/superpowers/specs/2026-08-26-github-engineering-evidence-foundation-design.md`
- Create: `docs/superpowers/plans/2026-08-26-github-engineering-evidence-foundation.md`

**Step 1: Verify the planning documents contain no placeholders**

Run: `rg -n "T[O]DO|T[B]D|PLACE[H]OLDER" docs/superpowers`
Expected: no matches.

**Step 2: Review the documents and repository scope**

Run: `git diff --check && git diff -- docs/superpowers`
Expected: no whitespace errors; design and plan cover the three repositories without unsupported claims.

**Step 3: Commit the planning documents**

Run: `git add docs/superpowers && git commit -m "docs: plan GitHub engineering evidence upgrade"`

### Task 2: Repair the Tokenta frontend dependency contract

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Preserve the reproduced failing baseline**

Run: `npm ci`
Expected before the fix: `ERESOLVE` showing `@privy-io/wagmi@1.0.6` requires `@privy-io/react-auth@^2.0.0` while the project uses v3.

**Step 2: Align the Privy integration packages**

Update `@privy-io/wagmi` to a v4 release compatible with `@privy-io/react-auth` v3, regenerate the lockfile, and inspect the resolved peer dependency graph.

Run: `npm install --package-lock-only`
Expected: lockfile resolves without peer dependency errors.

**Step 3: Verify clean install and application compatibility**

Run: `npm ci`
Expected: exit 0.

Run: `npm run build`
Expected: Vite production build exits 0 with no TypeScript or package API errors.

**Step 4: Commit the dependency repair**

Run: `git add package.json package-lock.json && git commit -m "fix: align Privy authentication packages"`

### Task 3: Repair and extend Tokenta verification CI

**Files:**
- Modify: `.github/workflows/verification-ci.yml`

**Step 1: Validate the known workflow failure**

Confirm from GitHub Actions that the current run creates zero jobs, and confirm against GitHub's contexts reference that `jobs.<job_id>.if` does not support the `secrets` context.

**Step 2: Remove the invalid job-level secret condition**

Map `OPENAI_API_KEY` into the live smoke job environment. Put the secret-dependent condition on the live test step using `env.OPENAI_API_KEY`, and add a complementary explanatory skip step when the secret is absent.

**Step 3: Add a frontend build job**

Add a required job that uses Node 22, restores the root npm cache, runs `npm ci`, and runs `npm run build`.

**Step 4: Validate workflow structure locally**

Run a GitHub Actions-aware workflow validator against `.github/workflows/verification-ci.yml`.
Expected: exit 0 and no invalid-context errors.

**Step 5: Re-run repository test contracts**

Run: `npm run build`
Expected: exit 0.

Run: `npm ci --prefix server && npm run db:generate --prefix server && npm test --prefix server`
Expected: exit 0 with the existing passing test suite.

**Step 6: Commit the CI repair**

Run: `git add .github/workflows/verification-ci.yml && git commit -m "ci: restore verification workflow execution"`

### Task 4: Add grounded Tokenta project documentation

**Files:**
- Create: `ARCHITECTURE.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Modify: `README.md`

**Step 1: Inventory implemented components**

Use source paths, npm scripts, Compose services, Prisma schema, metrics code, and existing tests to map the verification request flow. Do not include infrastructure or scale claims that are absent from the repository.

**Step 2: Write an architecture evidence map**

Document request handling, verification orchestration, persistence, queue execution, settlement controls, observability, degraded modes, and the tests that cover each boundary.

**Step 3: Write contribution and security guidance**

Document reproducible setup and verification commands. In `SECURITY.md`, provide private reporting guidance without inventing an unsupported response-time SLA.

**Step 4: Add evidence links to the README**

Link the architecture, API contract, runbook, CI workflow, tests, contribution guide, and security policy from a concise engineering-evidence section.

**Step 5: Verify documentation accuracy**

Run: `rg -n "AWS|Terraform|Kubernetes|Kafka|gRPC|99\.99|0\.8ms|12.region" README.md ARCHITECTURE.md CONTRIBUTING.md SECURITY.md`
Expected: no unsupported infrastructure, scale, uptime, or latency claims.

Run: `git diff --check`
Expected: exit 0.

**Step 6: Commit the documentation**

Run: `git add README.md ARCHITECTURE.md CONTRIBUTING.md SECURITY.md && git commit -m "docs: expose Tokenta engineering evidence"`

### Task 5: Add API Inspector deterministic tests

**Repository:** `Tokenta/api-inspector`

**Files:**
- Create: `test/scoring.test.mjs`
- Create: `test/args.test.mjs`
- Modify: `package.json`

**Step 1: Write failing scoring tests**

Test representative verified, mismatch, and unavailable-check inputs against the public scoring contract. Import the compiled module from `dist`; run the tests before adding a test script and confirm the intended assertions expose any behavior mismatch.

**Step 2: Write failing argument-parser tests**

Test provider selection, custom base URL, numeric flags, JSON output, and invalid input behavior using deterministic argument arrays.

**Step 3: Add the zero-dependency test command**

Add `test` as `npm run build && node --test test/*.test.mjs`, using Node's built-in test runner rather than adding a runtime dependency.

**Step 4: Make the smallest production changes required by the tests**

If a tested public helper is not exported or invalid input is silently accepted, change only the relevant source module and keep behavior documented.

**Step 5: Verify the test suite and package**

Run: `npm ci && npm test && npm pack --dry-run`
Expected: clean install, build, all deterministic tests passing, and only intended package files included.

**Step 6: Commit the test contract**

Run: `git add package.json src test && git commit -m "test: cover API Inspector core contracts"`

### Task 6: Add API Inspector CI and truthful project guidance

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Modify: `README.md`

**Step 1: Add CI for the verified local contract**

Create a Node 20 and 22 matrix that runs `npm ci`, `npm test`, and `npm pack --dry-run` on pushes and pull requests.

**Step 2: Correct installation documentation**

Remove the unavailable npm registry and global-install commands. Document clone-and-build usage as the supported installation method until a release is published.

**Step 3: Add contribution and security guidance**

Document local verification, provider-adapter boundaries, credential-safe test expectations, and private vulnerability reporting.

**Step 4: Verify documentation and workflow**

Run: `rg -n "npx @tokenta/api-inspector|npm install -g @tokenta/api-inspector" README.md`
Expected: no matches.

Run the workflow validator against `.github/workflows/ci.yml`.
Expected: exit 0.

Run: `git diff --check && npm test`
Expected: exit 0.

**Step 5: Commit the CI and documentation**

Run: `git add .github README.md CONTRIBUTING.md SECURITY.md && git commit -m "ci: verify API Inspector on supported Node versions"`

### Task 7: Replace the personal profile with an evidence-first README

**Repository:** `ToniAdreal/ToniAdreal`

**Files:**
- Modify: `README.md`

**Step 1: Write the compact profile narrative**

Lead with `Backend, Infrastructure, and Product Engineer`. Describe Tokenta's implemented verification, persistence, queueing, settlement, and observability work, and API Inspector's deterministic provider-audit tooling.

**Step 2: Link claims to public evidence**

Use direct repository and documentation links. Retain contact and portfolio links, but use `toniadreal11@gmail.com` and Ningbo, China.

**Step 3: Remove unsupported and conflicting content**

Remove unverifiable scale and performance metrics, empty patent links, the MIT OpenCourseWare certification badge, New York location, the old email address, and decorative technology badges not backed by pinned public work.

**Step 4: Verify copy and links**

Run: `rg -n "jiaxi0899|New York|99\.99|0\.8ms|12.region|MIT 15\.S12|Patents-2" README.md`
Expected: no matches.

Run: `git diff --check && git diff -- README.md`
Expected: no whitespace errors and a concise evidence-first profile.

**Step 5: Commit the profile rewrite**

Run: `git add README.md && git commit -m "docs: focus profile on engineering evidence"`

### Task 8: Publish reviewable branches and verify GitHub results

**Files:**
- No additional source files expected.

**Step 1: Run final verification in each worktree**

Tokenta Cleanverse: `npm ci && npm run build && npm ci --prefix server && npm run db:generate --prefix server && npm test --prefix server`

API Inspector: `npm ci && npm test && npm pack --dry-run`

All repositories: `git diff --check && git status --short && git log --oneline --decorate -5`

**Step 2: Review every branch diff**

Run `git diff origin/main...HEAD` in each worktree. Confirm no secrets, generated credentials, unrelated user files, or unsupported claims are present.

**Step 3: Push the three branches**

Push `codex/github-profile-upgrade`, `codex/api-inspector-upgrade`, and `codex/profile-evidence-upgrade` to their corresponding origins.

**Step 4: Open focused pull requests**

Create one pull request per repository with verification commands and results. Do not merge the pull requests in this phase.

**Step 5: Observe public CI**

Wait for all required jobs. If a job fails, read the logs, reproduce the root cause locally where possible, fix it test-first, and update the corresponding branch.

**Step 6: Apply truthful repository metadata**

After the pull-request checks are green, set concise descriptions and relevant topics for `Tokenta/tokenta-cleanverse`, `Tokenta/api-inspector`, and `ToniAdreal/ToniAdreal`. Do not add a license label unless a license file is present.
