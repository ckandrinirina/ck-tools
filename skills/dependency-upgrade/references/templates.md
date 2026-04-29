# Templates

Each section below is a stand-alone template. Fill the `{{slot}}` placeholders
from the data captured in `Phase 1.1` and `Phase 1.2` of `SKILL.md`.

Slot reference:
- `{{repo}}` — repo folder name (e.g. `SOKA-API`).
- `{{repo-path}}` — absolute path to repo root.
- `{{cycle}}` — cycle folder name, ISO date (e.g. `2026-04-22`).
- `{{cycle-path}}` — `docs/dependency-upgrade/{{cycle}}/`.
- `{{pm}}` — package manager (`npm` / `yarn` / `pnpm`).
- `{{date}}` — same as `{{cycle}}` for the README; for snapshot commands the
  current date when the snapshot is taken.
- `{{framework}}` — primary framework (e.g. `NestJS`, `Next.js`, `Vite`).
- `{{audit-summary}}` — one line: counts of critical/high/moderate/low.
- `{{majors-behind}}` — count of packages 1+ majors behind.
- `{{phase-1-pkgs}}`, `{{phase-2-pkgs}}`, `{{phase-3-pkgs}}`, `{{phase-4-pkgs}}` —
  bucketed package lists with current → target versions.
- `{{decisions}}` — bullet list of approved scope/strategy choices.

Tables marked **populate from data** must be expanded with one row per package.
Do not leave the templated `{{slot}}` literals in the final document.

---

## README.md

```markdown
# {{repo}} Dependency Upgrade — Cycle {{cycle}}

> **Cycle folder:** `docs/dependency-upgrade/{{cycle}}/`
> Self-contained upgrade cycle. Past cycles live alongside this one and remain
> read-only for audit. New work goes in a new dated folder.

## Context

The {{repo}} project ({{framework}} backend/frontend) has accumulated dependency
debt. An audit run on **{{cycle}}** reveals:

- **{{audit-summary}}** reported by `{{pm}} audit`
- **{{majors-behind}} packages 1+ major versions behind**
- (Add other repo-specific findings here: hard-pinned versions, missing
  `engines` field, extraneous packages, dual test runners, etc.)

**Goal:** ship a staged upgrade that eliminates critical/high CVEs first, then
modernizes the framework, without breaking production APIs or shared contracts.

---

## Scope

This plan targets `{{repo-path}}` only. Note any cross-repo coordination
(shared schemas, API contracts, generated clients) here.

---

## Plan Structure

| File | Purpose |
|---|---|
| [`00-foundation.md`](./00-foundation.md) | Prerequisites (engines, cleanup, baseline, CI verification) |
| [`01-phase-security.md`](./01-phase-security.md) | Phase 1 — critical + high CVE fixes |
| [`02-phase-minors.md`](./02-phase-minors.md) | Phase 2 — minors + safe majors (tooling, types) |
| [`03-phase-{{framework-slug}}.md`](./03-phase-{{framework-slug}}.md) | Phase 3 — {{framework}} coordinated major upgrade |
| [`04-phase-deferred.md`](./04-phase-deferred.md) | Phase 4 — deferred majors (ORM, schema-shared, test runner) |
| [`verification.md`](./verification.md) | Shared validation checklist per phase |
| [`risks.md`](./risks.md) | Risk matrix + approved decisions |
| [`critical-files.md`](./critical-files.md) | File-by-file map of integration points |

---

## Recommended Sequence & Timeline

```
Week 1:    Foundation + Phase 1 (security)        → ship to prod
Week 2:    Phase 2 (minors / safe majors)         → ship to prod
Week 3-4:  Phase 3 ({{framework}} major)          → preview, soak, ship
Month 2+:  Phase 4 (deferred majors, coordinated) → feature branches
```

---

## Key Decisions (Approved)

{{decisions}}

---

## Snapshots

After each phase, snapshots are written to
`{{cycle-path}}snapshots/YYYY-MM-DD-phase-N-{before,after}/`.
The diff between a phase's `before` and `after` snapshots is the audit trail.

## Past cycles

| Cycle | Outcome |
|---|---|
| (Add a row per closed cycle in this repo, with a one-line outcome.) | |
```

