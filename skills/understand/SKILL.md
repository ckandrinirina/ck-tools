---
name: understand
description: Use when the user wants to understand something quickly and clearly — code (a file, function or whole codebase), a spec or doc, a diff or PR, an error, a config, a command or a technical concept — or asks "explain", "what does this do", "how does this work", "walk me through", "I don't get it", "explique-moi", "c'est quoi", "comment ça marche". Answers in the user's language. Argument is an optional path, URL, PR, pasted text or question, plus `--quick`, `--deep` or `--lang fr|en`.
argument-hint: "[path | URL | PR# | question] [--quick | --deep] [--lang fr|en]"
effort: medium
---

# Understand — Explain Anything, Step by Step

Explains code, specs, diffs, errors and concepts as a clean guide: the answer first, then a
map, then a numbered walkthrough a reader can follow at their own pace. Read-only — it
never edits the thing it explains.

References:
- `references/subject-playbooks.md` — what to read and which walkthrough shape to use per subject type
- `references/output-format.md` — the guide template, depth levels, language rules

## INPUT

`$ARGUMENTS` is the subject and options:
- a path (file, folder, `.`), a symbol name, a URL, a PR number or URL, a commit or range,
  pasted text (spec, error, log, config), or a free question;
- `--quick` (TL;DR + key points only), `--deep` (adds internals, edge cases, history),
  default is normal depth;
- `--lang <code>` forces the answer language.

Empty → use the current conversation: the last file, error or diff discussed. If nothing
is in play, ask one question: **what do you want to understand?**

## PHASE 1: IDENTIFY

### 1.1 Language

Answer in the language the user writes in — French if they write French, English if
English, any other likewise; `--lang` overrides. Mixed message → the language of the
question part. Keep code, identifiers, commands and quoted errors verbatim, never translated.

### 1.2 Subject type and reader goal

Classify the subject into one type of `references/subject-playbooks.md` (code-unit,
codebase, spec, diff, error, config, command, concept). Infer the reader's goal from the
wording — *use it*, *change it*, *review it*, *debug it*, *decide on it*, *learn it* — and
let it decide what the walkthrough stresses. Ask only when the subject itself is ambiguous
(two files of that name, a symbol defined in several places); never ask about depth or
language.

## PHASE 2: GATHER

Follow the subject's playbook. Read the minimum that makes the explanation true:
- Locate before reading — `rg`/Grep and `git ls-files` first, then Read only the files and
  line ranges that matter.
- Follow the thread the reader needs (callers, callees, the data that flows in), at most
  two hops unless `--deep`.
- For a codebase larger than ~30 source files, dispatch the `Explore` agent with a narrow
  question rather than reading broadly; keep its conclusion, not its file dumps.
- Facts outside the repo (a library's API, a protocol, a standard) — check current docs
  when available rather than relying on memory, and say when a claim is from general
  knowledge.

## PHASE 3: EXPLAIN

Write the guide with the template in `references/output-format.md`:

1. **TL;DR** — 1–3 sentences a reader could repeat to a colleague.
2. **Map** — the parts and how they connect (a small ASCII diagram or table when there are
   more than three parts).
3. **Step by step** — numbered steps in the order things *happen* (execution or data flow),
   or the order a reader should *read* them for a spec; one idea per step, each with its
   `file:line` or section reference.
4. **Watch out** — non-obvious behaviour, traps, edge cases, gaps or contradictions found.
5. **Check yourself** — 2–3 short questions whose answers prove understanding.
6. **Go further** — what to read or try next, and the follow-ups the reader can ask.

Scale to depth: `--quick` writes only TL;DR, Map and the top 1–3 Watch out items — no Step by step, no Check yourself; `--deep` adds internals,
alternatives and history (`git log -L` or blame for why code is the way it is).

## PHASE 4: FOLLOW-UP

Stay in guide mode. The reader can type `next` / `step <n>` to expand one step in detail,
`simpler` to re-explain with an analogy and no jargon, `example` for a concrete run with
real values, `diagram` for a picture of the flow, or any question. Long subjects (more than
~7 steps) are delivered a part at a time: the map plus steps 1–3, then `next` for the rest.

## RULES

- **Never edit, run migrations, or execute the code being explained** — read-only; running a read-only command (`--help`, a test that already exists) only when the user asks.
- **Never claim behaviour you did not read** — every statement about this code or spec cites `file:line` or a section; say "not found" or "unclear from the source" instead of guessing.
- **Always lead with the TL;DR** — never open with background, history or a list of files.
- **Always answer in the user's language** (or `--lang`), keeping code, identifiers, commands and error text verbatim.
- **Never pad** — no restating the question, no generic best-practice lectures unrelated to the subject.
- **Always flag what is wrong or missing** when the explanation uncovers it (a bug, a spec contradiction, an undefined term) — understanding includes the gaps.
