# Story Templates

Templates written to `tasks/<YYYY-MM-DD>_<slug>/STORY.md` by the `implement` skill at specific phases. Each block is appended (or its target line edited) using `Edit` against the existing file.

---

## Phase 2 — Initial Story File (write at start)

Created via `Write`. This is the entire file content at Phase 2:

```markdown
# Story: <Title>

> **Mode:** <FEATURE | FIX | REFACTOR>
> **Status:** TODO
> **Created:** <YYYY-MM-DD>
> **Reference story:** <path-to-old-story.md or "none">

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Context
- Project type: <go | node | python | rust | java | php | unknown>
- Skills loaded: <comma-separated list, or "none">
- Libraries researched (context7): <comma-separated list, or "none">
- Existing helpers to reuse: <paths or "none identified yet">
- Notes: <≤2 short bullets capturing user clarifications>

## Implementation Plan
<For simple tasks: one bullet describing the change.>
<For complex tasks (≥4 distinct steps): a numbered checkbox list.>

1. [ ] <step 1>
2. [ ] <step 2>

## Files to Touch
- <best-guess path 1>
- <best-guess path 2>
```

---

## Phase 1.4 / 7 — Status Transitions

Edit the existing `> **Status:**` line in place.

| From | To | Triggered in |
|---|---|---|
| `TODO` | `IN PROGRESS` | Phase 3 start |
| `IN PROGRESS` | `DONE` | Phase 7, only after manual review approves |

Edit:
```
> **Status:** TODO
```
→
```
> **Status:** IN PROGRESS
```

---

## Phase 3 — SOLID Design (append at start of Phase 3, skip for trivial changes)

Full template + skip rules: [solid-review.md §1](solid-review.md). Appended once
at the start of Phase 3, before any code is written. Skip only for typos,
single-line renames, comment edits, or single-line value tweaks (see
[solid-review.md §3](solid-review.md) for the full skip table).

```markdown

## SOLID Design

**S — Single Responsibility:** <one line, or "N/A — <reason>">
**O — Open/Closed:** <one line, or "N/A — <reason>">
**L — Liskov Substitution:** <one line, or "N/A — <reason>">
**I — Interface Segregation:** <one line, or "N/A — <reason>">
**D — Dependency Inversion:** <one line, or "N/A — <reason>">
```

Re-edit lines in place if the design changes during Phase 3; never append a
second SOLID Design block.

---

## Phase 3 — Files Touched (append; update incrementally)

Append once when entering Phase 3 (empty list); add one line per file as it is touched.

```markdown

## Files Touched
- <path/to/file.ext> — <one-line summary of what changed>
```

**Format rules:**
- One bullet per file. The dash–space–em-dash–space pattern is mandatory: `- <path> — <summary>`.
- Summary is concise (≤ 80 chars): verb + noun. Examples:
  - `- src/utils/string.go — added Reverse(s string) string helper`
  - `- src/api/user.ts — fixed null-return regression in getUser()`
  - `- internal/queue/worker.rs — extracted retry logic into shared helper`
- No diff dumps, no rationale paragraphs, no line numbers.
- If the same file is touched again later (e.g. during refactor), update its existing line in place rather than adding a duplicate.

---

## Phase 3 — Unplanned Changes (append on first deviation, then per-change)

Append once on the first unplanned change; add one line per subsequent
unplanned change. Skip entirely on a clean run (no heading written when
empty).

```markdown

## Unplanned Changes
- <path> — <one-line what> — <why it was needed during the planned work>
```

**Format rules:**
- One bullet per change. Three slash-separated fields: path, what, why.
- "Why" must explain what triggered the change during the planned work
  (e.g., "broke test for AC-2 without it", "needed twice by planned helper",
  "REFACTOR mode — adjacent code").
- If the same file is touched again later, update its existing line in place
  rather than adding a duplicate.
- This section coexists with `Files Touched` — `Files Touched` records every
  modified file with a one-line summary; `Unplanned Changes` records only
  those outside the Phase 2 `## Files to Touch` plan, and explains why.
- Distinct from `## Deferred Follow-ups`: that section records work NOT done
  (left for later); `Unplanned Changes` records work that WAS done outside
  the original plan.

Examples:
- `- src/api/user.ts — added null check in getUser() — broke test for AC-2 without it`
- `- src/queue/retry.go — extracted retryWithBackoff() — needed twice by planned helper, would have duplicated`
- `- tests/helpers/mock_clock.ts — new file — planned tests required time-mocking, not anticipated in Files to Touch`

---

## Phase 5 — Deferred Follow-ups (append only if QA returns PARTIAL or cap hit)

```markdown

## Deferred Follow-ups
- <issue 1 — short description>
- <issue 2 — short description>
```

Skip this section entirely on clean PASS.

---

## Phase 7 — Implementation Summary (append on user approval)

```markdown

---

## Implementation Summary

**Completed:** <YYYY-MM-DD>
**Total files touched:** <count>
**Test command:** <command run, or "none — no test infra detected">
**Test result:** <PASS | FAIL | NOT_RUN>
**Lint/typecheck:** <command + result, or "none detected">
**SOLID:** <PASS | issues fixed in refactor | skipped — trivial change>
**QA verdict:** <PASS | PARTIAL | FAIL after 3 iterations>
**Unplanned changes:** <count, or "none">
**Deferred follow-ups:** <count, or "none">

### Suggested commit
```
<conventional-commits message, e.g.:>
feat(string): add Reverse helper

Adds Reverse(s string) string in src/utils/string.go.
```
```

The detailed per-file change log lives in `## Files Touched` above — never duplicate it inside the summary.

---

## Acceptance Criteria + Subtasks Final State

On completion, every `- [ ]` becomes `- [x]` in both Acceptance Criteria and Implementation Plan sections. Edit each line in place; do not rewrite the section.