---

## 00-foundation.md

```markdown
# Foundation — Pre-Upgrade Prerequisites

**Goal:** make every subsequent phase safer. Do these **before** touching any
version numbers.

**Estimated effort:** 0.5 day
**Breaking risk:** 🟢 None

---

## F1. Pin runtime version

### Problem

- No `engines` field in `package.json` (or out of sync with deployment).
- No `.nvmrc` / `.node-version`.

### Actions

1. Confirm intended Node version (match Dockerfile / CI).
2. Create `.nvmrc` with the major version.
3. Add `engines` to `package.json`:
   ```json
   "engines": {
     "node": ">={{node-major}}.0.0 <{{node-major+1}}",
     "npm": ">=10.0.0"
   }
   ```
4. Verify Docker, CI, and any PaaS use the same major.

---

## F2. Clean up extraneous packages

### Problem

`{{pm}} ls` reports packages installed but not declared in `package.json`.

### Actions

1. Verify nothing in source imports them: `grep -r "<pkg>" src/`.
2. If unused, run `{{pm}} prune`.
3. If actually needed, add them to `package.json` explicitly.

---

## F3. Relax hard-pinned versions

List exact-pinned packages here and the caret/tilde target. Do not bump versions
yet — that happens in Phase 1+. Only relax the pin style.

---

## F4. Baseline snapshot

The baseline lives inside the cycle folder, alongside the plan:

```bash
cd {{repo-path}}
CYCLE=docs/dependency-upgrade/{{cycle}}
mkdir -p $CYCLE/baseline
{{pm}} ls --depth=0    > $CYCLE/baseline/tree.txt 2>&1
{{pm}} audit --json    > $CYCLE/baseline/audit.json 2>&1 || true
{{pm}} outdated --json > $CYCLE/baseline/outdated.json 2>&1 || true
```

---

## F5. Verify CI runs tests

Confirm test, lint, and build jobs run on PRs and are green on the current main
branch before any version bump lands.

---

## Exit criteria

- [ ] `.nvmrc` + `engines` field present; deployment environments match.
- [ ] `{{pm}} ls` shows zero extraneous packages.
- [ ] Baseline snapshot committed.
- [ ] CI runs unit + integration + e2e on PRs, all green.

**Do not start Phase 1 until all four boxes are checked.**
```

---

## 01-phase-security.md

```markdown
# Phase 1 — Security Patches

**Goal:** eliminate all CRITICAL + most HIGH vulnerabilities with non-breaking
(or major-but-isolated) updates.

**Estimated effort:** 1–2 days
**Breaking risk:** 🟢 Low–🟡 Medium
**Prerequisite:** Foundation (F1–F5) complete

---

## 1.1 Critical CVE fixes

### Targets (direct dependencies)

| Package | Current → Target | CVE(s) Closed | Type |
|---|---|---|---|
{{phase-1-pkgs-table}}

### Actions

```bash
cd {{repo-path}}
{{pm}} install <pkg-1>@<target-1> <pkg-2>@<target-2> ...
```

For each package:
- List direct usage sites (one line each).
- Note any API differences between current and target.

---

## 1.2 Major bumps for security (isolated surface)

For each major bump motivated by a CVE, document:
- **Why** — the specific CVE / chain.
- **Breaking changes** — drop in supported runtime, native module rebuild,
  signature changes.
- **Action** — exact install command + post-install verification step.

Example block:

> ### `bcrypt` 5.1.1 → 6.0.0
>
> **Why:** `@mapbox/node-pre-gyp` → `tar` HIGH severity vuln in v5.
> **Breaking changes:** drops Node < 16; native module — rebuild Docker
> (`docker compose build --no-cache`).
> **Action:** `{{pm}} install bcrypt@^6.0.0`, then rebuild Docker image, then
> run a login e2e test.

---

## 1.3 Validation

Run the full checklist from [`verification.md`](./verification.md).

**Phase 1 specific must-pass:**

- [ ] `{{pm}} audit` — **0 critical**, **<10 high** remaining.
- [ ] Build succeeds.
- [ ] Unit + integration + e2e tests green.
- [ ] Smoke test: login, one transactional email, one authenticated API call.
- [ ] Docker image rebuilds (if any native modules touched).

---

## Exit criteria

- All validation boxes checked.
- PR merged, deployed, no regressions for 24h.

**Phase 1 is a standalone deployable release. Ship before starting Phase 2.**
```

