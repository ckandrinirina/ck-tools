# Changelog

All notable changes to ck-tools are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.7.0] — 2026-10-28

### Added
- **disk-clean**: measures what dev work leaves on the disk — finished worktrees and kept worktrees' build output across your repos, Docker containers of removed checkouts, unused images and build cache, anonymous volumes, the Colima VM disk (`fstrim`), ck-qa logs, outdated Playwright browsers, unused plugin versions, npm/npx, pnpm, yarn, Homebrew, pip and uv caches — and frees only the categories you pick, through the new `ck-disk` script. Named Docker volumes, unmerged or in-use worktrees and the main checkout's build output are never touched as a group.

## [2.6.0] — 2026-10-22

### Added
- **review-guide**: guides a human through a pull request, branch or diff too large to review in one pass — a one-screen map that tiers every file (read closely, skim, skip), then small dependency-ordered steps with intent, what to check and self-check questions; progress and notes resume across sessions from the git directory, and notes post to the PR only on an explicit yes.
- **understand**: explains a file, codebase, spec, diff, error, config, command or concept as a step-by-step guide (TL;DR, map, walkthrough with `file:line` references, pitfalls, self-check questions) in the user's language, with `--quick`/`--deep` depth.

## [2.5.1] — 2026-10-16

### Fixed
- **format hook**: `scripts/format.sh` now matches ck-code's gated formatter — files outside the project are never touched, and prettier, ruff/black and shfmt run only when the project has their config; before, any installed prettier reflowed Markdown and YAML in every repo (and rewrote inline code spans).
- **gh-issue**: `disable-model-invocation` dropped — `implement` hands off to it through the Skill tool, which the flag silently blocked, so answering Yes created no issue. The description now limits it to explicit requests and that hand-off.
- **mod**: the `session.start` and `session.measure` handlers swallow a failed store, toast or command call and always continue the chain; a failed update check no longer hides the usage band.
- **mod**: a failed update check (offline, non-ok, malformed reply) is recorded and waits 6 hours like a success, instead of refetching at every session start.

## [2.5.0] — 2026-10-16

