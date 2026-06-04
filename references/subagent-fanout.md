# Subagent Fan-Out — shared dispatch contract

How a ck-tools skill dispatches a **team of parallel subagents**, each digging into one
independent unit, then converges the results. Skills reference this file instead of redefining
the pattern. Covers both the read-only **investigation** variant and the independent-artifact
**write** variant.

## When fan-out helps (and when it hurts)

Fan out only when **all** of these hold:

- **Independent** — units do not read each other's in-progress output; order doesn't matter.
- **Numerous** — enough units that parallel wall-clock beats dispatch overhead (each skill sets
  its own threshold; below it, stay sequential).
- **Non-interactive** — the unit's work needs no user prompt (subagents cannot ask the user).

Do **not** fan out sequential chains (TDD red→green→refactor), stateful/ordered writes (git
commits, PR creation, a shared lockfile, one shared test suite), cheap reads, or any step that
prompts the user.

## The two variants

| Variant                       | Subagent does                                              | `isolation`                                              | Writes?              |
| ----------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | -------------------- |
| **Investigation** (read-only) | Greps/reads/fetches one slice, returns a structured report | `none`                                                   | Never — reports only |
| **Artifact** (write)          | Produces ONE file in its own dedicated path                | `none` (or `worktree` only if units touch shared source) | Its own path only    |

## The orchestrator-owns-shared-writes rule (non-negotiable)

The orchestrator (the skill thread) — never a subagent — does all of:

- **User interaction** — every prompt, confirmation, and refinement runs to completion _before_
  dispatch and _after_ collection. Subagents get already-resolved context.
- **Shared writes** — index/summary singletons (`critical-files.md`, `CHANGELOG.md`, version
  files, lockfiles) are authored/merged by the orchestrator. A subagent writes only files unique
  to its own unit.
- **Convergence** — merging reports, de-duplicating overlaps, resolving contradictions to a single
  decision (e.g. one semver bump, one bucket assignment), and the final summary stay with the
  orchestrator.

So before dispatch: finish all prompts, author every shared file, then pass each subagent its
slice as **read-only** context.

## Dispatch shape

1. **Gate** — check the skill's threshold (unit count, repo shape). Below it → inline, no fan-out.
2. **Freeze shared state** — finish user prompts; capture the baseline the subagents read from.
3. **Dispatch** — one `Agent` call per unit, in a single message so they run concurrently.
   Use `subagent_type: general-purpose` unless a registered ck-tools agent fits the unit. Give
   each: its unit id, its slice of frozen context, and an explicit "report only / write only
   `<your path>`; do not prompt; do not touch shared files" constraint.
4. **Collect** — gather every result; a failed/empty agent is redone inline by the orchestrator,
   never left silently missing.
5. **Converge** — merge into shared files, de-dup, resolve conflicts, summarize. If fan-out was
   skipped because the input was below threshold, say so — never imply the whole set was parallelized.
