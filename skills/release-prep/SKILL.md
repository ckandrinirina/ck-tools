---
name: release-prep
description: >
  Use to prepare a production release: diff a source branch against a target
  branch (e.g. dev -> main), summarize PRs and commits in plain language for
  non-developers, update CHANGELOG.md with PR links, bump the project version
  file, and print an annotated git-tag command. Outputs a deployment
  announcement in English by default (or any requested language). Project-
  agnostic: detects package.json / pyproject.toml / Cargo.toml /
  VERSION. Never auto-commits, auto-pushes, or auto-tags. Re-callable: detects
  an in-flight release and resumes. Triggers: "prepare release",
  "cut a release", "release notes", "bump version", "deploy to prod",
  "tag a release".
argument-hint: "[source-branch] [target-branch] [--lang=<code>] [--bump=<level>] [--prerelease=<id>] [--dry-run]"
disable-model-invocation: true
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(jq *) Bash(grep *)
---

# Release Prep — Plain-Language Release Notes, Version Bump, Tag Command

Prepare a production release end-to-end without touching git history. The skill
diffs source vs. target, classifies changes for semver, writes a non-developer
summary into `CHANGELOG.md`, bumps the project's version file, and prints an
annotated `git tag` command for the user to run. Manual git only.

For semver classification rules, version-file detection, and the resume
algorithm, see [references/workflow.md](references/workflow.md).
For changelog/announcement templates, see
[references/templates.md](references/templates.md).

---

## INPUT

`$ARGUMENTS` accepts up to 2 positional branches plus named flags. Defaults:

| Token | Meaning | Default |
|---|---|---|
| 1st positional | Source branch (has the new commits) | `dev` -> `develop` -> current branch -> ask |
| 2nd positional | Target branch (deploy target) | `main` -> `master` -> ask |
| `--lang=<code>` | Announcement language | `en` (or project CLAUDE.md `# language:` hint) |
| `--bump=<level>` | Force `major`/`minor`/`patch` | auto-classify, then confirm |
| `--prerelease=<id>` | Produce / increment prerelease suffix (e.g. `beta`) | unset |
| `--dry-run` | Print all proposed changes; touch no files | off |

Resolve the repo root with `git rev-parse --show-toplevel`. If not a git work
tree, stop and ask the user for the right path.

---

## PHASE 0: DETECT

1. Resolve source/target branches from `$ARGUMENTS`/defaults. Verify each
   exists locally (`git rev-parse --verify`) or remotely
   (`git ls-remote --heads origin <branch>`); fetch if missing. Ask if any
   resolution is unclear.
2. Detect the canonical version file. First match wins: `package.json` ->
   `pyproject.toml` -> `Cargo.toml` -> `VERSION` / `version.txt`. If multiple
   exist, ask which is canonical. If none, ask the user for the path and
   the version line. See [references/workflow.md §2](references/workflow.md).
3. Detect `CHANGELOG.md` (or `CHANGELOG`, `HISTORY.md`, `RELEASES.md`). If
   absent, offer to create from the Keep-a-Changelog scaffold in
   [references/templates.md](references/templates.md).
4. Run `git remote get-url origin` to detect host. Run `gh auth status`. On
   GitHub + authenticated `gh`, set `HAS_GH=true`. Otherwise degrade to
   commit-messages-only and warn the user explicitly.
5. Read previous tag:
   `git describe --tags --abbrev=0 --match 'v[0-9]*' <target>` (fallback
   without `v` prefix). Record `PREV_TAG` and the prefix convention.
6. Detect in-flight release per
   [references/workflow.md §3](references/workflow.md). If detected, switch
   to RESUME MODE and skip the phases that already produced output.
7. Print the resolved scope (repo, source -> target, prev tag, version-file
   path, changelog path, host, language). Confirm before continuing
   (skip the prompt under `--dry-run`).

---

## PHASE 1: GATHER CHANGES

```bash
git fetch origin <source> <target>
RANGE="origin/<target>..origin/<source>"
git log --no-merges --pretty=format:'%H%x09%s%x09%an%x09%ae' "$RANGE"
git log --merges    --pretty=format:'%H%x09%s%x09%b'         "$RANGE"
```

Extract PR numbers from merge commit subjects (`Merge pull request #<N>`)
and from `(#<N>)` markers in squash-merged subjects. De-duplicate by PR
number; commits without a PR are keyed by short hash.

If `HAS_GH`, enrich each PR:
```bash
gh pr view <N> --json number,title,body,labels,author,mergedAt,url,closingIssuesReferences
```
Cache results by PR number for the duration of the run. For linked issues,
`gh issue view <N> --json number,title,labels,url` — useful for explaining
*why* a change was made.

If `RANGE` is empty, stop with "nothing to release."

---

## PHASE 2: CLASSIFY FOR SEMVER

Apply the priority matrix in
[references/workflow.md §1](references/workflow.md). Aggregate to a
recommended bump:

- any **breaking** -> `major`
- else any **feature** -> `minor`
- else any **fix** -> `patch`
- else **internal-only** -> warn the user; ask whether to still cut a patch.

For `0.x.y` projects (semver §4) present both interpretations and let the
user choose. If `--bump` is set, skip auto-classification but still bucket
each change for the changelog. If `--prerelease=<id>` is set, increment the
trailing counter (`-beta.1` -> `-beta.2`) when the base level is unchanged.

Show a compact table: each PR/commit, its bucket, and the recommended bump
+ next version. Ask **CONFIRM / OVERRIDE / EDIT**.

---

## PHASE 3: PLAIN-LANGUAGE SUMMARY

