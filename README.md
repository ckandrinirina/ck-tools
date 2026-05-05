# ck-tools — Utility Toolkit Plugin for Claude Code

> A growing collection of optional, repo-level utility skills for [Claude Code](https://www.anthropic.com/claude-code). Designed to coexist with [ck-code](https://github.com/ckandrinirina/ck-code) without overlapping its spec-driven workflow.

`ck-code` is for **delivering features** (design → plan → build → ship).
`ck-tools` is for **maintaining the project** around that work — dependency
upgrades, audits, snapshots, and other recurring chores.

## Skills

| Skill | Purpose |
|---|---|
| [`dependency-upgrade`](./skills/dependency-upgrade/SKILL.md) | Phased, snapshot-tracked dependency upgrade. Each cycle is a self-contained dated folder so the same repo can run an upgrade every quarter or year with a permanent audit trail. Re-callable to resume an in-progress cycle. |
| [`implement`](./skills/implement/SKILL.md) | On-the-go story implementation for any project. Writes a dated STORY.md, asks for story approval, optionally links a GitHub Issue (with project assignment), implements the change, runs tests and lint, then asks for final approval before marking done. Project-agnostic (Go, Node, Python, Rust, Java, etc.). |
| [`release-prep`](./skills/release-prep/SKILL.md) | Prepare a production release: diff source vs. target branch, summarize PRs in plain language for non-developers, update `CHANGELOG.md` with PR links, bump the version file (`package.json` / `pyproject.toml` / `Cargo.toml` / `VERSION`), and print an annotated `git tag` command. Multi-language announcement output. Manual git only — never auto-commits, auto-pushes, or auto-tags. |

More tools to come. Each is independent — install once, opt in per repo.

## Install

`ck-tools` is distributed through **`ck-marketplace`**, the same marketplace
that hosts [`ck-code`](https://github.com/ckandrinirina/ck-code). Add the
marketplace once and install whichever plugins you need:

```bash
# From inside Claude Code
/plugin marketplace add ckandrinirina/ck-code
/plugin install ck-tools@ck-marketplace
```

If you already have `ck-marketplace` added (e.g. you use `ck-code`), refresh
its catalog and install:

```bash
/plugin marketplace update ck-marketplace
/plugin install ck-tools@ck-marketplace
```

For local development, point Claude Code at this directory directly via your
Claude Code plugin settings.

## Per-project opt-in

Like `ck-code`, `ck-tools` stays dormant unless a project explicitly enables it
in `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "ck-tools@ck-marketplace": true
  }
}
```

This keeps unrelated repos free of the toolkit's slash commands.

## Slash commands

| Command | What it does |
|---|---|
| `/ck-tools:dependency-upgrade` | Start or resume a dependency-upgrade cycle in the current repo (or `[repo-path]`). Use `--new` to force-start a fresh cycle even if one is open. |
| `/ck-tools:implement` | Implement a feature, fix, or refactor in the current repo. Accepts a free-text task description and optional `--story <path>` to resume from an existing story file. |
| `/ck-tools:release-prep` | Prepare a release from `[source-branch]` -> `[target-branch]` (defaults `dev` -> `main`). Updates `CHANGELOG.md`, bumps the version file, prints an annotated `git tag` command and a deployment announcement. Flags: `--lang=<code>`, `--bump=<level>`, `--prerelease=<id>`, `--dry-run`. |

## Design principles

- **Independent skills.** Each skill is self-contained and re-callable. No
  cross-skill state.
- **Audit-trail first.** Every action that changes versions writes a snapshot
  before and after. The diff is the receipt.
- **Date-scoped cycles.** Recurring activities (e.g. dependency upgrades) live
  in dated folders so multiple cycles coexist without overwriting history.
- **Manual commits.** Skills never commit or push. They produce diffs and a
  ready-to-paste commit message; the user runs `git`.
- **Repo-aware.** Skills detect the package manager, framework, and project
  conventions (via `CLAUDE.md`) before acting. SOKA monorepo skills route
  edits through their dedicated subagents.

## Contributing

PRs welcome. Each new skill should:
1. Live under `skills/<skill-name>/SKILL.md` with optional `references/`.
2. Have a `name`, `description`, and `argument-hint` in YAML frontmatter.
3. Be re-callable and idempotent where possible.
4. Document its non-negotiable rules in a "RULES" section.

## License

MIT.
