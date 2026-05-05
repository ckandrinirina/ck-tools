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
**QA verdict:** <PASS | PARTIAL | FAIL after 3 iterations>
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
