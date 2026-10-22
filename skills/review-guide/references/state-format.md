# Review State File

## Location

Inside the git directory, so it is never tracked, never needs a `.gitignore` entry, and is
shared by every worktree of the repo:

```bash
git rev-parse --git-common-dir
```

File: `<git-common-dir>/ck-review/<target-slug>.md`, where the slug is `pr-123`, the branch
name with `/` replaced by `-`, `range-<shortA>-<shortB>`, or `staged`. Create the folder
with `mkdir -p`. List saved reviews with `ls <git-common-dir>/ck-review/`.

## Format

```markdown
# Review — <target>
target: pr-123
base: <base sha>
head: <head sha at plan time>
lang: fr
started: 2026-10-22
updated: 2026-10-22T14:05

## Steps
| # | Title | Files | Tier | Status |
|---|-------|-------|------|--------|
| 1 | Data model: new Order table | db/migrations/0042_orders.sql, src/models/order.ts | Read | ok |
| 2 | Pricing logic | src/pricing/*.ts | Read | concern |
| 3 | API handlers | src/api/orders.ts | Read | current |
| 4 | Tests | test/pricing.test.ts | Skim | todo |

## Skipped
- package-lock.json — lockfile
- src/__snapshots__/order.snap — snapshot

## Notes
- [2] concern src/pricing/total.ts:48 — rounds before summing; totals can drift by a cent
- [1] note db/migrations/0042_orders.sql:12 — no down migration
```

`Status` is one of `todo`, `current`, `ok`, `concern`. Exactly one row is `current` while a
session is open. `Files` holds paths or globs exactly as passed to `git diff -- <paths>`, so
a resumed session rebuilds each chunk without re-planning.

## Resume

1. Read the file, re-resolve the target's head sha.
2. Same head → reopen at the `current` step (or the first `todo`).
3. Head moved → `git log --oneline <head>..<new head>` and `git diff --numstat <head>..<new head>`;
   report the new commits and append one step, "Changes since your last session", reviewing
   only that range. Mark earlier `ok` steps whose files changed as `todo` again and say which.
