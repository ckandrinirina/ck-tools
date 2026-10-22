---
name: review-guide
description: Use when a human has to review a pull request, branch or diff that is too large to read in one pass — an AI-generated PR, a multi-thousand-line change, a "where do I even start" review — or wants to resume a review left half done. Not for an automated bug hunt (use /code-review). Argument is an optional PR number or URL, branch, commit range, or `--staged`, plus `--resume` or `--lang fr|en`.
argument-hint: "[PR# | PR URL | branch | A..B | --staged] [--resume] [--lang fr|en]"
effort: medium
allowed-tools: Bash(git *) Bash(gh *)
---

# Review Guide — Review a Huge Diff in Small, Ordered Steps

Turns one unreadable diff into a short map plus a sequence of small review steps, each
with its intent, the hunks to read, what to check and the questions a reviewer should be
able to answer afterwards. The human reviews; this skill guides, it never approves.

References:
- `references/triage-and-chunking.md` — tier rules, chunk ordering, chunk size, risk flags
- `references/state-format.md` — the resumable progress file

## INPUT

`$ARGUMENTS` selects the diff:

| Argument | Diff |
|---|---|
| empty | current branch vs its merge-base with the default branch |
| `123`, `#123`, a PR URL | that GitHub PR (`gh pr diff`, `gh pr view`) |
| a branch name | that branch vs its merge-base with the default branch |
| `A..B` / `A...B` | that commit range |
| `--staged` | the staged changes |

`--resume` continues the saved review for the same target. `--lang fr|en|<code>` forces the
language; otherwise answer in the language the user writes in.

## PHASE 0: RESOLVE THE TARGET

### 0.1 Default branch and base

```bash
DEFAULT=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)
BASE=$(git merge-base "$DEFAULT" HEAD); HEAD_SHA=$(git rev-parse HEAD)
```

For a named branch, replace `HEAD` with it. Never hardcode `main` when `origin/HEAD` resolves.

### 0.2 PR target

```bash
gh pr view 123 --json number,title,body,baseRefName,headRefName,additions,deletions,changedFiles,url
gh pr diff 123 --name-only
```

When the PR's head branch is fetchable, prefer `git fetch origin pull/123/head:ck-review-123`
and local `git diff` from then on — it supports per-file and `-M` rename detection, which
`gh pr diff` does not.

### 0.3 Resume check

Locate the state file (`references/state-format.md`). If it exists and the target's head
commit is unchanged, offer **resume** (default when `--resume` is passed) or **restart**. If
the head moved since the last session, say how many commits landed, and offer to review only
the new commits as an extra step at the end.

## PHASE 1: MEASURE — NEVER LOAD THE WHOLE DIFF

```bash
git diff --numstat -M "$BASE...$HEAD"
git diff --summary -M "$BASE...$HEAD"
git log --oneline "$BASE..$HEAD"
```

Read only these summaries now. Hunks are read later, one chunk at a time, with
`git diff -M "$BASE...$HEAD" -- <paths>`. Also read the PR description, linked issue or
story/spec file if one is named in the PR body or commits — it is the statement of intent
the code is reviewed against.

## PHASE 2: THE MAP

### 2.1 Triage every file

Assign each file a tier — **Read closely**, **Skim**, or **Skip** — per
`references/triage-and-chunking.md`, and attach any risk flags.

### 2.2 Build the chunks

Group the Read-closely and Skim files into ordered chunks per the same reference: dependency
order, one concern per chunk, about 150–300 changed lines each.

### 2.3 Present the map

One screen, nothing more:

```
## <PR title or branch> — review map
**What it does:** <2–3 sentences from the intent + the diff, not the commit list>
**Size:** <N> files, +<a>/−<d>  →  you read ~<r> lines, skim ~<s>, skip ~<k>
**Estimated time:** ~<minutes> (≈ 400 lines/hour of close reading)

| # | Step | Files | Lines | Tier | Risk |
|---|------|-------|-------|------|------|
| 1 | Data model: new `Order` table | 3 | 120 | Read | migration |
...
**Skipped:** <count> files (lockfiles, generated, snapshots) — `show skipped` to list them.
**Hot spots:** <the 1–3 places most worth your attention, with file:line>
```

