# Commit Message Examples

## Conventional Commit Format

```
<type>(<optional-scope>): <imperative summary, ≤70 chars>

<body — explains WHAT changed and WHY, not HOW; wrap at 72 chars>

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
feat(auth): add OAuth2 callback handler

Wire the OAuth2 callback route to exchange the authorization code for a
session token and persist it via SessionStore.

- Added /auth/callback handler
- Added token exchange via OAuthClient.exchange()
- Added integration test for the happy path

Closes #142
```

## Example: Bug Fix

```
fix(api): handle null user in profile lookup

ProfileService.lookup() threw NullPointerException when the request
authenticated user existed but had no associated profile row.

- Added null guard in ProfileService.lookup()
- Added regression test: testLookupWithoutProfile

Closes #88
```

## Example: Refactor

```
refactor(db): extract query builder from repository

Move SQL construction out of UserRepository into a dedicated QueryBuilder
to enable reuse from the OrderRepository and simplify upcoming pagination
work. Behaviour unchanged; covered by existing tests.
```

## Example: Chore

```
chore(deps): bump axios from 1.6.2 to 1.7.4

Patch security advisory CVE-2024-XXXXX. No API changes.
```

## Multi-line HEREDOC Pattern

For any commit message with a body, use HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add OAuth2 callback handler

Wire the OAuth2 callback route to exchange the authorization code for a
session token and persist it via SessionStore.

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

- Wrap at 72 characters
- Explain WHAT changed and WHY — never HOW (the diff shows how)
- Blank line between subject and body
- Bullet lists are fine for multiple discrete changes

## Footer Rules

- `Closes #N` or `Fixes #N` for issue auto-close on merge
- `BREAKING CHANGE: <description>` for breaking changes
- Never add `Co-Authored-By: Claude` or any AI provenance trailer