### Added
- **mod**: update check — when the public marketplace serves a newer ck-tools than the one the session loaded, one toast per new version and a row above the prompt (`/plugin update ck-tools@ck-marketplace`, then restart) until it is updated, so a project left on an old install is told. The latest version is read from the published `marketplace.json` at most every 6 hours and cached in the plugin store; a `--plugin-dir` checkout is never checked, and the `update_check` setting, `CK_UPDATE_CHECK=off` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` turns it off. `hooks/mod/update.tsx` and `tests/mod/update.test.tsx` are kept word for word in ck-code, ck-code-lite and ck-tools.

## [2.4.0] — 2026-10-14

### Added
- **mod** (new, `hooks/mod/`): a band above the prompt with the 5-hour and weekly plan limits: a bar, the share used, a pace verdict (`✓ safe`, `⚠ tight`, `✗ out in 1h30m`, `✗ limit hit`) and the time to each reset. One row, or one row per window in a narrow band; the other mods' bands (ck-code, ck-code-lite) draw under it.
- **mod**: toasts once per window at each threshold (`usage_alert_at`, 80% and 95% by default) and once when the pace runs the window out before its reset, de-duplicated across sessions.
- **mod**: the last reading is kept in the plugin store, so a new session draws the band at once, marked with its age.
- **commands**: `/usage-pace` (the full report) and `/usage-band` (hide or show), both with no model turn.
- **settings**: `usage_band`, `usage_alerts`, `usage_alert_at`.
- **tests**: `tests/mod/` (18 offline tests, `claude plugin test`), run in the new CI workflow.

## [2.3.1] — 2026-10-13

### Fixed
- **showcase**: reads ck-code v7's `tasks/EPICS_INDEX.md` (regenerating it with `ck-index` when available), falling back to the pre-v7 `FEATURE_INDEX.md` — feature status and "Coming soon" marks work again on current projects.
- **implement / qa-validator**: the dispatch now passes the absolute `detection.md` path, so the weak-code scan (including the hard-coded-credentials FAIL) runs instead of being skipped or improvised.
- **gh-issue**: batch creation points to `/ck-code:plan --publish`, not the retired `/ck-code:to-issues`.
- **README**: the slash-command table lists `/ck-tools:bmad-guide`.

## [2.3.0] — 2026-09-09

### Added
- **references/rtk.md** (new): RTK is an optional third-party `PreToolUse` hook that filters command output before it reaches context. Documents the command forms it recognizes, which commands it cannot help (`yarn`, `mvn`, `gradlew`, `npm install`), and the rule that a skill must never hardcode an `rtk` prefix.

### Changed
- **implement/references/detection.md**: the Node test command resolves to `npm run test` / `pnpm run test` rather than the `npm test` shorthand — exact aliases, but only the long form is filtered by RTK. `yarn test` is unchanged; RTK has no yarn filter.
- **references/native-commands.md**: new RTK section linking the full contract.

## [2.2.4] — 2026-08-31

### Added
- **deliver / dependency-upgrade / implement / release-prep / showcase**: `effort:` frontmatter, so each skill runs at its own reasoning tier instead of inheriting the session's level.
- **bmad-guide**: read-only tier matching ck-code's guide skills — `effort: low`, `model: haiku`, `context: fork`, `agent: Explore`, plus `allowed-tools` and `disallowed-tools`; a purely read-only orientation now costs a cheap model in a forked context.
- **qa-validator**: `effort: low` and `experimental.cacheTtl: "1h"`, a new per-agent prompt-cache TTL that avoids re-caching the agent's system prompt on repeated dispatch.

### Changed
- **references/native-commands.md**: documents `/code-review`'s effort levels (`low`…`max`, `ultra`), its `/review` alias and `--comment`, `/effort`'s new per-model default, and `/loop`; the effort note now describes the `effort:` frontmatter every skill sets.


## [2.2.3] — 2026-08-03

### Changed

- **release-prep**: description rewritten to trigger conditions only (746 → 416 chars).
  It was summarizing the workflow — the phases, the outputs, the resume behaviour — which
  both overran the 500-char limit and made the skill harder to match against a real
  request. The `never auto-commit, auto-push, or auto-tag` guarantee it stated is
  unchanged; it was already a hard rule in the skill body.
- **dependency-upgrade**: same fix (591 → 341 chars) — the dated-folder layout, phase
  order, and risk matrix are workflow detail, not triggers.

Both descriptions now pass `plugin-doctor.sh` with no warnings. No behaviour changes.

### Changed
- **bmad-guide / deliver / showcase**: dropped the default-valued `disable-model-invocation: false` frontmatter line.

## [2.2.1] — 2026-07-29

### Fixed
- **native-commands**: `/fast` guidance no longer pinned to Opus 4.8 — it is available on Opus 5 and 4.x.
- **hooks**: the auto-format hook also matches `MultiEdit` and `NotebookEdit` tool calls.

## [2.2.0] — 2026-07-24

### Added
- **bmad-guide**: new read-only skill that orients you in a project using the BMAD Method — detects the installed version and how it is invoked, explains the flow, reads where the project actually stands, and routes a task to the exact workflow to run next without executing it.

## [2.1.1] — 2026-06-12

### Changed
- **showcase**: the generated site is now packaged as its own independent git repo + public GitHub repo (`<project>-showcase`), gitignored from the main project. Added a skill-managed `showcase.config.json` and site `README.md` recording the product snapshot, theme, sections, source commit, deploy target, and per-file checksums — making re-runs an intelligent UPDATE (diff project changes, refresh only affected sections, preserve manual edits) instead of a rebuild.

## [2.1.0] — 2026-06-12

### Added
- **showcase**: new skill that analyzes a product (ck-code architecture docs first, else README/manifests/codebase), builds a modern Astro presentation website themed after the app — hero, features, mobile/desktop/web platform sections, getting-started, and changelog — and guides deployment to a free host (GitHub Pages, Vercel, Netlify, Cloudflare Pages) or an existing server. No tech-stack section; publishes only with user approval.

## [2.0.3] — 2026-06-09

### Changed
- **qa-validator**: pinned the agent to the `fast` (Haiku) tier so QA passes dispatched by `implement` (and other ck-tools skills) run on the cheapest model in their own context, keeping verbose test/lint output off the dispatching session.

## [2.0.2] — 2026-06-04

### Added

- **dependency-upgrade**: New ck-tools-local subagent fan-out contract (`references/subagent-fanout.md`) plus gated read-only fan-out in Phase 1.2 classification — with ≥8 outdated/audit findings, one investigator per package greps usage and fetches migration notes concurrently, then the orchestrator merges and authors `critical-files.md`. Investigation only: all of Phase 2 (install, lockfile writes, shared build/test, fail-fast gate) and SOKA subagent routing stay strictly sequential; below ~8 findings, classification runs inline.

## [2.0.1] — 2026-05-29

### Fixed

- **plugin**: removed the redundant `"hooks": "./hooks/hooks.json"` key from the manifest — the standard `hooks/hooks.json` is loaded automatically, so declaring it again triggered a "Duplicate hooks file detected" load error at startup.

## [2.0.0] — 2026-05-29

### Added

- **hooks**: new `PostToolUse(Write|Edit)` hook best-effort auto-formats touched files (prettier/rustfmt/ruff/black/gofmt/shfmt, no-op when the formatter is absent). `command`-type — zero model-token cost.
- **native-commands** (new `references/native-commands.md`): maps Claude Code built-ins to ck-tools skills — `/goal` for autonomous verification loops, `/code-review --fix` pre-PR, and an intelligent `/fast` decision table. Linked from `implement` and `deliver`.

### Changed

- **token efficiency**: added `effort: low` to `gh-issue`.

## [1.0.6] — 2026-05-29

### Changed

- **plugin.json**: added `$schema`, `displayName`, `homepage`, `repository`, and `keywords` metadata so the plugin presents richer info in the `/plugin` marketplace UI and validates under `claude plugin validate --strict` (additive only, no behavior change).

## [1.0.5] — 2026-05-22

### Added

- **dependency-upgrade, implement**: effort-aware behavior via `${CLAUDE_EFFORT}` — both skills now scale their depth to the active effort level (low = safe/minimal, medium = standard flow, high/xhigh/max = deep research, full risk/SOLID review, and expanded verification).

## [1.0.4] — 2026-05-11

### Changed

- **implement**: enforces SOLID twice — design pass in Phase 3 step 3 (appends a `## SOLID Design` section to STORY.md using a one-line-per-principle template) and inline compliance check in Phase 4 step 3 (surfaces violations as refactor items against the diff). Both passes skip for trivial changes (typo, single-line rename, comment edit, single-line value tweak). New `references/solid-review.md` holds templates, skip table, and common refactorings. Implementation Summary records the SOLID outcome. Matches `ck-code/build` rigor while keeping the on-the-go ergonomics.