---

## 02-phase-minors.md

```markdown
# Phase 2 — Minors & Safe Majors

**Goal:** modernize tooling and types with low-risk updates. Should be a single
PR with green tests.

**Estimated effort:** 1–2 days
**Breaking risk:** 🟡 Medium (tooling config drift)
**Prerequisite:** Phase 1 in production for 24h+

---

## 2.1 Minor bumps

| Package | Current → Target | Notes |
|---|---|---|
{{phase-2-minors-table}}

`{{pm}} update` covers most of these but verify the lockfile diff before
committing — sometimes a transitive dep silently goes major.

---

## 2.2 Safe majors

Tooling and type packages where the API is stable. List each with:
- Package + current → target.
- Config files that may need touching (`tsconfig.json`, `.eslintrc`, etc.).
- One-line migration note.

---

## 2.3 Validation

Same shared checklist (`verification.md`). No phase-specific must-passes beyond
"all green".

---

## Exit criteria

- All validation passes, PR merged, 24h soak.
```

---

## 03-phase-{{framework-slug}}.md

```markdown
# Phase 3 — {{framework}} {{from-major}} → {{to-major}}

**Goal:** coordinated framework major upgrade across all peer-locked packages.

**Estimated effort:** 2–4 days
**Breaking risk:** 🟠 High
**Prerequisite:** Phase 2 in production for 24h+

---

## 3.1 Coordinated package set

All packages with the framework in their peer dependencies must move together.

| Package | Current → Target |
|---|---|
{{phase-3-pkgs-table}}

Install in one shot:

```bash
{{pm}} install {{phase-3-install-line}}
```

---

## 3.2 Migration steps

1. Run the framework's official codemod if available.
2. Walk through the framework's migration guide and apply each breaking change.
3. Update peripheral configs (e.g. `nest-cli.json`, `next.config.js`).
4. Re-run typecheck — fix any new errors before running tests.

---

## 3.3 Validation

Shared checklist + framework-specific smoke test on a preview deploy:

- [ ] Health endpoint responds.
- [ ] All routes/controllers register.
- [ ] OpenAPI/Swagger (if present) loads.
- [ ] No deprecation warnings in startup logs.

---

## Exit criteria

- Preview deploy soaks 24–48h with no regressions.
- PR merged, prod deploy green for 48h before moving to Phase 4.
```

---

## 04-phase-deferred.md

