# gh-issue Templates & Label Conventions

Bulky reference content for the `gh-issue` skill: issue body templates,
label-suggestion table, and story-file parsing rules.

---

## Issue body templates

### Generic body (no story file)

Use when the user provides only a title or short description.

```markdown
## Intent
<one-paragraph description of what this issue is for>

## Context
<optional bullets — why this matters, what triggered it>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## References
<optional — links to related issues, PRs, docs, or design notes>
```

If the user did not supply Acceptance Criteria, omit the section entirely
rather than leaving it empty. Do not invent criteria.

---

### Story-driven body (`--story <path>`)

Use when a story file is supplied. Map fields directly:

```markdown
## Description
<body of story file up to the first H2>

## Acceptance Criteria
<entire `## Acceptance Criteria` section, preserved as-is>

## Files Touched
<entire `## Files Touched` section, if present in the story file>

## Source Story
`<relative path to the story file from the repo root>`
```

**Mapping rules:**
- Preserve every `- [ ]` checkbox state from the story (do not flip to `- [x]`
  here — the issue is the *plan*, not the *result*).
- Strip any `> **Status:**`, `> **Mode:**`, `> **Created:**` blockquotes; they
  belong in the story file, not the issue.
- Drop any `## Implementation Summary` section — that is post-completion data.

---

## Label-suggestion table (Mode → label)

When `--story <path>` provides a Mode, suggest one label. Apply only after
verifying the label already exists in the repo.

| Story Mode | Suggested label | Suggested fallback label |
|---|---|---|
| `FEATURE`  | `enhancement` | `feat` |
| `FIX`      | `bug`         | `fix`  |
| `REFACTOR` | `refactor`    | `chore` |

If neither the suggested label nor its fallback exists in the repo, do not
apply any label — ask the user once whether they want to create the label or
proceed unlabelled.

Listing existing labels:
```bash
gh label list --limit 100 --json name -q '.[].name'
```

---

## Title formatting

| Source | Title format |
|---|---|
| Story file with ID heading (`# Story 02-05: <Title>`) | `[02-05] <Title>` |
| Story file without ID (`# Story: <Title>`)            | `<Title>` |
| Free-text positional argument                          | `<argument, truncated to 70 chars>` |
| Empty input                                            | (ask the user)            |

Hard cap: 70 characters. Truncate at the last word boundary that fits.

---

## Story-file parsing rules

The `gh-issue` skill recognises both ck-code and ck-tools story formats.

| Section in story file       | Maps to            |
|------------------------------|--------------------|
| `# Story <ID>: <Title>`      | Issue title (with `[ID]` prefix) |
| `# Story: <Title>`           | Issue title (no prefix) |
| Body up to first H2          | `## Description` |
| `## Acceptance Criteria`     | `## Acceptance Criteria` (verbatim) |
| `## Files Touched`           | `## Files Touched` (verbatim) |
| `## Implementation Plan`     | (skipped — internal) |
| `## Implementation Summary`  | (skipped — post-completion) |
| `## Deferred Follow-ups`     | (skipped — append after issue creation if needed) |
| `> **Mode:** <X>`            | Used for Mode → label suggestion only |
| `> **Status:** <X>`          | (skipped — issue tracking handles state) |

If the story file's encoding is not UTF-8 or if it cannot be parsed as
markdown, fall back to Phase 1.2 (title-driven) and ask the user for the body.

---

## `gh project item-add` reference

```bash
gh project item-add <project-number> --owner @me --url <issue-url>
```

| Flag | Notes |
|---|---|
| `<project-number>` | Number from `gh project list --owner @me`, NOT the project node ID. |
| `--owner @me`      | Use `@me` for personal projects; org projects use `--owner <org>`. |
| `--url`            | Full issue URL (preferred over `--issue-id` since it works across owners). |

If the project lives under an organisation, ask the user once for the org
slug before issuing the command. Never assume `@me` for unfamiliar repos.
