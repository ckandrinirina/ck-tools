---
name: dependency-upgrade
description: >
  Use when planning or executing a dependency upgrade in a repo using npm,
  yarn, or pnpm, or when resuming an upgrade cycle already in progress.
  Triggers on "upgrade dependencies", "fix vulnerabilities", "npm audit fix",
  CVE alerts, outdated majors, framework migration prep, and quarterly or
  yearly security sweeps.
argument-hint: "[repo-path] [--new]"
disable-model-invocation: true
---

# Dependency Upgrade — Phased, Snapshot-Tracked, Resumable

Drive a safe, staged dependency upgrade for a JavaScript/TypeScript repo. Each
upgrade cycle is a self-contained dated folder, so the same repo can run an
upgrade in 2026-04, another in 2026-12, and a third in 2027-06 with no
collision and a permanent audit trail.

For all doc templates (README, phase files, verification, risks, critical-files),
see [references/templates.md](references/templates.md).
For phase mechanics (snapshot capture, CVE classification, validation gates,
resume detection algorithm), see [references/workflow.md](references/workflow.md).

---

## EFFORT SCALING

Adapt thoroughness to the current effort level (**${CLAUDE_EFFORT}**):

- **low** — Safe bumps only: patch + minor updates and direct `npm audit fix`; defer all framework majors to the deferred-majors phase.
- **medium** (default) — Full phased plan as documented (foundation → CVEs → minors → framework majors → deferred), standard verification per phase.
- **high / xhigh / max** — Add a complete risk matrix with blast-radius analysis, research each major's migration guide via context7, expand per-phase verification checklists, and capture before/after snapshots for every phase.

---

## INPUT

`$ARGUMENTS` may contain:

- An optional path to the repo root (default: current working directory).
- An optional `--new` flag to force-start a fresh cycle even when an active
  one exists (e.g. the previous cycle is abandoned).

Resolve the repo path to absolute. If it has no `package.json`, stop and ask
the user for the correct path. Do not proceed.

---

## DIRECTORY LAYOUT

```
<repo>/docs/dependency-upgrade/
  2026-04-22/                  # First cycle (e.g. spring security sweep)
    README.md
    00-foundation.md
    01-phase-security.md
    02-phase-minors.md
    03-phase-<framework>.md
    04-phase-deferred.md
    verification.md
    risks.md
    critical-files.md
    baseline/                  # tree.txt, audit.json, outdated.json (cycle start)
    snapshots/                 # phase-N-before / phase-N-after pairs
  2026-12-15/                  # Second cycle (e.g. year-end upgrade)
    ...
  2027-06-03/                  # Third cycle, etc.
    ...
```

**One cycle = one dated folder.** Never edit a closed cycle to fold in new
work — start a new dated folder instead. The audit trail is append-only.

---

## PHASE 0: DETECT REPO + CYCLE

### 0.1 Identify the repo

1. Resolve the repo path to absolute. Confirm `package.json` exists.
2. Identify the package manager from the lockfile:
   - `package-lock.json` -> `npm`
   - `yarn.lock` -> `yarn`
   - `pnpm-lock.yaml` -> `pnpm`
3. Read `package.json` `name` and any project `CLAUDE.md` to capture project
   conventions (test commands, lint, build, repo-specific rules).
4. **If the repo is part of the SOKA monorepo, delegate file edits to the
   matching subagent** (per project CLAUDE.md):
   - `SOKA-API/*` -> `@agent-soka-api-modifier`
   - `SokaLive-WebApp/*` -> `@agent-sokalive-webapp-modifier`
   - `SOKA-Web/*` -> `@agent-soka-web-editor`
     For other repos, edit directly.

### 0.2 Detect the active cycle (or start a new one)

```
List <repo>/docs/dependency-upgrade/<YYYY-MM-DD>/ directories (sorted desc).

IF directory does not exist OR no dated cycles found:
    -> NEW MODE, cycle dir = docs/dependency-upgrade/$(date +%Y-%m-%d)/

ELSE IF most recent cycle has any phase with no `-after` snapshot:
    -> RESUME MODE, cycle dir = that most recent cycle

ELSE IF most recent cycle is complete (all phases have `-after` snapshots):
    IF user passed --new OR explicitly asked to start a new cycle:
        -> NEW MODE, cycle dir = docs/dependency-upgrade/$(date +%Y-%m-%d)/
    ELSE:
        -> Show the user the previous cycle's outcome and ASK whether to start
           a new cycle today. Do not assume.

ELSE:
    -> Ambiguous; show all cycles and ask user which to resume.
```

Always announce the chosen mode and cycle directory to the user, e.g.:

- "NEW MODE — creating cycle `docs/dependency-upgrade/2026-04-29/`."
- "RESUME MODE — cycle `2026-04-22/`, last snapshot `phase-3-after`, next is Phase 4."

### 0.3 Today's date as folder name

Use the runtime date (`date +%Y-%m-%d`). The user has stated today's date is
already injected into the conversation context — read it from there if the
shell command is unavailable. Never hardcode a date.

---

## PHASE 1 (NEW MODE ONLY): GENERATE THE CYCLE

Skip this phase entirely in RESUME MODE.

### 1.1 Create the cycle folder + capture baseline

```bash
cd <repo>
CYCLE=docs/dependency-upgrade/$(date +%Y-%m-%d)
mkdir -p $CYCLE/baseline $CYCLE/snapshots
<pm> ls --depth=0     > $CYCLE/baseline/tree.txt 2>&1
<pm> audit --json     > $CYCLE/baseline/audit.json 2>&1 || true
<pm> audit            > $CYCLE/baseline/audit.txt 2>&1 || true
<pm> outdated --json  > $CYCLE/baseline/outdated.json 2>&1 || true
<pm> outdated         > $CYCLE/baseline/outdated.txt 2>&1 || true
```

Substitute `<pm>` with the detected manager. `outdated`/`audit` exit non-zero
when findings exist — that's expected, hence `|| true`.

### 1.2 Classify findings

Parse `audit.json` and `outdated.json`. Bucket each package into one of:

| Bucket                             | Criteria                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Phase 1 — Security**             | Has CRITICAL or HIGH CVE; or transitively pulls one in.                                                   |
| **Phase 2 — Minors / safe majors** | No CVE, current is one major behind, low integration surface (tooling, types, formatters).                |
| **Phase 3 — Framework majors**     | Core framework jump (NestJS, Next.js, Vite, React, Angular) — coordinated multi-package release.          |
| **Phase 4 — Deferred majors**      | High-risk majors (ORM, web3, test runner with config breaking changes) or schema-shared with other repos. |

Cross-reference each finding with where it is used in source (`grep -rn "<pkg>"`).
Capture critical integration points in `critical-files.md`.

**Fan-out (≥8 outdated/audit findings):** the per-package cross-reference above is independent
per package, so dispatch one **read-only** `general-purpose` investigator per package following the
investigation variant in [../../references/subagent-fanout.md](../../references/subagent-fanout.md).
Each greps `<pkg>` usage and fetches its migration/changelog notes (context7 for majors), returning
a structured `{bucket recommendation, integration points, breaking-change notes}` — no writes. The
orchestrator merges the reports, assigns final buckets, and authors `critical-files.md`. Below ~8
findings, classify inline. This is investigation only: all of Phase 2 (install, lockfile writes,
shared audit/build/test, the fail-fast gate) and SOKA subagent routing stay strictly sequential.

See `references/workflow.md` § 2 for tie-breaker rules.

### 1.3 Generate the doc set

Inside the cycle folder (`$CYCLE/`), create the following files using the
templates from [references/templates.md](references/templates.md):

```
$CYCLE/
  README.md             # Context, scope, plan structure, sequence, decisions
  00-foundation.md      # engines pin, extraneous packages, pin relax, CI baseline
  01-phase-security.md  # critical + high CVE fixes
  02-phase-minors.md    # minors + safe majors
  03-phase-<fw>.md      # framework major (filename reflects target)
  04-phase-deferred.md  # high-risk majors + schema-shared upgrades
  verification.md       # shared per-phase checklist (build, test, audit, smoke)
  risks.md              # risk matrix + approved decisions + go/no-go signals
  critical-files.md     # integration-point map by phase
```

After writing, summarise the plan back to the user (file list + recommended
sequence) and **stop**. Wait for them to approve before executing any phase.
Manual commits only — never auto-commit (per project CLAUDE.md).

---

## PHASE 2 (BOTH MODES): EXECUTE A PHASE

### 2.1 Determine the next actionable phase within the cycle

In RESUME MODE: scan `$CYCLE/snapshots/` for entries named
`YYYY-MM-DD-phase-<N>-after`. The highest `<N>` with an `after` snapshot is the
last completed phase; `<N>+1` is next. If a phase has a `-before` but no
matching `-after`, that phase is mid-flight — resume there.

In NEW MODE (after the user approves the plan): the next phase is `Foundation`
(the file `00-foundation.md`).

Show the user the cycle's current state and the proposed next phase. Ask them
to confirm before continuing.

### 2.2 Snapshot before

```bash
cd <repo>
DATE=$(date +%Y-%m-%d)
SNAP=$CYCLE/snapshots/${DATE}-phase-<N>-before
mkdir -p $SNAP
<pm> audit --json    > $SNAP/audit.json 2>&1 || true
<pm> outdated --json > $SNAP/outdated.json 2>&1 || true
```

