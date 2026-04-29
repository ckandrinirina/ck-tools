# Workflow Mechanics

This is the operational reference for the `dependency-upgrade` skill. It covers
the parts of the workflow that are too detailed for `SKILL.md` itself: snapshot
capture, classification rules, validation gates, and resume-detection.

---

## 1. Snapshot capture

Snapshots are the **audit trail** of the plan. Every phase has two: one before
the install commands and one after. The diff between them is what you cite in
the PR description.

### Directory naming

Snapshots live **inside the cycle folder**, one level under it:

```
docs/dependency-upgrade/
  2026-04-22/                       # cycle folder (date the cycle opened)
    snapshots/
      2026-04-22-phase-1-before/    # snapshot date may equal cycle date...
      2026-04-23-phase-1-after/     # ...or be later if phase took >1 day
      2026-04-24-phase-2-before/
      2026-04-24-phase-2-after/
      ...
```

The cycle date (top-level folder) is fixed once the cycle is opened — it is the
audit-trail anchor. The snapshot date (per-snapshot folder) reflects when each
phase actually ran, which may be days or weeks after the cycle opened.

If a phase straddles multiple days, the matching `before` and `after`
snapshots can use the same date if they are in the same calendar day, or
different dates otherwise — the pairing is by `phase-<N>` suffix, not by date.

### What goes in a snapshot

Minimum:

| File | Source command |
|---|---|
| `audit.json` | `<pm> audit --json` |
| `outdated.json` | `<pm> outdated --json` |

Recommended additions:

| File | Source command | When |
|---|---|---|
| `tsc.log` | `npx tsc --noEmit 2>&1` | Any phase that touches TypeScript types |
| `build.log` | `<pm> run build 2>&1` | Any phase that risks build breakage |
| `tree.txt` | `<pm> ls --depth=0 2>&1` | Foundation baseline only |

### Why both `before` and `after`

`before` proves the starting state of the phase. `after` proves the change. If
only `after` exists, the diff is meaningless because you cannot tell what the
phase actually fixed versus what was already fixed.

If a phase ends up doing nothing (e.g. all targeted CVEs were patched
transitively before you got there), still write the `after` snapshot. An empty
diff is itself useful evidence.

---

## 2. CVE classification

Use this decision table to bucket each `audit.json` finding into a phase:

```
Severity = CRITICAL or HIGH?
├── YES → does fix require a major bump on a framework or ORM?
│         ├── YES (framework) → Phase 3
│         ├── YES (ORM)       → Phase 4.1
│         └── NO              → Phase 1
└── NO (MODERATE / LOW) → does the package have a major upgrade available?
            ├── YES, low integration surface (tooling, types) → Phase 2
            ├── YES, framework peer-locked                    → Phase 3
            ├── YES, schema-shared / cross-repo               → Phase 4
            └── NO  → Phase 2 (minor / patch only)
```

**Tie-breaker rules:**

- A package with **both** a CRITICAL CVE and a framework-peer lock goes to
  **Phase 3** (do not split a coordinated framework set).
- A package whose fix is a major bump **on the same release line** as a Phase 1
  package (e.g. fixing two CVEs in `@nestjs/*` at once) goes to Phase 1 if and
  only if every co-bumped package can survive the same bump in isolation.
  Otherwise it is Phase 3.
- Schema-shared packages (Prisma, generated clients) **always** go to Phase 4
  regardless of severity — coordination outweighs urgency.

---

## 3. Cycle + resume detection (algorithm)

Resume detection is two-layer: first pick the right **cycle**, then pick the
right **phase within that cycle**.

### Layer 1 — pick the cycle

```
cycles = list_dirs("docs/dependency-upgrade/")
        |> filter(matches /^\d{4}-\d{2}-\d{2}$/)
        |> sort(desc)              # most recent first

if cycles is empty:
    -> NEW MODE; cycle = today
    return

# Is the most recent cycle still open?
top = cycles[0]
phase_files = glob(f"docs/dependency-upgrade/{top}/0*-phase-*.md")
all_phases_have_after = every phase_file has a matching `phase-N-after`
                        snapshot under f"{top}/snapshots/"

if not all_phases_have_after:
    -> RESUME MODE; cycle = top

else:
    # Most recent cycle is complete
    if user passed --new OR explicitly asked to start a new cycle:
        -> NEW MODE; cycle = today
    else:
        -> ASK user. Show them: "{top} is complete. Start a new cycle today?"
```

### Layer 2 — pick the phase within the cycle (RESUME only)

```
snapshots = list_dirs(f"docs/dependency-upgrade/{cycle}/snapshots/")
if snapshots is empty:
    next_phase = "Foundation"   # plan exists, no execution yet
    return

# Sort by phase number, then by suffix (before < after)
parsed = [(phase_n, suffix, dir) for dir in snapshots]
parsed.sort(key=lambda r: (r.phase_n, r.suffix == "after"))

last = parsed[-1]
if last.suffix == "before":
    next_phase = f"Phase {last.phase_n} (mid-flight, resume)"
elif last.suffix == "after":
    next_phase = f"Phase {last.phase_n + 1}"

# Cross-check: does the phase file for next_phase exist?
if not exists(f"docs/dependency-upgrade/{cycle}/0{N}-phase-*.md"):
    # Either the cycle is complete or the phase is named differently
    confirm with user before proceeding
```

### Edge cases

- **`baseline/` exists, no `snapshots/`** — the cycle was opened but no phase
  has run yet. Resume by starting at `00-foundation.md`.