```markdown
# Phase 4 — Deferred Majors

**Goal:** the high-risk, high-coordination upgrades. Each sub-phase ships on its
own feature branch with its own PR. Do not bundle them.

**Prerequisite:** Phase 3 in production for 48h+

---

## 4.1 ORM major (e.g. Prisma N → N+2)

**Breaking risk:** 🔴 Very High — schema-shared with other repos.

**Steps:**
1. Audit cross-repo schema sharing (run the shared-schema check in `risks.md`).
2. Coordinate the cut-over with the other consumers.
3. Branch off, run the official migration tool, regenerate the client.
4. Re-run all integration + e2e tests against a real database.
5. Soak 1 week on staging before prod.

---

## 4.2 Web3 / cryptography stack decision

If the project uses `web3.js` and `ethers.js`, evaluate consolidating to a single
library before bumping `web3` to v4. Document the decision in `risks.md`.

---

## 4.3 Test runner major (Vitest / Jest)

Config schema usually changes; allocate time to migrate `vitest.config.ts` /
`jest.config.ts` and any custom matchers/setup files.

---

## 4.4 Linter major (ESLint 8 → 9 flat config)

Migrate `.eslintrc` to `eslint.config.js`. Verify all plugins support flat config
before starting.

---

## 4.5+ Other deferred majors

List any package that did not fit Phases 1–3 and not yet covered above. Each
gets its own subsection with: rationale, blocking dependency, exit criteria.
```

---

## verification.md

```markdown
# Verification Checklist (Per Phase)

Every phase must pass this checklist before merging. Copy into the PR description.

---

## Automated

- [ ] `{{pm}} install` — clean, no new peer-dep warnings beyond baseline.
- [ ] `{{pm}} run lint` — passes.
- [ ] `{{pm}} run format` — no diff (or diff only from auto-format).
- [ ] `{{pm}} run build` — production build succeeds.
- [ ] `{{pm}} run test` — unit tests green.
- [ ] `{{pm}} run test:e2e` — end-to-end tests green (if applicable).
- [ ] `{{pm}} audit` — count strictly decreased vs. baseline. Record new counts.
- [ ] `npx tsc --noEmit` — zero TypeScript errors.

---

## Local manual smoke test

(Customise per repo. The list below is the SOKA-API default — adjust for the
target project.)

### Authentication
- [ ] Signup / login returns a JWT.
- [ ] Authenticated GET works with the token.
- [ ] Protected endpoints reject expired tokens.

### Core flows
- [ ] Each feature's main endpoint responds with a 2xx.
- [ ] Scheduled jobs log their runs (if any).

### Integrations
- [ ] OpenAPI / Swagger loads.
- [ ] Database reachable via ORM.
- [ ] External service clients (mailer, push, RPC) initialise without error.

### Docker
- [ ] `docker compose build` succeeds (important after native-module bumps).
- [ ] `docker compose up` — container starts, `/health` returns 200.

---

## Preview deploy

- [ ] Staging deploy green.
- [ ] Repeat manual smoke test against the preview URL.
- [ ] Logs free of unexpected errors / deprecation warnings.
- [ ] Frontend (if separate) pointed at the preview API works at smoke level.

---

## Post-merge

- [ ] Watch production for 24h (Phase 1, 2) or 48h (Phase 3) before next phase.
- [ ] Error tracking (Sentry / similar) — no spike.
- [ ] Response time metrics — no regression.
- [ ] Snapshot regenerated under `snapshots/YYYY-MM-DD-phase-N-after/`.

---

## Snapshot command

```bash
cd {{repo-path}}
CYCLE=docs/dependency-upgrade/{{cycle}}
DATE=$(date +%Y-%m-%d)
SNAP=$CYCLE/snapshots/${DATE}-phase-<N>-{{before|after}}
mkdir -p $SNAP
{{pm}} audit --json    > $SNAP/audit.json 2>&1 || true
{{pm}} outdated --json > $SNAP/outdated.json 2>&1 || true
```

Note: `{{cycle}}` is fixed for the lifetime of this plan (it dates the cycle).
`DATE` is the snapshot date and may differ if a phase happens days after the
cycle was opened.
```

---

## risks.md

