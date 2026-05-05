# PR Templates

PR title is the same as the commit subject line (≤ 70 chars).
Never add AI references in the title or body.

## Generic PR Body

```markdown
## Summary
- [One-line description of the change]
- [Optional: link to ticket / issue / story]

## Changes
- [Key change 1]
- [Key change 2]
- [Key change 3]

## Testing
- [How was this tested — automated tests, manual steps, etc.]
- [Any tests added or modified]

[If linked to an issue:]
Closes #[issue_number]
```

## Bug Fix PR Body

```markdown
## Summary
- Fixes [bug description]
- Root cause: [one-line explanation]

## Changes
- [What was fixed]
- Added regression test: [test name]

## Testing
- Reproduction test now passes
- No regressions detected

Closes #[issue_number]
```

## Breaking Change PR Body

```markdown
## Summary
- [What changed]
- **BREAKING:** [What downstream callers must change]

## Migration
- [Step-by-step migration instructions]

## Changes
- [Key change 1]
- [Key change 2]

## Testing
- [How was this validated]
```

## gh pr create Command

```bash
gh pr create \
  --title "[commit subject line]" \
  --base [target-branch] \
  --body "$(cat <<'EOF'
[PR body from template above]
EOF
)"
```

Common target branches:
- `main` (or `master` on older repos) — default
- `develop` — gitflow projects
- `release/*`, `staging` — release-train projects

## After PR Creation

Print:
```
## PR Created

**URL:** [PR URL]
**Title:** [title]
**Target:** [base branch]
**Linked issues:** #[numbers, if any]
```

## Fallback When `gh` Is Unavailable

If `gh` is missing or unauthenticated, push the branch and print the
manual compare URL so the user can open the PR in their browser:

```
https://github.com/<owner>/<repo>/compare/<base-branch>...<head-branch>?expand=1
```

Derive `<owner>/<repo>` from `git remote get-url origin`.