- **Multiple `before` snapshots in a row, no matching `after`** — someone aborted
  a phase. Check if the install was reverted; if not, finish the phase first.
  Never overwrite an existing `before` snapshot.
- **Phase-file framework mismatch** — if `03-phase-nestjs.md` exists in a cycle
  but the latest snapshot is `phase-3-after` and the user is on a Next.js
  project, the plan was generated for the wrong framework. Confirm with the
  user before doing anything else.
- **Multiple incomplete cycles** — should not happen (only the most recent
  cycle should be open), but if it does, list all open cycles and ask the user
  which to resume. Do not pick automatically.
- **Cycle dated in the future** — almost always wrong. Stop and confirm.

---

## 4. Validation gates

Each phase has automated and manual checks. The skill enforces a **fail-fast**
policy: if a check fails, stop and report; do not continue with later checks.

Order of execution (cheapest → most expensive):

1. `<pm> install` — must complete cleanly.
2. `<pm> run lint` — fast feedback on syntax/style regressions.
3. `npx tsc --noEmit` — type errors catch most API breakage.
4. `<pm> run build` — full compile.
5. Unit tests (`<pm> run test`).
6. Integration / use-case tests (e.g. vitest).
7. e2e tests requiring services (`<pm> run test:e2e`).
8. e2e database tests (Testcontainers, Docker required).
9. Manual smoke test against `<pm> run start:dev`.
10. Preview / staging deploy verification.

Steps 1–4 are non-negotiable for every phase. Steps 5–10 are documented in
`verification.md` and ticked per phase.

If a step fails:
- Capture the failing output into the current phase's snapshot directory
  (`-after/<step>.log`).
- Stop. Do not run later steps.
- Document the failure inline in the phase markdown under an **Issues** heading.
- Hand back to the user.

---

## 5. Cross-repo coordination

When the target repo shares contracts with another (e.g. SOKA-API and SOKA-Web
sharing a Prisma schema or an OpenAPI client), Phase 4 cannot start
unilaterally.

Before opening a Phase 4 PR, run the shared-contract check:

```bash
# Prisma schema
grep -rn "generator client" {{repo-path}}/prisma/ 2>/dev/null
grep -rn "generator client" <other-repo>/prisma/ 2>/dev/null

# OpenAPI / generated SDKs
grep -rn "generated/api" <other-repo>/ 2>/dev/null
```

If any other repo references the same source-of-truth, document the consumer in
`risks.md`, then **stop**. Phase 4 resumes only after the user confirms the
consumers are aligned (either upgraded in lock-step or pinned to a compatible
older version).

---

## 6. Repo-specific subagent routing (SOKA monorepo only)

Per the SOKA project CLAUDE.md, file edits in each repo go through a dedicated
subagent for context isolation:

| Repo | Subagent |
|---|---|
| `SOKA-API/*` | `@agent-soka-api-modifier` |
| `SokaLive-WebApp/*` | `@agent-sokalive-webapp-modifier` |
| `SOKA-Web/*` | `@agent-soka-web-editor` |

When this skill runs against one of these repos:
- **Read** operations (audit, outdated, snapshot capture) are run directly.
- **Edit** operations (changes to `package.json`, source code, config files)
  are delegated to the matching subagent with a precise instruction.

For non-SOKA repos, edit directly.

---

## 7. Commit policy

The skill **never** commits or pushes. Per global CLAUDE.md:

- No `git commit` invocations.
- No `git push` invocations.
- No co-author trailers on suggested commit messages.
- No "Generated with Claude Code" lines in PR descriptions.

When the user is ready to commit, suggest a one-line conventional-commit message
based on the phase (e.g. `chore(deps): phase 1 security patches`). Leave the
commit itself to them.

---

## 8. Failure recovery

If the user reports that production broke after a phase merged:

1. Identify the phase from `snapshots/`.
2. Roll back the merge commit (or the specific package via lockfile surgery).
3. Capture a new snapshot named `YYYY-MM-DD-phase-N-rollback`.
4. Update the phase markdown with a **Rollback** section: cause, fix, what to
   change next time.
5. Do **not** delete the original `-after` snapshot — the audit trail must
   include the broken state.

The next attempt at the same phase reuses the same phase number with a fresh
date in the snapshot directory name (`YYYY-MM-DD-phase-N-before` / `-after`).

---

## 9. Cheat sheet — common commands

```bash
# Detect package manager (run from repo root)
test -f pnpm-lock.yaml && echo pnpm || \
test -f yarn.lock && echo yarn || \
test -f package-lock.json && echo npm

# Snapshot helper (substitute values inline)
CYCLE=2026-04-22  # the cycle folder you opened earlier
DATE=$(date +%Y-%m-%d); N=1; SUFFIX=before; PM=npm
SNAP=docs/dependency-upgrade/$CYCLE/snapshots/${DATE}-phase-${N}-${SUFFIX}
mkdir -p $SNAP
$PM audit --json    > $SNAP/audit.json 2>&1 || true
$PM outdated --json > $SNAP/outdated.json 2>&1 || true

# Diff vulnerability counts between two snapshots
jq '.metadata.vulnerabilities' \
  docs/dependency-upgrade/snapshots/<earlier>/audit.json
jq '.metadata.vulnerabilities' \
  docs/dependency-upgrade/snapshots/<later>/audit.json

# Check peer dependencies of a target version
npm view <pkg>@<target> peerDependencies
```
