# ck-tools — Utility Toolkit Plugin for Claude Code

> A growing collection of optional, repo-level utility skills for [Claude Code](https://www.anthropic.com/claude-code). Designed to coexist with [ck-code](https://github.com/ckandrinirina/ck-code) without overlapping its spec-driven workflow.

`ck-code` is for **delivering features** (design → plan → build → ship).
`ck-tools` is for **the surrounding work** — implementing quick tasks, filing
issues, upgrading dependencies, preparing releases, and committing changes.

## Skills

| Skill | Purpose |
|---|---|
| [`bmad-guide`](./skills/bmad-guide/SKILL.md) | Read-only guide to the [BMAD Method](https://docs.bmad-method.org) install in the current project. Detects the installed version and invocation surface from `_bmad/` manifests, explains the flow as that version defines it, reads where the project actually sits from its artifacts and sprint status, and routes a task to the exact workflow to run next — then hands off. Manifest-driven rather than hardcoded, so it stays correct across BMAD releases; checks the web only when BMAD is missing, unrecognised, or you ask whether you are up to date. Never runs a BMAD workflow and never writes a file. |
| [`deliver`](./skills/deliver/SKILL.md) | Commit staged or unstaged changes with a conventional-commit message and optionally open a pull request. Project-agnostic — no story or epic format required. |
| [`dependency-upgrade`](./skills/dependency-upgrade/SKILL.md) | Phased, snapshot-tracked dependency upgrade. Each cycle is a self-contained dated folder so the same repo can run an upgrade every quarter or year with a permanent audit trail. Re-callable to resume an in-progress cycle. |
| [`gh-issue`](./skills/gh-issue/SKILL.md) | Create a single GitHub Issue from free-text intent or a story file, with optional assignment to a GitHub Project. Mirrors `gh issue create` flag style. |
| [`implement`](./skills/implement/SKILL.md) | On-the-go story implementation for any project. Writes a dated STORY.md, asks for story approval, optionally links a GitHub Issue (with project assignment), applies SOLID design and review (skipped only for trivial changes), implements the change, runs tests and lint, then asks for final approval before marking done. Project-agnostic (Go, Node, Python, Rust, Java, etc.). |
| [`release-prep`](./skills/release-prep/SKILL.md) | Prepare a production release: diff source vs. target branch, summarize PRs in plain language for non-developers, update `CHANGELOG.md` with PR links, bump the version file (`package.json` / `pyproject.toml` / `Cargo.toml` / `VERSION`), and print an annotated `git tag` command. Multi-language announcement output. Never auto-commits, auto-pushes, or auto-tags. |
| [`showcase`](./skills/showcase/SKILL.md) | Analyze a product (ck-code architecture docs first, else README/manifests/codebase), then build a modern Astro presentation website themed after the app — hero, features, mobile/desktop/web platform sections, getting-started, and changelog. Packages the site as its own independent git + public GitHub repo (gitignored from the project) and saves a `showcase.config.json`, so re-running intelligently updates the site from project changes instead of rebuilding. Guides deployment to a free host (GitHub Pages, Vercel, Netlify, Cloudflare Pages) or an existing server. |

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
| `/ck-tools:deliver` | Commit changes with a conventional-commit message and optionally open a PR. Accepts an optional change description. |
| `/ck-tools:dependency-upgrade` | Start or resume a dependency-upgrade cycle in the current repo (or `[repo-path]`). Use `--new` to force-start a fresh cycle even if one is open. |
| `/ck-tools:gh-issue` | Create a GitHub Issue from a description or `--story <path>`. Flags: `--project <number>`, `--label <name>`, `--assignee <user>`. |
| `/ck-tools:implement` | Implement a feature, fix, or refactor in the current repo. Accepts a free-text task description and optional `--story <path>` to resume from an existing story file. |
| `/ck-tools:release-prep` | Prepare a release from `[source-branch]` -> `[target-branch]` (defaults `dev` -> `main`). Updates `CHANGELOG.md`, bumps the version file, prints an annotated `git tag` command and a deployment announcement. Flags: `--lang=<code>`, `--bump=<level>`, `--prerelease=<id>`, `--dry-run`. |
| `/ck-tools:showcase` | Analyze a product and build a modern Astro presentation website themed after the app (hero, features, platform sections, getting-started, changelog), package it as an independent gitignored GitHub repo with a saved config, then guide free deployment. Re-run to intelligently update the site from project changes. Accepts an optional product name or output directory. |

## Native Claude Code integration

- **`PostToolUse(Write|Edit)` hook** auto-formats files after edits (prettier / rustfmt / ruff / black / gofmt / shfmt; no-op when the formatter is absent) — `command`-type, zero model-token cost.
- **`references/native-commands.md`** pairs built-in commands with ck-tools skills: `/goal` for autonomous verification loops, `/code-review --fix` before a `deliver` PR, and an intelligent `/fast` decision table (on for small tasks, off for large refactors). `/fast` is toggled by you — a plugin cannot enable it.

## Design principles

- **Independent skills.** Each skill is self-contained and re-callable. No
  cross-skill state.
- **Audit-trail first.** Every action that changes versions writes a snapshot
  before and after. The diff is the receipt.
- **Date-scoped cycles.** Recurring activities (e.g. dependency upgrades) live
  in dated folders so multiple cycles coexist without overwriting history.
- **Explicit confirmation.** Skills that write to remote systems (commits, PRs,
  GitHub Issues) ask before acting — no silent side-effects.
- **Repo-aware.** Skills detect the package manager, framework, and project
  conventions (via `CLAUDE.md`) before acting.

## Contributing

PRs welcome. Each new skill should:
1. Live under `skills/<skill-name>/SKILL.md` with optional `references/`.
2. Have a `name`, `description`, and `argument-hint` in YAML frontmatter.
3. Be re-callable and idempotent where possible.
4. Document its non-negotiable rules in a "RULES" section.

## License

MIT.