## [1.0.3] — 2026-05-07

### Added

- `CHANGELOG.md` — full release history in Keep a Changelog format, from v0.1.0 to present.

## [1.0.2] — 2026-05-06

### Added

- **implement**: `## Unplanned Changes` story-file section — any code change made outside the Phase 2 planned files list (drive-by fix, unscoped refactor, new file/function) must be logged at the moment it happens (`- <path> — <what> — <why>`). Coexists with `## Files Touched` and `## Deferred Follow-ups`. Implementation Summary records an unplanned-changes count.

## [1.0.1] — 2026-05-06

### Changed

- **deliver**: rewrites commit & PR templates for stakeholder readability — drops story IDs, AC checklists, test-count tallies, class/function names, and file paths from commit bodies and PR bodies. Subject lines stay in conventional-commit format.

## [1.0.0] — 2026-05-05

### Added

- **implement**: on-the-go story implementation for any project — writes a STORY.md, asks for story approval, optionally links a GitHub Issue (with project assignment), implements with TDD, runs tests and lint, then asks for final approval before marking done.
- **gh-issue**: create a single GitHub Issue from free-text intent or a `--story <path>` file, with interactive GitHub Project assignment.
- **deliver**: commit staged/unstaged changes with a conventional-commit message and optionally open a pull request. Project-agnostic.

