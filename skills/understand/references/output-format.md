# Output Format

## Template (normal depth)

Headings are translated into the answer language; the shape stays the same.

```markdown
## <Subject, named plainly>

**TL;DR** — <1–3 sentences>

### Map
<table or small ASCII diagram of the parts and how they connect>

### Step by step
1. **<Step title>** — <what happens and why> (`src/orders/create.ts:12`)
2. **<Step title>** — …

### Watch out
- <non-obvious behaviour, trap, gap or contradiction, with its reference>

### Check yourself
1. <question>
2. <question>

### Go further
- <what to read or try next>
- Ask: `step 2` · `simpler` · `example` · `diagram`
```

Examples of translated headings — French: **En bref**, **Vue d'ensemble**, **Étape par
étape**, **Points d'attention**, **Vérifie ta compréhension**, **Pour aller plus loin**.
English uses the headings above.

## Depth levels

| Level | Sections | Typical length |
|---|---|---|
| `--quick` | TL;DR, Map, top 1–3 Watch out | ≤ 15 lines |
| normal | all six | one screen to two; long subjects split with `next` |
| `--deep` | all six, steps expanded with internals, alternatives considered, history from `git log`/blame, edge cases | as long as it needs, delivered a part at a time |

## Writing rules

- One idea per step; a step longer than ~5 lines is two steps.
- Define each term the first time it appears, in a short clause, not a footnote.
- Prefer a concrete value over an abstract one: "`total` becomes `1999` (cents)" beats
  "the total is computed".
- Code excerpts only where the exact line matters, ≤ 10 lines each; otherwise a
  `file:line` reference is enough.
- Diagrams: plain ASCII boxes and arrows that render in a terminal; no Mermaid unless the
  user asks.
- `simpler` re-explains with an everyday analogy and no jargon, then maps the analogy back
  to the real names in one line each.
- Address the reader directly and keep the tone encouraging; never condescending.
