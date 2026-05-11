# SOLID Templates

Templates used by the `implement` skill at Phase 3 (design) and Phase 4 (review). Each principle gets one short line per pass. For trivial changes (typo, single-line rename, comment edit), both passes are skipped — see §3.

---

## 1. SOLID Design Template (Phase 3 — before writing code)

Append this block to STORY.md once when entering Phase 3, then fill each line in place. Keep entries to **one line per principle**. `N/A` is acceptable when a principle does not apply (e.g., no new types → L is N/A).

```markdown

## SOLID Design

**S — Single Responsibility:** <one line: each new file/class and its ONE responsibility>
**O — Open/Closed:** <one line: extension point added, or "N/A — internal helper">
**L — Liskov Substitution:** <one line: new subtype contract, or "N/A — no new types">
**I — Interface Segregation:** <one line: interface kept focused, or "N/A — no interface">
**D — Dependency Inversion:** <one line: injection point, or "N/A — no external deps">
```

**Format rules:**
- One line per principle. No paragraphs, no sub-bullets.
- `N/A — <reason>` is mandatory when a principle does not apply — never omit the line.
- Re-edit lines in place if the design changes during Phase 3; do not append a second SOLID Design block.

---

## 2. SOLID Compliance Check Template (Phase 4 — during refactor pass)

Re-read the diff against the Phase 3 SOLID Design. For each principle, mark `[x]` (compliant) or `[ ] ISSUE:` (violation + fix). Record violations as items to address in the refactor pass.

```
S — Single Responsibility:
  [x] Each function does one thing
  [ ] ISSUE: <function X> handles both <A> and <B> → split

O — Open/Closed:
  [x] Extended via abstractions, not modification

L — Liskov Substitution:
  [x] Subtypes are substitutable

I — Interface Segregation:
  [x] No fat interfaces

D — Dependency Inversion:
  [x] Depends on abstractions
  [ ] ISSUE: <module X> directly instantiates <concrete Y> → inject
```

This check is **inline** — it does not write a section to STORY.md. Any violation surfaced here becomes a targeted refactor in Phase 4 step 4. After the refactor, re-run tests; tests must stay green.

---

## 3. When to Skip Both Passes

Skip the SOLID Design (Phase 3) and the SOLID Compliance Check (Phase 4) only for **trivial changes**:

| Change type | Skip? |
|---|---|
| Typo fix | yes |
| Single-line rename (no logic change) | yes |
| Comment-only edit | yes |
| Single-line value tweak (constant, threshold) | yes |
| New function or method | **no** |
| New file or class | **no** |
| Bug fix with non-trivial logic change | **no** |
| Refactor that moves code between files | **no** |
| Any change adding a dependency or import | **no** |

If unsure, do **not** skip. The on-the-go nature of `implement` is about minimal diff, not minimal rigor.

---

## 4. Common Refactorings (Phase 4 step 4)

When a SOLID Compliance Check surfaces an issue, the fix is usually one of these:

| Violation | Refactoring |
|---|---|
| Function does two things | Extract a second function; each does one |
| Class has two reasons to change | Split into two types |
| Concrete dependency hard-coded | Introduce interface/trait; inject the concrete at call site |
| Fat interface with unused methods | Split interface; clients depend on the slice they use |
| `if`/`switch` on type tag | Replace with polymorphism (subtype dispatch) |
| Duplicate logic in two files | Extract shared helper into the correct module |
| Subtype breaks parent contract | Either fix the subtype or remove the inheritance |

Apply the refactoring → re-run tests → confirm green. If a refactor breaks tests, revert and reconsider — the test is the contract, not the refactor.
