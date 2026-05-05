# Detection Tables

Lookup tables used by the `implement` skill in Phase 1 (context gathering + skill detection) and Phase 4 (regression + lint). All checks are filesystem-only — no network calls, no expensive scans.

---

## 1. Project Type → Manifest

Detect the project type from manifest files at the repo root. **Stop at first hit**; do not deep-scan subdirectories.

| Manifest | Project type | Test command | Lint / typecheck commands (if config present) |
|---|---|---|---|
| `go.mod` | `go` | `go test ./...` | `golangci-lint run` (if `.golangci.yml`); `go vet ./...` |
| `package.json` (with `"test"` script) | `node` | `npm test` (or `pnpm test` / `yarn test` if matching lockfile) | `npx tsc --noEmit` (if `tsconfig.json`); `npx eslint .` (if `.eslintrc*` / `eslint.config.*`) |
| `pyproject.toml` (mentions `pytest`) | `python` | `pytest` | `ruff check .` (if `ruff` config); `mypy .` (if `mypy.ini` / `[tool.mypy]`) |
| `pyproject.toml` (no pytest mention) | `python` | `python -m unittest discover` | same lint/typecheck row as above |
| `Cargo.toml` | `rust` | `cargo test` | `cargo clippy --all-targets` |
| `pom.xml` | `java` | `mvn test` | (skip — slow) |
| `build.gradle` / `build.gradle.kts` | `java` | `./gradlew test` | (skip — slow) |
| `composer.json` (with phpunit) | `php` | `vendor/bin/phpunit` | (skip) |
| (none of the above) | `unknown` | — | — |

**Lockfile→package-manager hints (node only):**
- `pnpm-lock.yaml` present → `pnpm test`
- `yarn.lock` present → `yarn test`
- `package-lock.json` only → `npm test`

If multiple manifests are present (e.g., a polyrepo), run only the one whose subtree contains the touched files.

---

## 2. Skill Detection Patterns

Run once per invocation:

```bash
find .claude/skills -maxdepth 4 -type f -name "SKILL.md" 2>/dev/null
```

If the command finds zero results (the most common case), proceed silently — do **not** warn the user. Most projects do not use ck-code's skill system.

If results are found, match each candidate skill name against the work being done:

| Skill name pattern | Load when |
|---|---|
| `expert-frontend` | Files to Touch include `client/`, `ui/`, `components/`, `screens/`, `mobile/`, `app/`, `*.tsx`, `*.jsx`, `*.vue`, `*.svelte` |
| `expert-backend` | Files to Touch include `server/`, `api/`, `backend/`, `services/`, `*.sql`, migrations |
| `expert-devops` | Files to Touch include `docker/`, `.github/`, `ci/`, `deploy/`, `Dockerfile`, `*.yml` workflows |
| `expert-qa` | Mode is FIX, or Files to Touch include `*test*`, `*spec*`, `__tests__/` |
| `guide-rust` | `*.rs` |
| `guide-go` | `*.go` |
| `guide-typescript` | `*.ts`, `*.tsx` |
| `guide-python` | `*.py` |
| `guide-java` | `*.java`, `*.kt` |
| `guide-cpp` | `*.cpp`, `*.h`, `*.hpp` |
| `guide-react-native` | `*.tsx` inside `mobile/` |

Load each matched skill via the `Skill` tool. On error, fall back to `Read` of the SKILL.md path.

**Never** load a skill not present in the `find` output — no inference from training data.

---

## 3. Library Detection (for context7)

Trigger context7 lookup **only** when the user prompt names an external library or framework, or when Phase 1 Grep reveals an import statement for one.

Procedure:
1. Resolve library: `mcp__context7__resolve-library-id` (or `mcp__plugin_context7_context7__resolve-library-id` if the plugin variant is registered) with the library name.
2. Query docs: `mcp__context7__query-docs` (or plugin variant) with the resolved ID and a focused topic (e.g., "useEffect cleanup", "GORM associations", "axum middleware").
3. Cap at 2 library lookups per invocation. If a third is needed, ask the user.

Skip context7 entirely for:
- Pure refactors with no API surface change
- Internal helpers (no external dependency in the touched files)
- Standard-library calls (`fmt`, `os`, `std::`, built-ins)

---

## 4. Weak-Code Heuristics (used by `qa-validator`)

Grep patterns to surface during QA. Top 5 by severity only.

| Pattern | Severity | Rationale |
|---|---|---|
| Hard-coded credentials (`password\s*=`, `api_key\s*=`, `Bearer [A-Za-z0-9]`) | critical | Secret leak |
| `panic(`, `.unwrap()`, `unimplemented!()` in non-test code | high | Unhandled error path in production |
| Empty catch / except blocks (`catch\s*\([^)]*\)\s*\{\s*\}`, `except.*:\s*pass`) | high | Swallowed errors |
| `TODO`, `FIXME`, `XXX` in newly written code | medium | Incomplete work shipped |
| `console.log`, `println!`, `print(` in non-CLI source | low | Debug leftover |

Patterns are advisory — surface as `## Deferred Follow-ups` in STORY.md, not as auto-fail unless severity is `critical`.
