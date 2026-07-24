# The BMAD Flow — Explained for Newcomers

Teaching material for Phase 3. The **shape** of the method is stable across v6;
the **names** are not. Always take names, phases, and invocations from the
installed manifests, and use this file for the *why*.

## 1. The one-paragraph version

BMAD turns "I have an idea" into shipped code by making each step produce a
written document that the next step consumes. Instead of one long conversation
where context is lost, you get a chain: a brief feeds a requirements document,
which feeds an architecture, which feeds epics and stories, which feed a
story-by-story build loop. Each step is run by a specialist role with a narrow
job. The documents are the memory — that is the whole trick.

## 2. The phases

Phase ids come from the `phase` column of the help CSV. Observed set:

| Phase | Question it answers | Typical outputs |
|---|---|---|
| `0-learning` | How does BMAD itself work? | — (guidance only; not in every version) |
| `1-analysis` | Is this idea worth building, and what is it? | brainstorm, research, product brief |
| `2-planning` | What exactly are we building? | PRD, UX design |
| `3-solutioning` | How will it be built, and in what pieces? | architecture, epics and stories, readiness report |
| `4-implementation` | Build it, one story at a time | sprint plan, stories, code, reviews, retrospective |
| `anytime` | Cross-cutting work | documentation, project context, course correction, quick paths |

**`anytime` entries are not a phase you pass through.** They are tools you reach
for when needed — documenting an existing codebase, correcting course when
requirements change, or taking a fast path for small work.

### Why the order matters

Each phase's output is the next phase's input. Skipping ahead is the single most
common failure: architecture without requirements produces a design for the wrong
product, and stories without architecture produce parts that do not fit together.
When routing, always name the missing prerequisite rather than the desired step.

## 3. The story cycle

Phase 4 is a loop, not a list. The shape observed across versions:

```
sprint planning  ──▶  create story  ──▶  validate story  ──▶  dev story
                            ▲                                     │
                            │                                     ▼
                    (next story)  ◀──  code review  ──▶  (fixes: back to dev story)
                            │
                     (epic done)  ──▶  retrospective
```

Read the actual edges from the CSV when it has `preceded-by` / `followed-by`;
derive them from `phase` + `sequence` otherwise.

The loop is why "where am I?" is answerable: a sprint-status file plus stories in
mixed states pinpoints the position exactly.

## 4. Roles

Older installs attach a named agent to each entry (`agent-name`,
`agent-display-name`); newer ones fold most work into skills and keep agents for a
few specialised jobs. Both express the same idea: **one narrow role per step, so
the model is not asked to be product manager and developer in the same breath.**

Commonly seen roles: analyst (research, briefs), product manager (requirements),
UX designer, architect (technical design), scrum master (stories, sprints),
developer (implementation), QA / test architect (test strategy and automation),
tech writer (documentation).

Read the roles this install actually has from `agent-manifest.csv`, the
`agent-name` column, or `.claude/skills/bmad-agent-*`. Never present a role the
install does not have.

## 5. Artifacts and where they live

Two configured roots (resolve both from config — never hardcode):

- **`planning_artifacts`** — phases 1–3 output: briefs, PRD, UX, architecture,
  epics and stories, readiness reports
- **`implementation_artifacts`** — phase 4 output: sprint status, story files,
  test suites, retrospectives

A third, `project_knowledge`, holds documentation about the codebase itself —
generated project context and reverse-engineered docs for brownfield work.

## 6. Scale

BMAD is meant to run at different weights: a one-line fix should not require a
PRD. Versions express this differently — some through explicit project levels,
some through fast-path workflows whose descriptions say they skip extensive
planning, some through workflows that scale their own output.

**Do not assert a specific level taxonomy.** Read how this install expresses
scale: look for entries whose description mentions quick, one-off, or small
changes, and offer them as the light path. If the install has explicit levels,
the CSV descriptions will say so.

## 7. Greenfield vs brownfield

- **Greenfield** — new project. Start at `1-analysis` and walk forward.
- **Brownfield** — existing codebase. Run the codebase-documentation and
  project-context entries (`anytime` phase) *first*, so later phases plan against
  what actually exists rather than an imagined system. Architecture in brownfield
  ratifies the current design instead of inventing one.

Detect which case applies from the repo itself: substantial source code with no
planning artifacts means brownfield, and the first recommendation should be to
generate project context.

## 8. Glossary

| Term | Meaning |
|---|---|
| **Workflow** | One runnable unit of the method — produces a defined output |
| **Skill / command** | How a workflow is invoked; which one depends on the version |
| **Module** | A bundle of workflows. `core` = shared tools, `bmm` = the software method, external modules add specialities |
| **Menu code** | Two-or-three letter shortcut for an entry (`PRD`, `CS`, `DS`) |
| **PRD** | Product Requirements Document — the authoritative "what we are building" |
| **Epic** | A group of related stories delivering one meaningful capability |
| **Story** | One unit of implementable work with acceptance criteria |
| **Story context / project context** | A compact, LLM-oriented file of rules and patterns so the build agent follows house conventions |
| **Sharding** | Splitting a document that has grown too large into linked pieces |
| **Sprint status** | The phase-4 tracker recording each story's state |
| **Readiness check** | Verification that requirements, design, and stories agree before building |
| **Correct course** | The workflow for when reality diverges from the plan |
| **Party mode** | Multiple agent personas discussing one problem together |
| **Elicitation** | Structured techniques that push the model to critique and improve its own output |
| **Retrospective** | End-of-epic review feeding lessons into the next epic |

## 9. Depth by skill level

`user_skill_level` from `bmm/config.yaml`:

- **`beginner`** — define each term on first use; state why the step exists and
  what breaks if it is skipped; recommend exactly one next step
- **`intermediate`** — define BMAD-specific terms only; name prerequisites; one
  recommendation plus at most one alternative
- **`expert`** — names, phases, paths, invocation. No explanation unless asked

Absent value → treat as `beginner`. A user asking this guide for help is, by
definition, not yet oriented.
