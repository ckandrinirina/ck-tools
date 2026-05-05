---
name: implement
description: >
  Use when the user asks to implement a feature, fix a bug, or refactor code in
  any project on the go — without ck-code's full design+architecture workflow.
  Project-agnostic (Go, Node, Python, Rust, Java, etc.). Optionally accepts an
  existing story file as reference (from ck-code or a prior `implement` run).
  Triggers: "implement", "add a feature", "fix this bug", "refactor", "build
  this", "make this work".
argument-hint: "[task description] [--story <path>]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Skill, Agent, AskUserQuestion, WebSearch, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs, mcp__plugin_context7_context7__resolve-library-id, mcp__plugin_context7_context7__query-docs
---

# Implement — On-the-Go Story Implementation

Detection tables (project type → tooling, skill patterns, weak-code heuristics):
[references/detection.md](references/detection.md). Story file scaffold and
section formats: [references/story-template.md](references/story-template.md).

---

## INPUT

`$ARGUMENTS` is a free-form task description plus optional flags:

| Token | Meaning |
|---|---|
| Free text | The task to implement (feature, fix, or refactor) |
| `--story <path>` | Path to an existing story file (from ck-code or a prior `implement` run) used as authoritative reference |

If `$ARGUMENTS` is empty, ask the user once for the task. Resolve repo root via
`git rev-parse --show-toplevel`; if not a git work tree, ask before proceeding.

---

## PHASE 0: INTAKE

1. Capture the task description.
2. If `--story <path>` provided: `Read` the story file. Extract Title, Mode,
   Acceptance Criteria, Files Touched (if any). Use as authoritative context;
   do not re-derive from the user prompt.
3. Decide **Mode**:
   - Verbs `add`, `implement`, `create`, `support` → `FEATURE`
   - Verbs `fix`, `bug`, `regression`, `broken`, `wrong`, `null`, `crash` → `FIX`
   - Verbs `refactor`, `clean up`, `extract`, `rename` (no behavior change) → `REFACTOR`
   - Ambiguous → ask the user via `AskUserQuestion` (single question).

---

## PHASE 1: CONTEXT GATHERING + SKILL DETECTION

Token-bounded. **Stop at first useful hit** at every step.

1. **Project type:** check manifests in repo root per
   [references/detection.md §1](references/detection.md). Record the test
   command and lint commands for Phase 4.
2. **Targeted code scan:**
   - 1 `Glob` for likely-related files (use symbols from the prompt).
   - 1 `Grep` for existing helpers/utilities matching the task domain — this
     enforces the reuse-first rule in Phase 3.
3. **Skill detection:** run
   ```bash
   find .claude/skills -maxdepth 4 -type f -name "SKILL.md" 2>/dev/null
   ```
   If empty: proceed silently (most projects). If non-empty: match each
   candidate against the patterns in
   [references/detection.md §2](references/detection.md) and load matches via
   the `Skill` tool. Fall back to `Read` on Skill-tool error. Never load a
   skill not in the `find` output.
4. **Library research (context7):** trigger only if the prompt names an
   external library/framework or Phase 1.2 grep revealed an import. Procedure
   in [references/detection.md §3](references/detection.md). Cap: 2 lookups
   per invocation.
5. **Clarify (at most 2 questions):** use `AskUserQuestion` only if a critical
   ambiguity blocks implementation. Skip for trivial tasks.

---

## PHASE 2: STORY WRITE

1. Compute `slug` from the task title — kebab-case, ≤ 30 chars, ASCII.
2. Compute `date` as `YYYY-MM-DD` (UTC).
3. Create `tasks/<date>_<slug>/STORY.md` using the Phase 2 template in
   [references/story-template.md](references/story-template.md). Fill in
   Title, Mode, Status `TODO`, Acceptance Criteria, Context bullets (project
   type + skills loaded + libraries researched + helpers to reuse), and Files
   to Touch (best-guess paths from Phase 1.2).
4. Implementation Plan: **one bullet** if the task is simple; a numbered
   checkbox list **only** if the task has ≥ 4 distinct steps.