### Changed

- **implement**: Phase 2.3 pre-implementation GitHub Issue opt-in (uses `gh-issue` skill, handles project assignment).
- **implement**: Phase 2.5 story review gate — user must approve STORY.md before any code is written.
- **implement**: Phase 6.5 skipped when Phase 2.3 already created an issue.
- README fully updated: all five skills and slash commands documented, design principles corrected.

## [0.5.3] — 2026-05-05

### Docs

- **implement**: added implement skill and slash command to README.

## [0.5.2] — 2026-05-05

### Fixed

- **implement**: Phase 2.3 — before story approval, ask user if they want to create a linked GitHub Issue (using `gh-issue` skill, which also handles GitHub Project assignment interactively).
- **implement**: Phase 6.5 now skipped when Phase 2.3 already created an issue.

## [0.5.1] — 2026-05-05

### Fixed

- **implement**: Phase 2.5 story review gate — asks user to approve the story before any implementation begins.

## [0.5.0] — 2026-05-05

### Added

- **gh-issue**: new skill that creates a single GitHub Issue from free-text intent or a `--story <path>` reference, with optional add to a GitHub Project (`--project <N>` flag, or interactive opt-in at confirmation). Project-agnostic — pairs with `ck-code:to-issues` for batch flows.
- **implement**: new opt-in Phase 6.5 that asks one yes/no question after the manual review gate to optionally invoke `gh-issue` with the accepted STORY.md. Default is No; silent issue creation is never performed.

## [0.4.0] — 2026-05-05

### Added

- **deliver**: project-agnostic skill for committing changes and optionally opening a pull request on any git repo. Supports selective staging, conventional-commit message crafting, optional push, and optional PR with destination prompt. Hard rule against AI references in any commit, PR, or branch name.

## [0.3.0] — 2026-05-05

### Added

- **implement**: on-the-go feature/fix/refactor implementation skill with TDD gate.
- **qa-validator**: reusable QA validation agent.

## [0.2.1] — 2026-04-29

### Added

- **release-prep**: Phase 8 — interactive release PR creation via `gh pr create`. PR body includes the changelog section, a collapsible file diff stat, and the full list of included PRs/commits. Falls back to a copy-paste command when `gh` is not authenticated.
- **release-prep**: Phase 1 now captures `DIFF_STAT` and `DIFF_NAME_STATUS` via `git diff` (three-dot range, matching GitHub's PR diff view) as supplementary reference alongside commits.

### Changed

- **release-prep**: Phase 3 cross-references `DIFF_NAME_STATUS` to flag file-level changes not described in any commit, and uses it as ground truth for the "no public API file changed" heuristic.
- ~150 tokens trimmed across `SKILL.md`, `workflow.md`, and `templates.md` with no loss of meaning.

## [0.2.0] — 2026-04-29

### Added

- **release-prep**: new skill `/ck-tools:release-prep` — prepares a production release end-to-end given a source and target branch. Diffs branches, classifies changes for semver, writes changelog in Keep a Changelog format, bumps version file, prints annotated `git tag` command, and emits a deployment announcement. Supports `--lang`, `--bump`, `--prerelease`, `--dry-run`. Re-callable and idempotent.

## [0.1.1] — 2026-04-29

### Changed

- Distribution: `ck-tools` is now distributed exclusively through `ck-marketplace` (the same marketplace as `ck-code`). Removed standalone `.claude-plugin/marketplace.json`.

## [0.1.0] — 2026-04-29

### Added

- **dependency-upgrade**: phased, snapshot-tracked dependency upgrade. Each upgrade lives in a self-contained dated cycle folder (`docs/dependency-upgrade/<YYYY-MM-DD>/`). Phases: foundation → security CVEs → minors/safe majors → framework majors → deferred majors. Snapshots captured before and after every phase. Resumable. Detects npm/yarn/pnpm.