Bucket changes into **Breaking changes / Added / Changed / Fixed /
Internal**. A change is internal-only when its conventional type is one of
`chore`/`ci`/`build`/`test`/`style`/`docs` (engineering-only docs) **and** it
has no `BREAKING CHANGE:` footer; or when its PR labels include `internal`/
`infra`/`chore`/`dependencies` and not `user-facing`.

Internal-only changes go to `### Internal` in the changelog and are
**excluded from the announcement**.

For each public change, write one ≤140-char sentence aimed at a non-developer:
- Lead with the user-visible benefit. Strip jargon (`refactor`, `wire up`).
- Prefer the PR body's "Release notes" / "What changed for users" section
  when present.
- Otherwise derive from PR title + linked issue title + first non-trivia
  paragraph.

Show the summary; accept inline edits before writing to disk.

---

## PHASE 4: UPDATE CHANGELOG.md

Use the Keep-a-Changelog 1.1.0 layout from
[references/templates.md](references/templates.md).

Insertion algorithm:
- If a non-empty `## [Unreleased]` section exists, **promote** its content into
  the new versioned section, preserving sub-section order. Leave a fresh
  empty `## [Unreleased]` block above.
- If `## [Unreleased]` is empty or missing, insert the new versioned section
  at the top (below the file header), and ensure a fresh `## [Unreleased]`
  exists above it.
- Append/refresh compare-link footers:
  ```
  [Unreleased]: <host>/compare/v<NEW>...HEAD
  [<NEW>]:      <host>/compare/v<PREV>...v<NEW>
  ```
  For non-GitHub hosts, use the host-appropriate compare URL. For the very
  first release, use a `releases/tag/v<NEW>` link instead of a compare URL.

Each bullet ends with a Markdown link to the PR: `([#<N>](<URL>))`.

Idempotency: if the file already contains `## [<NEW>]` and the proposed
content differs, show the diff and ask **OVERWRITE / KEEP / EDIT**. If the
content is byte-equal, skip writing.

On `--dry-run`, print the diff and stop.

---

## PHASE 5: BUMP THE VERSION FILE

Read the current version with the type-specific reader from
[references/workflow.md §2](references/workflow.md). Validate against the
semver regex. Compute the new version from the recommended bump (or
`--bump` / `--prerelease`). If the file already shows the target version,
skip with a note (idempotent).

Write the new version with a **minimal-diff** strategy: change only the
version field, preserve all other formatting and key order. Use `Edit`
matching the exact existing version string.

Show the diff. On `--dry-run`, just print the proposed change.

---

## PHASE 6: PRINT GIT-TAG COMMAND (NO EXECUTION)

Compose the tag name to match the existing convention (`v`-prefixed or bare;
default `v<NEW>`). The annotated tag message = the new CHANGELOG section
body (without the `## [version]` header line).

Print one copy-paste block:

```bash
# 1. Stage and commit the version + changelog (manually):
git add CHANGELOG.md <version-file>
git commit -m "chore(release): v<NEW>"

# 2. Create the annotated tag (manually):
git tag -a v<NEW> -m "$(cat <<'TAG'
<release section body here>
TAG
)"

# 3. Push branch and tag (manually):
git push origin <target-branch>
git push origin v<NEW>
```

**The skill never runs `git add`, `git commit`, `git tag`, or `git push`.**
No automatic execution, no opt-in offer.

---

## PHASE 7: DEPLOYMENT ANNOUNCEMENT

Resolve the language: `--lang=<code>` -> project CLAUDE.md `# language:`
hint -> `en`. Render the announcement template from
[references/templates.md](references/templates.md). Translate **chrome only**
(headings/labels); bullet bodies stay in their authored language. Print a
fenced block ready to copy.

Stop. Hand control back to the user.

---

## RULES (NON-NEGOTIABLE)

- **Never auto-commit, auto-push, or auto-run `git tag`.** All git mutations
  are manual; the skill prints commands, the user runs them.
- **Never modify or delete an existing tag.** A tag matching `v<NEW>` means
  the release is already cut — switch to announcement-only mode.
- **Never add Claude/AI references** or co-author trailers in commits, PRs,
  changelog entries, tag messages, or announcements (per global CLAUDE.md
  and ck-tools README).
- **Never include a "Test plan" section** anywhere.
- **Never reformat the version file** beyond the version field. Preserve all
  other formatting and key order byte-for-byte.
- **Detect before acting.** When detection is ambiguous, ask. Never guess
  the version file or the previous tag.
- **Idempotent.** Re-running with no new changes produces no diff and no
  error.

---

## RED FLAGS — STOP IMMEDIATELY

- `origin/<target>..origin/<source>` is empty (target is at or ahead of
  source) -> "nothing to release."
- Working tree is dirty on the target branch -> uncommitted changes would
  leak into the release commit.
- Version-file value disagrees with `PREV_TAG` (e.g. file says `1.4.0`,
  latest tag is `v1.3.2`).
- Tag `v<NEW>` already exists -> release already cut; offer announcement-
  only mode.
- All changes in the range are internal-only and the user has not confirmed.
- Recommended bump is `major` while the project is `0.x.y` and the user has
  not opted into `1.0.0`.

---

## QUICK REFERENCE

| Situation | Action |
|---|---|
| First run on a fresh diff | Run all phases; confirm scope at end of Phase 0. |
| Re-run after changelog written but tag not yet created | RESUME — skip Phase 4, jump to Phase 6/7. |
| Tag `v<NEW>` already exists | Announcement-only; print existing changelog section. |
| `gh` not authenticated / non-GitHub remote | Commit-only fallback; warn explicitly. |
| Version file not detected | Skip Phase 5; do Phases 4/6/7 with user-supplied version. |
| User passes `--bump=<level>` | Skip auto-classification; still bucket for changelog. |
| `--dry-run` set | Print every diff and the tag command; touch no files. |
