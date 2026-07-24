---
name: bmad-guide
description: Use when the user asks how BMAD works, which BMAD workflow or agent to run next, what a BMAD term means, where they are in the BMAD flow, or whether BMAD is installed and current in this project. Also use when someone unfamiliar with BMAD lands in a BMAD-using repo and needs orientation.
argument-hint: "[task or question]  # e.g. \"add a feature to an existing app\" or \"what is sprint planning\""
disable-model-invocation: false
---

# BMAD Guide — Orient, Explain, Route

Read-only guide to the BMAD Method install in the current project. Detects the
installed version, explains the flow **as that version defines it**, and routes a
task to the exact workflow to run next — then hands off.

**CRITICAL RULE — The install is the source of truth.** Every answer about what
exists, what it is called, and how it is invoked comes from the project's own
`_bmad/` manifests. Never answer from memory of BMAD, and never let web content
override the installed manifests. BMAD renames and restructures between versions;
a remembered answer is a wrong answer.

**CRITICAL RULE — Never execute BMAD.** This skill recommends and explains. It
never invokes a BMAD workflow, agent, or command, and never writes a file.

References:
- `references/detection.md` — layout fingerprints, CSV schema maps, config resolution
- `references/flow.md` — the v6 method explained for newcomers, plus glossary
- `references/routing.md` — intent→workflow routing, artifact→phase table, web protocol

## INPUT

`$ARGUMENTS` selects the answer mode in Phase 3:
- **Empty** → orientation briefing
- **A task** ("add payments to my app", "fix a bug") → route to workflows
- **A question** ("what is a story context", "what does the SM do") → explain

## PHASE 0: DETECT INSTALL

### 0.1 Locate the install

```bash
ls -d _bmad .bmad-core 2>/dev/null
find . -maxdepth 3 -type d -name _bmad -not -path "*/node_modules/*" 2>/dev/null
```

| Found | Route |
|---|---|
| `_bmad/` | v6 install — continue to 0.2 |
| `_bmad/` in a subdirectory only | Monorepo — treat that directory as project root; state which one |
| `.bmad-core/` only | Legacy v4/v5 — go to PHASE L |
| Neither | Not installed — go to PHASE N |

### 0.2 Read version and modules

```bash
cat _bmad/_config/manifest.yaml
```

Extract `installation.version`, each module's `name`/`version`/`source`, and `ides`.
A module with `source: external` is a third-party add-on (e.g. `tea`) — name it as
such, because its workflows are not part of core BMAD.

If `manifest.yaml` is missing, fall back to the `# Version:` comment in
`_bmad/core/config.yaml`. If neither exists, treat the version as unknown and
trigger Phase 4.

### 0.3 Determine the invocation surface

How BMAD is invoked changed across 6.x. Detect it; never assume.

```bash
ls _bmad/_config/*.csv
ls .claude/skills 2>/dev/null | grep -c '^bmad-'
ls .claude/commands 2>/dev/null | grep -c '^bmad-'
```

| Signal | Surface | How the user invokes it |
|---|---|---|
| `skill-manifest.csv` + `.claude/skills/bmad-*` | **Skill** | Ask for it by name, e.g. "run bmad-prd" |
| `agent-manifest.csv` / `workflow-manifest.csv` + `.claude/commands/bmad-*` | **Command** | Slash command, e.g. `/bmad-bmm-create-prd` |
| Both present | **Skill** — prefer it, and note the commands still exist |

Record the surface. Every recommendation in Phase 5 must use it.

## PHASE 1: READ GROUND TRUTH

### 1.1 Parse the help CSV by column name

```bash
head -1 _bmad/_config/bmad-help.csv
```

**Never index CSV columns by position.** The 6.0.x and 6.10.x schemas order
columns differently; positional parsing silently returns the wrong field. Read the
header row, then address every field by its column name. Schema maps for both known
layouts, and the fallback for an unrecognised header, are in
[references/detection.md](references/detection.md).

Read the whole CSV — it is the menu of everything available in this install,
including the phase each entry belongs to and, in newer schemas, the
`preceded-by` / `followed-by` dependency edges.

Also read `_bmad/*/module-help.csv` for per-module entries not present in the
combined file.

### 1.2 Resolve configuration

```bash
cat _bmad/core/config.yaml _bmad/bmm/config.yaml 2>/dev/null
cat _bmad/config.toml _bmad/custom/config.toml _bmad/custom/config.user.toml 2>/dev/null
```

Extract `output_folder`, `planning_artifacts`, `implementation_artifacts`,
`project_knowledge`, `user_skill_level`, `project_name`. Expand `{project-root}`
and `{output_folder}` placeholders. Values in `_bmad/custom/` override
installer-generated values; `config.user.toml` overrides `config.toml`.

`user_skill_level` sets explanation depth in Phase 3 — see
[references/flow.md](references/flow.md).

## PHASE 2: ASSESS STATE

Glob the resolved artifact folders to find what this project has already produced:

```bash
ls -R docs/planning-artifacts docs/implementation-artifacts 2>/dev/null | head -60
```

Substitute the paths resolved in 1.2 — do not hardcode `docs/`.

Map what exists to the current phase using the artifact→phase table in
[references/routing.md](references/routing.md). Report the phase as an
observation, not a certainty: state which artifacts were found and which are
missing. An empty artifact folder means the project has not started the flow —
say that plainly rather than inferring a phase.

