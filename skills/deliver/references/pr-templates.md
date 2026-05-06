# PR Templates

PR title is the same as the commit subject line (≤ 70 chars).
Never add AI references in the title or body.

These bodies are read by PMs, designers, and stakeholders — not just
engineers. Write them in plain language: describe what users can now do
or notice, not which classes changed or how many tests pass.

## Generic PR Body

```markdown
## What's new
<1–3 sentences in plain language. What users can now do, see, or notice
once this ships.>

## Changes
- <Plain-language bullet — a user-visible outcome>
- <Plain-language bullet>
- <Plain-language bullet>

## Notes
- <Constraint, follow-up, or out-of-scope item — only if useful>

[If linked to an issue:]
Closes #<issue_number>
```

The **Notes** section is optional. Drop it if there's nothing to flag.

## Bug Fix PR Body

```markdown
## What's fixed
<Plain-language description of the user-visible problem and how the app
behaves now.>

## Impact
- <Who was affected and what they'll now experience>

Closes #<issue_number>
```

## Breaking Change PR Body

```markdown
## What's changing
<Plain-language description of what's different and what users will see.>

## What teams using this need to do
- <Step 1 in plain language — what to update>
- <Step 2 in plain language>

## Notes
- <Optional caveats, deprecation timeline, fallback behaviour>
```

## gh pr create Command

```bash
gh pr create \
  --title "<commit subject line>" \
  --base <target-branch> \
  --body "$(cat <<'EOF'
<PR body from a template above>
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

**URL:** <PR URL>
**Title:** <title>
**Target:** <base branch>
**Linked issues:** #<numbers, if any>
```

## Fallback When `gh` Is Unavailable

If `gh` is missing or unauthenticated, push the branch and print the
manual compare URL so the user can open the PR in their browser:

```
https://github.com/<owner>/<repo>/compare/<base-branch>...<head-branch>?expand=1
```

Derive `<owner>/<repo>` from `git remote get-url origin`.

## Things to avoid in the PR body

- Story IDs, epic names, internal ticket prefixes
- File paths (`apps/backend/src/...`)
- Class names, function names, test method names
- Acceptance-criteria checkbox lists
- Test-count tallies (`12 tests passing`, `all tests passing`)
- Internal tool / plugin names

## Things to include

- A plain-language **What's new** / **What's fixed** / **What's changing** lead
- A short bullet list of user-visible outcomes
- An optional **Notes** subsection for constraints, follow-ups, scope cuts
- A `Closes #N` footer when an issue is linked
