---
name: disk-clean
description: Use when the disk is full or filling up, when dev work seems to leave space behind — finished git worktrees, Docker containers, volumes or images from test runs, a Colima VM disk that only grows, test logs, npm/npx, pnpm, Homebrew, pip or Playwright caches — or when the user asks what is using disk space and what can safely be freed. Argument is optional `--root <dir>` (repeatable) for where repositories live.
argument-hint: "[--root <dir>]…"
allowed-tools: Bash(ck-disk*) Bash(df *)
effort: medium
---

# Disk Clean — Find What Dev Work Left Behind, Free What the User Picks

Measures every place dev work quietly fills the disk, then frees exactly the categories the
user selects. Everything a category removes can be rebuilt or downloaded again, or belonged
to a checkout that no longer exists. Uncommitted, unmerged or in-use work is never touched.

`ck-disk` (this plugin's `bin/`) does the measuring and the deleting. The safety rules live
in its code, not in this prose.

## INPUT

`$ARGUMENTS` — optional `--root <dir>`, repeatable: where git repositories are looked for
(depth ≤ 3). Default: `CK_DISK_ROOTS` (colon-separated), else `~/Dev`, `~/Projects`, `~/code`,
`~/src`, `~/work`, plus the current repository.

## PHASE 1: SCAN

```bash
df -h /
ck-disk scan
```

Pass every `--root` through to `ck-disk`. Each row is `<key> <size> <what>`, followed by its
detail lines. Show the user one table, largest first, with the free space from `df` above it.
The keys it can print:

| Key | What it frees |
|---|---|
| `worktrees` | linked worktrees that are merged, clean and not locked by a live process — removed with their branch and their Docker containers |
| `worktree-builds` | `target/`, `node_modules/`, … in worktrees kept for unmerged or uncommitted work — source and commits stay |
| `docker-orphans` | containers (and that worktree's own compose volumes) whose working directory no longer exists |
| `docker-cache` | images no container uses and the build cache — pulled or rebuilt again on demand |
| `docker-anon` | anonymous volumes no container uses |
| `docker-volumes` | **named** volumes no container uses — may hold a dev database; listed, never offered as a group |
| `vm-trim` | the Colima VM disk on the host: `fstrim` returns space freed inside the VM to macOS |
| `qa-logs` | `ck-qa` / `ck-lite-qa` logs and run records older than a day |
| `replicate-cache`, `playwright-old`, `plugin-cache` | ck-replicate browser profiles, outdated Playwright browsers, plugin versions no install uses |
| `npm`, `pnpm`, `yarn`, `brew`, `pip`, `uv` | package-manager caches, through each tool's own clean command (npm also drops `~/.npm/_npx`) |
| `claude-history` | report only — Claude Code transcripts, never deleted by this skill |

## PHASE 2: CHOOSE

Ask with **one `AskUserQuestion` call** (`multiSelect: true`), with only the rows the scan
printed. Each option's label is the key and its size. Group the options into at most four
questions:

1. **Worktrees**: `worktrees`, `worktree-builds`
2. **Docker**: `docker-orphans`, `docker-cache`, `docker-anon`, `vm-trim`
3. **Caches**: `qa-logs`, `playwright-old`, `replicate-cache`, `plugin-cache`
4. **Package managers**: the largest four of `npm`, `pnpm`, `yarn`, `brew`, `pip`, `uv`

Name what a choice costs in its description. `brew` removes old formula versions. `npm`,
`pnpm` and `docker-cache` mean the next install or pull downloads again. `playwright-old`
re-downloads for a project pinned to an older Playwright.

Named `docker-volumes` are never offered as a group. List them in text and say that each one
is removed only when the user names it.

## PHASE 3: CLEAN

```bash
ck-disk clean worktrees docker-cache npm
ck-disk clean --volume old-project_pgdata
df -h /
```

Only the selected keys, plus `--volume <name>` for each named volume the user typed. Then
report what `ck-disk` printed and the free space before and after.

## PHASE 4: PREVENT

Close with the settings that stop the regrowth, and include only the ones that apply:

- **ck-code / ck-code-lite** remove the stopped containers and unused volumes their QA runs
  created, prune their own logs after 7 days (`CK_QA_KEEP_DAYS`), and free a worktree's
  containers when they reclaim or remove it. `/ck-code:doctor` warns on a removed worktree's
  containers.
- **Colima**: the VM disk grows to its `disk:` size in `~/.colima/default/colima.yaml` and
  never shrinks by itself. Suggest running `/ck-tools:disk-clean` with `vm-trim` after big
  Docker cleanups, or a smaller `disk:` on the next `colima delete`.
- **Claude Code transcripts**: `cleanupPeriodDays` in `~/.claude/settings.json` (default 30)
  bounds `~/.claude/projects`.
- **pnpm**: a store for each major (`v10/`, `v11/`) stays after the project moves on. `pnpm
  store prune` only prunes the running major.

## RULES

- **Never delete anything the user did not select** in Phase 2 — one selection, one `ck-disk clean` call, nothing added afterwards.
- **Never run `docker system prune`, `docker volume prune` or `docker compose down -v` yourself** — they reach named volumes that hold dev databases; Docker goes through `ck-disk` keys only.
- **Never remove a named Docker volume the user did not name** — `docker-volumes` is never a group option.
- **Never delete `~/.claude/projects`** or anything under it — transcripts and memory live there; point at `cleanupPeriodDays` instead.
- **Never delete a main checkout's build output, an unmerged branch, or a worktree with uncommitted changes or a live lock** — `ck-disk` refuses them; never work around it with `rm`.
- **Never use `sudo` on the host** — `vm-trim` runs `fstrim` inside the Colima VM only.
