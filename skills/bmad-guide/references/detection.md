# Detection Reference — Layouts, CSV Schemas, Config Resolution

Ground truth for Phases 0 and 1. Everything here describes **observed** installs.
When an install matches nothing here, degrade gracefully and say so — never guess.

## 1. Layout fingerprints

| Marker | Meaning |
|---|---|
| `_bmad/` | v6 install |
| `_bmad/_config/manifest.yaml` | Authoritative version + module list |
| `_bmad/_config/skill-manifest.csv` | Skill surface (6.10-era and later) |
| `_bmad/_config/agent-manifest.csv` | Command/agent surface (6.0-era) |
| `_bmad/_config/workflow-manifest.csv` | Command surface — workflow files per command |
| `_bmad/_config/bmad-help.csv` | Combined menu — present in both eras, **different schemas** |
| `_bmad/<module>/module-help.csv` | Per-module menu |
| `_bmad/custom/` | User overrides — never installer-managed |
| `_bmad/_memory/` | Agent sidecar memory (e.g. tech-writer standards) |
| `_bmad/scripts/*.py` | Config/customization resolvers shipped with newer installs |
| `.bmad-core/` | Legacy v4/v5 — out of scope, PHASE L |

### Module names

`core` and `bmm` are built-in. Anything with `source: external` in `manifest.yaml`
came from a separate npm package — `tea` (test architecture) is the common one.
Always report external modules as add-ons, with their own version, because they
version independently of BMAD itself.

## 2. `bmad-help.csv` schemas

Read the header row and map by column name. Both known schemas below.

### Schema A — 6.0.x era (command surface)

```
module,phase,name,code,sequence,workflow-file,command,required,agent-name,
agent-command,agent-display-name,agent-title,options,description,
output-location,outputs
```

| Role | Column |
|---|---|
| Phase | `phase` |
| Human label | `name` |
| Menu shortcut | `code` |
| Invocation | `command` → user types `/<command>` |
| Owning agent | `agent-name`, `agent-display-name`, `agent-title` |
| Mandatory? | `required` |
| What it makes | `outputs`, `output-location` |
| Ordering hint | `sequence` (numeric, within phase) |

No dependency edges. Derive order from `phase` then `sequence`.

### Schema B — 6.10.x era (skill surface)

```
module,skill,display-name,menu-code,description,action,args,phase,
preceded-by,followed-by,required,output-location,outputs
```

| Role | Column |
|---|---|
| Phase | `phase` |
| Human label | `display-name` |
| Menu shortcut | `menu-code` |
| Invocation | `skill` → invoke the skill of that name |
| Sub-mode | `action` (e.g. `create`, `validate`) |
| Extra input | `args` (e.g. `[path]`, `[topic]`) |
| Dependency edges | `preceded-by`, `followed-by` — values may be `skill` or `skill:action` |
| Mandatory? | `required` |
| What it makes | `outputs`, `output-location` |

`module` holds a display label here (`BMad Method`, `Core`) rather than the module
id. Use `manifest.yaml` for real module identities.

One skill can appear on several rows with different `action` values — treat each
row as a distinct menu entry.

### The `_meta` row

Rows where the name column is `_meta` are not workflows. They carry metadata; the
`output-location` column holds the documentation URL for that module. Read the
docs URL from here in Phase 4 instead of hardcoding one. Exclude `_meta` rows from
any menu shown to the user.

### Unknown schema — fallback

If the header matches neither schema:

1. Match columns by name against the role table above — the names have been stable
   even as order and spelling changed (`name`/`display-name`, `code`/`menu-code`).
2. Fall back to `skill-manifest.csv` (columns `canonicalId,name,description,module,path`)
   or `agent-manifest.csv` for the available entries.
3. Fall back to listing `.claude/skills/bmad-*` or `.claude/commands/bmad-*`.
4. Tell the user the schema was unrecognised, name the version, and treat routing
   confidence as lower. Trigger Phase 4.

## 3. Config resolution

Order of precedence, lowest to highest:

1. `_bmad/<module>/config.yaml` — installer-generated per module
2. `_bmad/config.toml` — installer-generated, marked read-only in its own header
3. `_bmad/custom/config.toml` — team overrides, committed
4. `_bmad/custom/config.user.toml` — personal overrides, gitignored

Not every install has all four. 6.0.x installs observed with only `config.yaml`
files; 6.10.x installs observed with both `config.yaml` and `config.toml`.

### Keys that matter

| Key | Module | Use |
|---|---|---|
| `output_folder` | core | Root for generated docs |
| `project_name` | core or bmm | Label in the briefing |
| `user_name` | core | Personalisation only |
| `user_skill_level` | bmm | Sets explanation depth (`beginner`/`intermediate`/`expert`) |
| `planning_artifacts` | bmm | Where phases 1–3 write |
| `implementation_artifacts` | bmm | Where phase 4 writes |
| `project_knowledge` | bmm | Where project documentation lands |
| `communication_language` | core | Answer in this language when set |

### Placeholder expansion

Values contain `{project-root}` and `{output_folder}`. Expand both before globbing.

```
planning_artifacts = '{project-root}/{output_folder}/planning-artifacts'
output_folder      = 'docs'
→ <repo>/docs/planning-artifacts
```

`output_folder` itself is sometimes already absolute-ish (`'{project-root}/docs'`)
and sometimes bare (`docs`). Normalise: strip a leading `{project-root}/` from
`output_folder` before substituting it into another value, or the path doubles.

If a path does not resolve to an existing directory, report it as *configured but
not yet created* — that is normal for a project that has not reached that phase.

## 4. Invocation surface — the no-surface case

Phase 0.3 decides the surface. The one case it cannot route: **both counts zero.**

The install exists but is not wired to this IDE. Read `manifest.yaml`'s `ides`
list and report the mismatch — `_bmad/` present with no generated skills or
commands means the installer ran without this tool selected. The fix is re-running
the installer and choosing it. Workflows are still readable from the manifests, so
continue answering; only the invocation instructions become "not available here".

## 5. Observed installs

Two real installs used to validate this reference:

| Version | `_config` contents | Surface | Notes |
|---|---|---|---|
| 6.0.4 | `manifest.yaml`, `bmad-help.csv` (Schema A), `agent-manifest.csv`, `workflow-manifest.csv`, `task-manifest.csv`, `tool-manifest.csv`, `files-manifest.csv`, `agents/`, `ides/`, `custom/` | Command | Phases include `0-learning`; external `tea` module |
| 6.10.0 | `manifest.yaml`, `bmad-help.csv` (Schema B), `skill-manifest.csv`, `files-manifest.csv` | Skill | Adds `preceded-by`/`followed-by`; `config.toml` present |

These are data points, not a complete version history. Newer installs are expected
to differ again — which is why every rule here reads the install rather than
assuming it.
