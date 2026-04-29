# release-prep — Templates

Three fill-in-the-blank artifacts. Substitute `<TOKENS>` at render time.

1. Keep-a-Changelog scaffold (when `CHANGELOG.md` is missing).
2. New-release-section template (inserted into existing `CHANGELOG.md`).
3. Announcement template (English chrome + French chrome). Bullet bodies
   stay in their authored language.

---

## §1 KEEP-A-CHANGELOG SCAFFOLD

Used only when no changelog exists and the user opted in. Today's date is
read from the runtime context (`# currentDate` in CLAUDE.md).

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

[Unreleased]: <COMPARE_BASE>/compare/<PREV_TAG>...HEAD
```

`<COMPARE_BASE>` is the host-aware compare URL prefix:
- GitHub: `https://github.com/<owner>/<repo>`
- GitLab: `https://gitlab.com/<owner>/<repo>/-`
- Bitbucket: `https://bitbucket.org/<owner>/<repo>/branches`
- Other: omit the footer line and let the user fill it in.

If there is no previous tag, replace the footer line with:
```
[Unreleased]: <COMPARE_BASE>
```

---

## §2 NEW-RELEASE-SECTION TEMPLATE

Inserted directly below `## [Unreleased]`. Sub-sections are emitted only
when they contain entries.

```markdown
## [<NEW_VERSION>] - <YYYY-MM-DD>

### Breaking changes
- <plain-language line>. ([#<PR>](<PR_URL>))

### Added
- <plain-language line>. ([#<PR>](<PR_URL>))

### Changed
- <plain-language line>. ([#<PR>](<PR_URL>))

### Fixed
- <plain-language line>. ([#<PR>](<PR_URL>))

### Security
- <plain-language line>. ([#<PR>](<PR_URL>))

### Internal
- <plain-language line>. ([#<PR>](<PR_URL>))
```

**PR-link rules.**
- For each public bullet, append exactly one PR link in the form
  `([#<N>](<URL>))`. Multiple PRs in a single bullet are joined with
  commas: `([#12](…), [#15](…))`.
- For commits with no PR (degraded / commit-only mode), append the short
  hash instead: `([\`abc1234\`](<COMPARE_BASE>/commit/abc1234))` on hosts
  that support it; bare `(\`abc1234\`)` otherwise.
- For linked issues that explain the *why* of a change, the rendered line
  may include a parenthetical issue link in addition to the PR link.

**Compare-link footers.** Maintain a sorted list at the bottom of the
file. After inserting `<NEW_VERSION>`, the footer block looks like:

```
[Unreleased]: <COMPARE_BASE>/compare/v<NEW>...HEAD
[<NEW>]:      <COMPARE_BASE>/compare/v<PREV>...v<NEW>
[<PREV>]:     <COMPARE_BASE>/compare/v<PREV-1>...v<PREV>
```

For the very first release (no previous tag), replace the `[<NEW>]` line
with `[<NEW>]: <COMPARE_BASE>/releases/tag/v<NEW>`.

---

## §3 ANNOUNCEMENT TEMPLATE

The announcement is a copy-paste block, fenced as plain text. Sections
with no entries are omitted entirely. The bullet bodies are reused
verbatim from the changelog section's plain-language lines (PR links and
trailing punctuation stripped).

### English chrome (default)

```
*<REPO_NAME> v<NEW> is going live*

What's new:
- <feature line 1>
- <feature line 2>

Fixes:
- <fix line 1>

Breaking changes:
- <breaking line 1>  ⚠ Action required: <one-liner>

Compare: <COMPARE_BASE>/compare/v<PREV>...v<NEW>
Full notes: <COMPARE_BASE>/blob/<TARGET_BRANCH>/CHANGELOG.md#<ANCHOR>
```

### French chrome

```
*<REPO_NAME> v<NEW> est en ligne*

Nouveautés :
- <feature line 1>
- <feature line 2>

Corrections :
- <fix line 1>

Changements incompatibles :
- <breaking line 1>  ⚠ Action requise : <one-liner>

Comparer : <COMPARE_BASE>/compare/v<PREV>...v<NEW>
Notes complètes : <COMPARE_BASE>/blob/<TARGET_BRANCH>/CHANGELOG.md#<ANCHOR>
```

### Other languages

For any `--lang=<code>` other than `en` or `fr`, render the English
skeleton and translate **only the chrome** (headings, labels, "Action
required") inline at runtime. Bullet bodies are not translated unless the
user explicitly opts in mid-flow with a confirmation. This keeps release
notes accurate (translation drift is a quality risk).

### Anchor convention

`<ANCHOR>` is the GitHub-style heading slug for the new section, e.g.
`## [1.4.0] - 2026-04-29` -> `#140---2026-04-29`. Generate it by
lowercasing the heading, dropping non-alphanumerics except `-`, and
collapsing runs of `-`.

### Internal-only releases

When the only changes are internal (no Breaking/Added/Changed/Fixed
entries), the announcement is replaced with a single short line:

```
*<REPO_NAME> v<NEW>* — internal release. No user-facing changes.
```

(French: `*<REPO_NAME> v<NEW>* — version interne. Aucun changement visible.`)