Note: the snapshot's date is the day the phase **starts**, which can differ
from the cycle's start date. Both are useful — the cycle date anchors the
overall plan; the snapshot date marks when the work actually happened.

### 2.3 Execute the phase

Open the relevant phase file (`$CYCLE/0X-phase-*.md`), apply each numbered
action in order. For each upgrade:

1. Run the install command exactly as written.
2. Run the affected verification commands from `verification.md` immediately,
   not at the end. Failing fast is cheaper than batching.
3. If tests fail, **stop and diagnose** — do not chain more upgrades on top of
   a broken build. Update the phase file with what broke and how it was fixed.

For SOKA repos, route file edits through the matching subagent (see 0.1).

### 2.4 Snapshot after + record results

```bash
SNAP=$CYCLE/snapshots/${DATE}-phase-<N>-after
mkdir -p $SNAP
<pm> audit --json    > $SNAP/audit.json 2>&1 || true
<pm> outdated --json > $SNAP/outdated.json 2>&1 || true
<pm> run build       > $SNAP/build.log 2>&1 || true   # optional, useful for tsc errors
```

Update the phase file's checklist (mark items done) and append a short
**Outcome** section: vuln counts before/after (from the two snapshots), any
deviations from plan, and a link to the PR (left blank if not yet open).

### 2.5 Hand back to the user

Print a concise summary:

- Cycle directory + phase that just completed.
- Vulnerability count delta (from snapshot diff).
- Files changed.
- Verification status (which checklist items passed/failed).
- The reminder: **commit manually** — this skill never commits or pushes.

Then stop. The user re-invokes the skill when ready for the next phase.

---

## CYCLE COMPLETION

A cycle is complete when every phase file has a matching `phase-N-after`
snapshot **and** the user has merged the corresponding PRs. To close it:

1. Append a **Cycle Outcome** section to `$CYCLE/README.md` summarising:
   - Total vulns closed (baseline → final snapshot).
   - Packages bumped (current → target for each).
   - Phases skipped or deferred to a future cycle, with rationale.
2. Do **not** delete or rename the cycle folder. It stands as the audit record.
3. The next time the skill is invoked, NEW MODE will create a new dated cycle.

---

## RULES (NON-NEGOTIABLE)

- **Never auto-commit, never auto-push.** Per project CLAUDE.md, all commits
  are manual. The skill stages no git operations beyond reading status.
- **Never add "Generated with Claude Code" or any co-author trailer** to
  commits or PRs (per global CLAUDE.md).
- **Never bump majors out-of-phase.** A package belongs to exactly one bucket;
  do not opportunistically bump something in `04-deferred` while running
  `01-security`.
- **Never modify a closed cycle.** New work goes in a new dated cycle folder.
- **Never skip the snapshot step.** The before/after pair is the audit trail.
- **Never skip verification.** Each phase has a checklist in `verification.md`;
  every box must be addressed before declaring the phase complete.
- **Never modify shared schemas without coordination notes.** If
  `prisma/schema.prisma`, OpenAPI spec, or any shared type declaration changes,
  flag it in `risks.md` and stop until the user confirms downstream consumers
  are aligned.

---

## QUICK REFERENCE

| Situation                                      | Action                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| First run on a repo                            | NEW MODE -> create cycle dir for today -> baseline -> generate plan -> stop |
| One cycle exists, mid-flight                   | RESUME MODE -> continue same cycle                                          |
| Cycle exists and is complete                   | Ask user; with `--new` create today's cycle                                 |
| Multiple incomplete cycles                     | Ambiguous -> ask user which to resume                                       |
| Last snapshot in cycle is `phase-N-after`      | Next phase is `N+1` within same cycle                                       |
| Last snapshot in cycle is `phase-N-before`     | Phase N is mid-flight, resume it                                            |
| Schema-shared package (Prisma, OpenAPI client) | Force-defer to Phase 4, add coordination note                               |
| User pauses mid-phase                          | Leave snapshot dirs as-is, exit cleanly                                     |

---

## RED FLAGS — STOP IMMEDIATELY

- Tests pass before bump but fail after, AND the failure mode is unclear ->
  rollback the install, do not chain more upgrades.
- `<pm> audit` count **increased** after a phase -> investigate before
  committing.
- Lockfile churn outside the targeted packages -> re-run `<pm> install`
  cleanly, inspect the diff, do not commit transitive bumps you did not intend.
- A major framework upgrade (Phase 3) has no preview/staging deploy plan ->
  pause and require one before merging.
- About to write into a cycle folder dated **earlier than today** while the
  cycle is already complete -> stop, the new work belongs in today's folder.