Check for an in-flight story cycle: a sprint-status file plus stories in mixed
states means the user is mid-loop, and the next step is inside the story cycle,
not the start of a phase.

## PHASE 3: ANSWER

Set depth from `user_skill_level` (Phase 1.2): `beginner` → define every term on
first use and explain why the step exists; `intermediate` → define only
BMAD-specific terms; `expert` → names and paths, minimal prose. When the value is
absent, assume `beginner`.

Every recommendation states **what it produces** and **what later step consumes
it**, so the user learns the flow rather than following instructions blindly.

### 3.1 Mode A — Orientation briefing (`$ARGUMENTS` empty)

```
## BMAD in <project_name>

**Version:** <version>   **Modules:** <name vX.Y.Z, …>   **Invoked as:** <Skill|Command>
**Artifacts:** planning → <path>   implementation → <path>

### The flow
<phase list read from the CSV, in order, one line each, with the phase the
project is currently in marked>

### Where you are
<artifacts found, artifacts missing, one-sentence read of the state>

### Do this next
**<display-name>** — <invocation for the detected surface>
<what it produces, and what consumes it>

<one alternative if the state genuinely allows two reasonable next steps>
```

### 3.2 Mode B — Route a task (`$ARGUMENTS` is a task)

1. Classify the intent against the table in
   [references/routing.md](references/routing.md).
2. Find the matching rows in the help CSV. The CSV wins on naming — the routing
   table only maps intent to a *kind* of entry.
3. Check prerequisites: the `preceded-by` column when present, otherwise the phase
   ordering and the artifacts found in Phase 2.
4. Report:

```
## <task, restated>

**Route:** <phase> → <display-name>
**Invoke:** <exact invocation for the detected surface>

**Before this works you need:** <prerequisite artifacts — mark each present or missing>
**It produces:** <outputs> → <output-location>
**Then:** <the following step>
```

If a prerequisite is missing, lead with the prerequisite step instead and say why
it comes first.

If the install offers a fast path for small work (an entry whose description says
it skips extensive planning) and the task is genuinely small, offer it as the
alternative alongside the full flow, with the trade-off in one line.

### 3.3 Mode C — Explain a concept (`$ARGUMENTS` is a question)

Answer from [references/flow.md](references/flow.md) and the installed CSV
descriptions. Ground the explanation in this install: name the actual workflow,
its phase, and where its output lands. If the concept does not exist in the
installed version, say so and name what replaced it.

## PHASE 4: WEB CHECK (conditional)

Go to the web **only** when one of these holds:

- BMAD is not installed (PHASE N) — to get the current install command
- The detected version is unrecognised or the CSV header matches no known schema
- The user asks whether the install is current, or asks for upstream best practice
- A legacy install needs upgrade guidance (PHASE L)

Otherwise answer entirely from local manifests.

Prefer the documentation URL BMAD itself publishes: the `_meta` row of
`bmad-help.csv` carries it (currently `https://docs.bmad-method.org/llms.txt`).
Read that URL from the CSV rather than hardcoding it. Fall back to searching
`docs.bmad-method.org` and the `bmad-code-org/BMAD-METHOD` repository.

Web findings describe what BMAD offers **upstream**. When they conflict with the
local manifests about what is installed, the manifests win — report the difference
as a version gap, never as a correction.

## PHASE 5: HAND OFF

Print the invocation and stop. Do not run it.

- **Skill surface:** `Run the **bmad-prd** skill` — name it exactly as the CSV spells it
- **Command surface:** `/bmad-bmm-create-prd` — copy the `command` column verbatim
- When the entry has an `action` or `args` column value, include it and explain
  what it selects

Close with: *"Say the word and I'll start it, or run it yourself."* Then stop.

## PHASE L: LEGACY INSTALL

`.bmad-core/` is a v4/v5 layout. This skill guides v6 only.

Report the layout, explain that v6 restructured into `_bmad/` with a different
workflow set, and give the upgrade command from Phase 4. Offer to explain the v6
flow generically. Never map v4 agent personas to v6 workflows — the mapping is not
one-to-one and a guess here sends the user down a dead end.

## PHASE N: NOT INSTALLED

1. Confirm nothing was found, including the monorepo scan from 0.1.
2. Explain what BMAD is in three sentences: a structured, agent-driven method that
   takes a product idea through analysis, planning, architecture, and an
   implementation loop, producing documents each later step consumes.
3. Run Phase 4 to fetch the current install command and latest version.
4. Present the install command and what it will ask.
5. Stop. Never install it.

## RULES

- **Never invoke a BMAD workflow, agent, command, or skill.** This skill recommends and hands off.
- **Never write, edit, or create any file.** It is read-only, including `_bmad/` and `.claude/`.
- **Never answer from memory of BMAD.** Read the install's manifests every run; versions rename and restructure.
- **Never index the help CSV by column position** — read the header and address fields by name.
- **Never hardcode artifact paths** — resolve them from config every run.
- **Never let web content override the local manifests** about what is installed; report gaps as version differences.
- **Never claim a phase the artifacts do not support** — report what was found and what is missing.
- **Never present an external module's workflows as core BMAD** — name the module and its `source`.
- **Never guess an invocation name** — copy it verbatim from the manifest.