---

## PHASE 3: IMPLEMENT (reuse-first, minimal-diff)

1. Edit STORY.md: `> **Status:** TODO` → `> **Status:** IN PROGRESS`.
2. Append an empty `## Files Touched` section to STORY.md (template in
   [references/story-template.md](references/story-template.md)).
3. **Reuse-first:** before writing any new code, re-read the Phase 1.2 grep
   results. If an existing helper covers the task, extend it; only create new
   code when no existing helper fits.
4. Apply changes via `Edit` whenever possible (smaller diffs than `Write`).
5. **Smart test policy:**
   - New public function or non-trivial logic → add a minimal test.
   - Trivial typo / single-line rename / comment edit → skip the test.
   - Mode is `FIX` → add a regression test that fails before the fix and
     passes after it. (The `qa-validator` agent will verify this in Phase 5.)
6. **Per-file logging:** as each file is modified, append one line to
   `## Files Touched`:
   ```
   - <path> — <one-line summary of what changed>
   ```
   Examples: `- src/utils/string.go — added Reverse(s string) string helper`,
   `- src/api/user.ts — fixed null-return regression in getUser()`. Format
   rules in [references/story-template.md](references/story-template.md).
7. For complex tasks with a numbered Implementation Plan: tick each subtask
   `- [ ]` → `- [x]` in the same `Edit` call that adds the code, to amortise
   token cost.

---

## PHASE 4: REGRESSION + REFACTOR

1. **Run the test command** detected in Phase 1.1 (per
   [references/detection.md §1](references/detection.md)). If no test infra
   exists, append a single line to `## Files Touched`:
   `- (no tests detected) — skipping regression run`. Do not create tests
   just to have something to run.
2. **Lint / typecheck:** run only the tools whose config files are present
   (eslint config, tsconfig, ruff config, mypy config, golangci-lint config).
   One command per tool max. Surface failures to the user before Phase 5.
3. **Refactor pass:** re-read the diff using `git diff` or by re-reading the
   touched files. Apply at most **one** targeted refactor that improves
   reuse, removes duplication, or shrinks scope. Never refactor unrelated
   code. If the refactor changes a file already in `## Files Touched`,
   update its existing line in place — do not duplicate.
4. **Re-run tests** if any code changed during the refactor pass.

---

## PHASE 5: QA VALIDATION

Dispatch the `qa-validator` agent (`subagent_type: ck-tools:qa-validator`)
with these inputs:

```
story_path:    <absolute path to STORY.md>
mode:          <FEATURE | FIX | REFACTOR>
files_touched: <list of absolute paths from Files Touched>
test_command:  <command run in Phase 4, or "none">
test_result:   <PASS | FAIL | NOT_RUN>
```

The agent returns a verdict:

- `PASS` → proceed to Phase 6.
- `FAIL: <reasons>` → for each numbered reason, return to Phase 3 to address
  the specific issue, re-run regression in Phase 4, re-dispatch QA. **Cap at
  3 iterations.** After cap, append remaining issues to a new
  `## Deferred Follow-ups` section in STORY.md and proceed to Phase 6.
- `PARTIAL: <items>` → append items to `## Deferred Follow-ups` and proceed.

If the agent is not registered in the user's environment, run the inline
fallback: re-check each acceptance criterion against the diff, re-run the
test command, and grep touched files for the weak-code patterns in
[references/detection.md §4](references/detection.md). Treat any `critical`
match as `FAIL`.

---

## PHASE 6: MANUAL REVIEW GATE

Print a concise summary to the user:

- Mode + STORY.md path
- Files Touched (the bulleted list verbatim)
- QA verdict
- Test result + lint/typecheck result
- Deferred follow-ups, if any

Then call `AskUserQuestion` with three options:

| Label | Effect |
|---|---|
| `Approve — mark DONE` (Recommended) | Proceed to Phase 7 |
| `Request changes` | Capture user's change list, re-enter Phase 3 with those changes only |
| `Abort` | Leave Status `IN PROGRESS`; print STORY.md path; stop |