Then ask: **start at step 1, jump to a step, or change the plan** (merge, split or
re-tier a chunk). Write the state file before the first step.

## PHASE 3: STEP-BY-STEP WALKTHROUGH

### 3.1 Each step

Fetch only this chunk's hunks, then present:

```
### Step <i>/<n> — <title>      [<done>/<n> · ~<min> left]
**Intent:** <what this part of the change is for, 1–2 sentences>
**How it fits:** <what it depends on from earlier steps, what later steps use from it>
**Read:** <file:line ranges in reading order — the hunks, with the long ones trimmed to
the lines that carry logic; say what was trimmed>
**Check:** <2–5 concrete things to verify here — from the risk flags, not a generic list>
**You should now be able to answer:** <2–4 questions about this chunk>
```

Explain the code in plain language next to the hunk when the logic is non-obvious; do not
paraphrase trivial lines. Cite `file:line` for every claim.

### 3.2 Commands the reviewer can type

| Command | Effect |
|---|---|
| `next` / `n`, `back` / `b`, `go <i>` | move between steps |
| `why?` or any question | answer it about the current chunk, reading more code if needed |
| `deeper` | full hunks of this chunk, nothing trimmed |
| `note: <text>` | record a note on the current step (file:line when given) |
| `ok` / `concern: <text>` | mark the step reviewed, or reviewed with a concern |
| `split` | cut the current chunk in two |
| `status` | show the map with progress |
| `pause` | save and stop — resume later with `--resume` |

Update the state file after every `note`, `ok`, `concern` and step change, so a closed
session loses nothing.

### 3.3 Skim and Skip tiers

Skim steps show a short summary per file and only the hunks that break the expected
pattern. Skipped files are never shown unless the user asks; when one contains anything
beyond its expected shape (a lockfile that adds a new top-level dependency, a "generated"
file edited by hand), promote it to Read closely and say why.

## PHASE 4: WRAP-UP

When every step is marked, or on `finish`:

```
## Review summary — <target>
**Reviewed:** <i>/<n> steps · **Concerns:** <count> · **Notes:** <count>
**Concerns** — <file:line — text>, most severe first
**Not reviewed:** <steps left open, skipped files promoted or not>
**Suggested verdict:** <approve / request changes / comment> — the reviewer decides
```

Then offer, each only on an explicit yes:
- **Post** the concerns and notes to the PR as one review — inline comments where a
  `file:line` exists, the rest in the review body. Write the payload beside the state file as `review.json`
  (`{"event":"COMMENT","body":"…","comments":[{"path":"src/a.ts","line":48,"side":"RIGHT","body":"…"}]}`)
  and send it with `gh api repos/{owner}/{repo}/pulls/123/reviews --input review.json`
  (`gh api` fills `{owner}`/`{repo}` itself). Show the exact comments before posting. Never submit `APPROVE` or `REQUEST_CHANGES` on the
  user's behalf unless they type that verdict.
- **Run `/code-review`** on the steps marked with a concern, for a second pass.
- **Delete** the state file.

## RULES

- **Never load the full diff into context** — read `--numstat` first, then one chunk's hunks at a time.
- **Never approve, merge, or post anything without an explicit yes** for that exact action; show the comments before posting.
- **Never write inside the working tree** — the state file lives under the git directory, never in tracked or ignorable project paths.
- **Never skip a file silently** — every skipped file is counted on the map and listable with `show skipped`.
- **Never invent intent** — the "what it does" and every step's intent come from the PR body, linked spec, commits or the code itself; say "intent not stated" when none exists.
- **Never present a generic checklist** — every "Check" item is tied to this chunk's code or risk flags.
- **Always cite `file:line`** for every claim about the code.
- **Always answer in the user's language** (or `--lang`), keeping code, identifiers and commands untranslated.
