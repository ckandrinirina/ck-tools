# Subject Playbooks

One row per subject type: what to read, and how the "Step by step" section is ordered.

| Type | Detect | Read | Step order |
|---|---|---|---|
| **code-unit** | a file, function, class, symbol | the unit; its callers (`rg -n "name\("`); the callees it relies on; its tests — they show intended use | entry point → each branch in execution order → outputs and side effects |
| **codebase** | a folder, `.`, "this project" | README, manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`…), entry points (main, routes, CLI), top-level folders, `CLAUDE.md`/architecture docs | one real request or command traced end to end, then the folders it crossed, then where to start for common changes |
| **spec** | a doc, issue, RFC, PRD, story, pasted requirements | the whole doc; linked docs it depends on | goal → actors → main flow → rules and constraints → edge cases → open questions; then "what to build first" if the reader is implementing |
| **diff** | a PR, commit, range, `git diff` | `git diff --stat` first, then hunks by concern; PR body and linked issue | intent → each change grouped by concern, in data-flow order → behaviour before vs after → risk. For a diff too large to read in one pass, suggest `/ck-tools:review-guide` instead |
| **error** | a stack trace, log, failing test output | the top frame in project code, the code at that line, the inputs that reached it, recent changes there (`git log -p -n 3 -- <file>`) | what the message literally says → where it is thrown → why it happened here → the fix options; do not apply the fix |
| **config** | YAML/JSON/TOML/env, CI workflow, Dockerfile | the file and what reads it (`rg` the keys) | each block: what it controls, its effective value, what changes if you change it |
| **command** | a shell command, script, Makefile target | the command, its `--help` or man page when unfamiliar, the script source | each flag or stage of the pipe, left to right, with what it outputs |
| **concept** | a term, pattern, technology, "what is X" | the project's own use of it first (`rg`), then current docs | plain definition → why it exists (the problem it solves) → how it works in steps → an example from this repo when one exists → when not to use it |

## Reader goal → emphasis

| Goal | Stress |
|---|---|
| use it | inputs, outputs, one runnable example |
| change it | where the logic lives, what depends on it, which tests cover it |
| review it | intent vs implementation, risky spots, what is untested |
| debug it | the failing path, the state at each step, where to put a breakpoint or log |
| decide on it | trade-offs, alternatives, cost of each option |
| learn it | analogies, a mental model, a progression from simple to full |