Do **not** modify Status until the user explicitly approves.

---

## PHASE 6.5: OPTIONAL GITHUB ISSUE (post-acceptance)

Runs only when the user picked **`Approve — mark DONE`** in Phase 6. Skipped
on `Request changes` (loops back to Phase 3) and on `Abort`.

Ask **one** yes/no question via `AskUserQuestion`:

> Track this work as a GitHub Issue? (y / N)

- **No** (default) — proceed straight to Phase 7.
- **Yes** — invoke the `gh-issue` skill via the `Skill` tool with arguments:
  ```
  --story <absolute path to STORY.md>
  ```
  The `gh-issue` skill handles its own auth check, preview confirmation,
  issue creation, and optional GitHub Project assignment (see its Phase 2).
  When it returns, capture the issue URL and append it to the suggested
  commit message in Phase 7 as `Closes #<n>`.

This phase is opt-in by design: ck-tools projects may not use GitHub Issues
at all, and silent issue creation would surprise users. It also runs
**before** Phase 7's status flip so the issue body reflects the accepted
scope, not the post-completion summary.

---

## PHASE 7: COMPLETION

1. Edit STORY.md: `> **Status:** IN PROGRESS` → `> **Status:** DONE`.
2. Tick all `- [ ]` to `- [x]` in Acceptance Criteria and Implementation
   Plan (edit each line in place).
3. Append the Implementation Summary block from
   [references/story-template.md](references/story-template.md). It records:
   completion date, total files touched, test command + result,
   lint/typecheck result, QA verdict, deferred follow-ups count, and a
   suggested conventional-commits commit message.
4. Print to the user: STORY.md path + the suggested commit message.
5. **Never auto-commit, push, or tag.** The user runs the commit themself.

---

## RULES (NON-NEGOTIABLE)

- **Never modify code before STORY.md is written.** The story is the source of
  truth for the run.
- **Never skip skill detection** — always run `find .claude/skills` once per
  invocation, even if the project looks ck-code-free.
- **Never run a regression suite once and skip it on subsequent edits** —
  re-run after every code change pass within the same invocation.
- **Never add tests for trivial changes** (typo fix, single-line rename,
  comment edit). The smart test policy is a ceiling, not a floor.
- **Never auto-commit, push, or tag.**
- **Never widen scope** beyond the user's stated task — surface follow-ups in
  `## Deferred Follow-ups` instead of silently expanding the diff.
- **Never duplicate a helper** — Phase 1.2 grep first, reuse second, write
  last.
- **Never query context7 for purely internal changes** — only when an
  external library or framework API is in play.
- **Never ask more than 2 clarifying questions in Phase 1.** The Phase 6
  review gate is separate and does not count toward this cap.
- **Never mark Status `DONE` without explicit user approval in Phase 6.**
- **Never auto-create GitHub Issues** — Phase 6.5 must ask one explicit
  yes/no question; default is No. Only invoke `gh-issue` after Yes.
- **Never run more than 3 QA iterations.** After cap, defer remaining issues.
- **Never duplicate the per-file change log.** It lives in `## Files Touched`,
  not in `## Implementation Summary`.
- **Never load a skill not present in the `find .claude/skills` output** — no
  inference from training data.

---

## QUICK REFERENCE

| Situation | Action |
|---|---|
| Invoked with `--story <path>` | Read it in Phase 0; skip re-deriving acceptance criteria. |
| No test infrastructure | Phase 4 logs "no tests detected"; QA falls back to weak-code grep. |
| `qa-validator` agent not registered | Run the Phase 5 inline fallback. |
| User picks "Request changes" in Phase 6 | Re-enter Phase 3 with the change list; loop through 4–6. |
| User picks "Approve — mark DONE" in Phase 6 | Phase 6.5 asks one yes/no for optional GitHub Issue; default No. |
| 3rd QA iteration still fails | Defer remaining issues; proceed to Phase 6. |
