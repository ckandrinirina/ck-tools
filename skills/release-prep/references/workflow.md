# release-prep — Workflow Reference

Mechanics that are too verbose for `SKILL.md`. Three sections:

1. Semver decision matrix.
2. Version-file detection (readers + writers).
3. Idempotency / resume detection algorithm.

---

## §1 SEMVER DECISION MATRIX

For each change (PR or commit), pick the highest-priority signal that
matches. The matched signal determines the bucket; the strongest bucket
across the change set determines the bump level.

| # | Signal | Source | Bucket | Bump |
|---|---|---|---|---|
| 1 | `BREAKING CHANGE:` footer in commit body | git log body | Breaking | major |
| 2 | `<type>!:` prefix (`feat!`, `fix!`, `refactor!`, …) | commit subject | Breaking | major |
| 3 | PR labels: `breaking`, `breaking-change`, `semver:major` | gh pr view | Breaking | major |
| 4 | `feat:` / `feat(scope):` | commit subject | Feature | minor |
| 5 | PR labels: `feature`, `enhancement`, `semver:minor` | gh pr view | Feature | minor |
| 6 | `fix:` / `perf:` | commit subject | Fix | patch |
| 7 | PR labels: `bug`, `bugfix`, `fix`, `semver:patch`, `security` | gh pr view | Fix | patch |
| 8 | `chore:` / `ci:` / `build:` / `test:` / `style:` / `docs:` | commit subject | Internal | none |
| 9 | PR labels: `chore`, `internal`, `dependencies`, `ci` | gh pr view | Internal | none |
| 10 | None of the above (free-form commit) | heuristic | see below | ask |

**Heuristic for free-form commits (priority 10):**
- Title matches `/\b(add|introduce|implement|new)\b/i` -> Feature.
- Title matches `/\b(fix|resolve|patch|repair|correct)\b/i` -> Fix.
- Title matches `/\b(refactor|cleanup|tidy|rename|move|extract)\b/i` and no
  public API file changed -> Internal.
- Else -> ask the user to classify.

**Tie-breakers:**
- Conventional-commit signal beats PR label when they disagree (commits are
  more granular than PRs).
- A PR with multiple commits of mixed type takes the *highest* bucket for
  its bullet; constituent types are mentioned only if the user requests
  detail.
- Label `security` keeps bucket = Fix but is rendered as a `Security`
  sub-section in the changelog.

**0.x.y rule (semver §4):** while `PREV_TAG` major is `0`, treat
breaking -> minor and feature -> minor; fix stays patch. Present both the
strict-semver and 0.x.y interpretations in Phase 2 and let the user pick.

**Prerelease arithmetic (`--prerelease=<id>`):**
- No current prerelease -> append `-<id>.1` to the bumped base
  (`1.4.0` + `--prerelease=beta` -> `1.5.0-beta.1` for a minor bump).
- Existing matching prerelease -> increment the trailing counter
  (`1.5.0-beta.1` -> `1.5.0-beta.2`) when the base level is unchanged.
- Existing prerelease, base level changes -> reset to `.1` on the new base.
- Empty `--prerelease=` (no value) -> drop the prerelease suffix and
  release the base (`1.5.0-rc.3` -> `1.5.0`).

---

## §2 VERSION-FILE DETECTION

First-class formats. The skill scans for each in order and stops at the
first match. If multiple top-level files match, ask the user which is
canonical (record the choice for resume mode).

| Format | File | Reader | Writer strategy |
|---|---|---|---|
| npm/yarn/pnpm | `package.json` | `node -e 'process.stdout.write(require("./package.json").version)'` (or `jq -r .version package.json`) | `Edit` matching exact `"version": "<old>"` -> `"version": "<new>"`. |
| Python | `pyproject.toml` | `grep -m1 -E '^version\s*=' pyproject.toml` (under `[project]` or `[tool.poetry]`) | Single-line regex replace, anchored to `^version`. |
| Rust | `Cargo.toml` | `grep -m1 -E '^version\s*=' Cargo.toml` (under `[package]`) | Single-line regex replace, anchored to `^version`. |
| Plain text | `VERSION` / `version.txt` | `cat` (trim trailing newline) | Overwrite contents; preserve the trailing newline if originally present. |

**Fallback for unsupported formats.** Ask the user once:
1. Path to the file that holds the version.
2. The literal version line (so the skill can build an exact match-string
   for the writer).

If the user can't or won't supply one, **skip Phase 5** and continue:
the changelog and tag command can still be produced; the version bump is
left to the user to do manually.

**Semver regex (used by every reader to validate the parsed value):**

```
^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$
```

**Monorepos.** If multiple version files exist and the user says "all of
them", bump in lockstep, but warn that this skill does not orchestrate
independent per-package versions. (Tools like `changesets` are a better
fit for that case.)

---

## §3 IDEMPOTENCY / RESUME DETECTION

The skill is re-callable. Before each phase, it checks whether the work
has already been done. The four ordered checks:

1. **Tag exists** — `git rev-parse v<NEW>` succeeds. The release is already
   cut. Switch to announcement-only mode: print the existing tag's message
   plus the latest changelog section, render the announcement, stop.
2. **Version file already at `<NEW>`** but tag missing — Phase 5 is done.
   Recompute the changelog state, then jump to Phase 6 (print tag command).
3. **CHANGELOG already has `## [<NEW>]`** but version file is not bumped —
   Phase 4 is done. If the existing section's content matches the freshly
   computed content, skip Phase 4 entirely. Otherwise show the diff and
   ask **OVERWRITE / KEEP / EDIT**. Then proceed to Phase 5.
4. **None of the above** — fresh release. Run all phases.

Re-running with the same arguments after a successful run must produce no
diff and no error; the skill prints "release already prepared" and exits
cleanly.

**State storage.** None. The skill is stateless across runs. All "have we
done this already?" detection comes from inspecting the working tree and
git refs — not from a sidecar file.
