# Triage and Chunking

## Tiers

| Tier | Files | Shown as |
|---|---|---|
| **Read closely** | business logic, state, data access, auth/permissions, money, concurrency, migrations and schema, public API and contracts, config that changes runtime behaviour, error handling, anything touching secrets or user input | full hunks, explained |
| **Skim** | tests, UI markup and styles, simple wiring (route/DI registration, exports, re-exports), docs, logging, type-only changes, small renames | per-file summary + only the hunks that break the pattern |
| **Skip** | lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `Cargo.lock`, `poetry.lock`, `go.sum`, …), generated code (header says generated, `*.g.dart`, `*.pb.go`, `dist/`, `build/`), snapshots (`__snapshots__/`, `*.snap`), vendored code, binary assets, pure renames with no content change (`git diff --summary` shows `rename … (100%)`), whitespace-only changes (`git diff -w --numstat` shows 0/0) | counted on the map only |

**Promotion rule.** A Skim or Skip file is promoted to Read closely when it shows something
outside its expected shape: a test that was deleted or had an assertion weakened, a lockfile
adding a top-level dependency not declared in the manifest diff, a generated file whose
generator input did not change, a config change that disables a check (lint rule off,
`skip`, `--no-verify`, a lowered coverage threshold).

**Tests are skimmed, not skipped.** A reviewer still needs to see *what* is tested. In the
skim summary list the test names added, changed and removed, and flag any production chunk
with no test touching it.

## Risk flags

Attach to the file or hunk, shown in the map's Risk column and turned into "Check" items:

| Flag | Trigger | Check item it produces |
|---|---|---|
| `migration` | schema or data migration | reversible? data loss? locks a big table? |
| `auth` | permission checks, sessions, tokens | every new path checked? any check removed? |
| `input` | parsing request bodies, query params, files, shell/SQL building | validated, escaped, parameterised? |
| `money` | prices, totals, currency, rounding | integer/decimal math, rounding direction |
| `concurrency` | locks, async, queues, retries, caches | races, double processing, stale reads |
| `deleted-test` | a test or assertion removed | why — behaviour removed or test inconvenient? |
| `public-api` | exported signature, endpoint, event or schema change | breaking for callers? versioned? |
| `error-path` | new catch/except, swallowed errors, fallbacks | errors surfaced or silently eaten? |
| `secrets` | keys, tokens, env names in code | nothing real committed |
| `dependency` | new or bumped dependency | needed? maintained? license? |
| `large-hunk` | one hunk > 150 changed lines | split the reading; often a rewrite worth reading as new code |

## Chunk ordering

Read in the order data flows, so each step only depends on steps already read:

1. Schema, migrations, data model, types and contracts
2. Core domain logic and pure functions
3. Data access, services, integrations
4. API, handlers, controllers, CLI commands
5. UI, presentation
6. Wiring and config
7. Tests (Skim) — or each chunk's tests merged into it when they are small
8. Docs (Skim)

Within a layer, follow the import graph: a file before the files that import it. When the
PR is organised by feature rather than layer (several independent features), make one
group per feature first, then apply this order inside each group, and say so on the map.

## Chunk size

- Target **150–300 changed lines** per Read-closely chunk; up to ~600 for a Skim chunk.
- **One concern per chunk** — never mix two features to hit the size target.
- A single file larger than the target becomes its own chunk, split by top-level symbol
  (class, function, section) when it exceeds ~400 lines.
- Keep a file's production code and its own small test in the same chunk when together
  they fit the target — reading the test right after the code is the fastest check.
- Aim for **≤ 12 steps**. When the plan needs more, say the PR is too big to review well,
  name the natural split points (they are usually the feature groups), and still offer the
  walkthrough.

## Time estimate

~400 lines/hour for Read closely, ~1,500 lines/hour for Skim, Skip is free. Round to 5
minutes. Show it so the reviewer can plan sessions; suggest a pause around every 60 minutes.
