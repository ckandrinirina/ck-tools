# RTK — token-optimized command output

[RTK](https://github.com/ckandrinirina/rtk) is an optional CLI proxy that filters command
output before it reaches context — a full test suite comes back as its failing cases alone,
a `git status` as a compact summary.

ck-tools never requires it. Every command in every skill works without it; the plugin's
only obligation is to write command forms RTK's hook recognizes.

## Install

```bash
rtk init      # registers a PreToolUse hook on Bash in ~/.claude/settings.json
rtk gain      # tokens saved so far
```

If `rtk gain` errors, a different tool named `rtk` (reachingforthejack/rtk, "Rust Type
Kit") is shadowing it on `PATH`.

## The hook does the rewriting — never write `rtk` yourself

The hook rewrites the command on its way to the shell: a skill writes `npm run test`, the
shell runs `rtk test`, the model sees only failures. A hardcoded `rtk` in a skill would
break every user who has not installed it (`rtk: command not found`).

## Command forms that matter

| Write this | Not this | Why |
|---|---|---|
| `npm run test`, `pnpm run test` | `npm test`, `pnpm test` | exact aliases, but only the long form is rewritten |
| `npm run build`, `pnpm run build` | `pnpm build` | same |
| a bare command | `npm run test \| tail -20` | a command feeding a pipe is left unfiltered, and RTK already returns failures only |

Recognized as already written in [detection.md](../skills/implement/references/detection.md):
`cargo test`, `cargo clippy`, `pytest`, `go test ./...`, `go vet ./...`,
`vendor/bin/phpunit`, `ruff check .`, `npx tsc --noEmit`, `npx eslint .`, and every `git`
and `gh` command.

Not recognized, and not fixable by phrasing: `yarn test` (RTK has no yarn filter),
`python -m unittest discover`, `mvn test`, `./gradlew test`, `npm install` / `npm ci`.

`&&` chains are fine — the hook rewrites each matchable segment, so
`cd <site-dir> && npm install && npm run build` still filters the build. Only pipes opt out.

Check any command with `rtk hook check "<command>"`.

## Where ck-tools gains the most

| Skill | Command | Why it matters |
|---|---|---|
| `implement` Phase 4 | the project's test + lint + typecheck | run on every regression pass, and repeated per fix iteration |
| `deliver` | `git status`, `git diff`, `gh pr create` | many small calls whose boilerplate dominates their signal |
| `dependency-upgrade` | build + test per phase | the largest repeated output in the plugin |
| `release-prep` | `git log`, `gh release` | changelog assembly reads a lot of history |
| `showcase` | `npm install && npm run build` | a framework build is verbose and says almost nothing on success |

## Rules

- **Never write an `rtk` prefix** into a skill or reference command — the hook does it, and
  a hardcoded prefix breaks every user without RTK.
- **Always write `<runner> run <script>`** — `npm run test`, never `npm test`.
- **Never pipe a stack command** — the piped command is skipped. `&&` chains are fine.
- **Never make RTK a prerequisite** — no skill blocks, warns, or changes behaviour without it.
