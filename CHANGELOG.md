# Changelog

All notable changes to ck-tools are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