```markdown
# Risk Summary

## Per-phase risk matrix

| Phase | Breaking risk | Rollback cost | Est. effort | Prereq |
|---|---|---|---|---|
| Foundation (F1–F5) | 🟢 None | Trivial | 0.5 day | — |
| Phase 1 (Security) | 🟡 Low–Medium | Revert commit | 1–2 days | Foundation |
| Phase 2 (Minors / safe majors) | 🟡 Medium | Revert commit | 1–2 days | Phase 1 in prod |
| Phase 3 ({{framework}} major) | 🟠 High | Revert merge commit | 2–4 days | Phase 2 in prod |
| Phase 4.1 (ORM major) | 🔴 Very High | Feature branch + coordination | 1–2 weeks | Phase 3 + cross-repo align |
| Phase 4.x (others) | varies | Revert | 0.5–2 days | Various |

---

## Cross-cutting risks

### 1. Shared schema / contracts

If the schema (Prisma, GraphQL, OpenAPI) is shared with another repo, that other
repo must upgrade in lock-step. Document the consumers here.

### 2. Native modules

Any native module (bcrypt, sharp, sqlite3) requires a clean Docker rebuild after
upgrade. Note the affected images and commands.

### 3. Auto-generated clients

If consumers generate clients from the OpenAPI spec, a framework upgrade may
change the spec shape. List the consumers and their regeneration command.

### 4. Peer-dependency timing

Some plugins (e.g. `@nestjs-modules/mailer@2.x` requiring NestJS 11) may force
the framework upgrade earlier than planned. Verify peers with:

```bash
{{pm}} view <pkg>@<target> peerDependencies
```

---

## Approved decisions

{{decisions-table}}

---

## Go / No-Go signals between phases

Before starting the next phase, confirm:

- Previous phase PR merged.
- Production deploy green, `/health` responding.
- Soak period elapsed (24h for P1–P2, 48h for P3, 1 week for P4.1+).
- No spike in error tracking.
- No spike in response times.
- `{{pm}} audit` count at or below post-phase baseline.

If any signal is red → diagnose and fix before proceeding.
```

---

## critical-files.md

```markdown
# Critical Files Reference

Map of files touched or carefully examined across upgrade phases. Paths relative
to `{{repo}}/`.

---

## Configuration

| File | Phases | Why |
|---|---|---|
| `package.json` | All | Dep declarations; add `engines`. |
| `package-lock.json` (or yarn.lock / pnpm-lock.yaml) | All | Regenerated each phase. |
| `.nvmrc` (new) | Foundation F1 | Runtime version pin. |
| `Dockerfile` | Foundation + Phase 1 native modules | Base image + rebuild trigger. |
| `tsconfig.json` | Phase 2, 4 | Decorator + strict-mode flags. |
| Test config (`jest.config.*` / `vitest.config.*`) | Phase 2, 4.3 | Test runner configs. |
| CI workflows (`.github/workflows/*.yml`) | Foundation F5 | Test jobs must run on PRs. |

---

## Framework integration (Phase 3)

| File | Why |
|---|---|
| Bootstrap entry (`src/main.ts` / `app.tsx`) | Framework init + middleware order. |
| Root module / app shell | DI registrations / provider tree. |
| Each feature module | Verify imports survive the major bump. |

---

## DTO / validator surface

List all files using class-validator / zod / similar — the validator API often
changes across majors.

---

## Data layer (Phase 4 — ORM)

| File / directory | Why |
|---|---|
| `prisma/schema.prisma` (or equivalent) | Schema source. |
| Repository / DAO implementations | Adapter changes when the ORM bumps. |
| Domain test repositories | In-memory adapters mirroring production. |
| All call sites | `grep -rn "prisma\." src/` to spot direct usage. |

---

## External integrations

| File | Why |
|---|---|
| Mailer module | Template engine swaps across mailer majors. |
| Push notification client | SDK init changes. |
| Auth (JWT, web3, OAuth) | Protocol-level differences across majors. |

---

## New files created by this plan

- `.nvmrc` — Foundation F1.
- `docs/dependency-upgrade/{{cycle}}/baseline/*` — Foundation F4.
- `docs/dependency-upgrade/{{cycle}}/snapshots/YYYY-MM-DD-phase-N-{before,after}/*` — each phase.
```
