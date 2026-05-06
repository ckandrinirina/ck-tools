# Commit Message Examples

Subject line stays in conventional-commit format for changelog and CI
tooling. The body is plain language readable by non-engineers — describe
what users can now do, see, or notice. No class names, file paths, or
test method names.

## Conventional Commit Format

```
<type>(<optional-scope>): <imperative summary, ≤70 chars>

<body — plain-language outcome for users; wrap at 72 chars>

<optional footer: Closes #123, BREAKING CHANGE: ...>
```

## Types

| Type | When to use |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Code restructure, no behaviour change |
| `test` | Add or modify tests only |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, repo housekeeping |
| `style` | Formatting, whitespace, no logic change |
| `perf` | Performance improvement |
| `build` | Build system or external dependencies |
| `ci` | CI configuration |

## Example: Feature

```
feat(auth): sign in with a Google account

Users can now sign in using their existing Google account instead of
creating a new password. The option appears on the sign-in screen
alongside the email and password fields.

Closes #142
```

## Example: Bug Fix

```
fix(profile): no more crash on empty profile

Profile pages crashed for users who hadn't filled in their profile yet.
Visiting the page now shows the empty profile placeholder instead of an
error.

Closes #88
```

## Example: Refactor

```
refactor(db): consolidate query handling

Restructures how database queries are organised so the same approach can
be reused by upcoming features. Behaviour is unchanged for end users.
```

## Example: Chore

```
chore(deps): security patch for a network library

Picks up a security patch for one of the libraries the app uses to talk
to external services. No user-visible changes.
```

## Multi-line HEREDOC Pattern

For any commit message with a body, use HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): sign in with a Google account

Users can now sign in using their existing Google account instead of
creating a new password.

Closes #142
EOF
)"
```

## Subject Line Rules

- ≤ 70 characters (hard limit)
- Imperative mood: "add X" not "adds X" or "added X"
- No trailing period
- Lowercase after the colon (unless project convention differs)

## Body Rules

- Plain-language outcome a non-engineer can read
- Wrap at 72 characters
- Blank line between subject and body
- Bullet lists are fine for multiple discrete changes
- Never include: story IDs, epic names, AC checklists, test-count tallies,
  class/function names, file paths, internal tool names

## Footer Rules

- `Closes #N` or `Fixes #N` for issue auto-close on merge
- `BREAKING CHANGE: <description>` for breaking changes
- Never add `Co-Authored-By: Claude` or any AI provenance trailer
