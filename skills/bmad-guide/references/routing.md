# Routing Reference — Intent → Workflow, State → Phase, Web Protocol

Used by Phases 2, 3.2 and 4.

**The help CSV is authoritative for names.** This file maps intent to a *kind* of
entry; the matching row in the installed CSV supplies the real name, invocation,
phase and outputs. When no row matches an intent, say so rather than inventing one.

## 1. Intent → entry

Match the user's words to a row by searching the CSV `description` and label
columns for the listed cues.

| User intent | Look for a row whose description covers | Phase |
|---|---|---|
| "I have a vague idea" | brainstorming, ideation, facilitation techniques | `1-analysis` |
| "Is this idea any good?" | pressure-testing, working-backwards, stress-testing an idea | `1-analysis` |
| "Who else does this / is there a market?" | market research, competitive landscape | `1-analysis` |
| "I need to understand the domain" | domain research, subject-matter deep dive | `1-analysis` |
| "Which tech should I use?" | technical research, feasibility, implementation options | `1-analysis` |
| "Write down what I'm building" | product brief | `1-analysis` |
| "Turn this into real requirements" | PRD — create, edit, or validate | `2-planning` |
| "Design the screens / user journey" | UX design | `2-planning` |
| "How should this be built?" | architecture | `3-solutioning` |
| "Break the work into pieces" | epics and stories | `3-solutioning` |
| "Are we ready to start coding?" | implementation readiness, alignment check | `3-solutioning` |
| "Start building" | sprint planning | `4-implementation` |
| "What's the status?" | sprint status | `4-implementation` |
| "Give me the next story" | create story | `4-implementation` |
| "Is this story ready?" | validate story | `4-implementation` |
| "Build this story" | dev story | `4-implementation` |
| "Review the code" | code review | `4-implementation` |
| "Write tests" | test generation, E2E/API automation | `4-implementation` |
| "The epic is done" | retrospective | `4-implementation` |
| "Requirements changed / we went off-plan" | correct course, change navigation | `anytime` |
| "Document this existing codebase" | document project | `anytime` |
| "Make the AI follow our conventions" | generate project context | `anytime` |
| "Small change, skip the ceremony" | quick / one-off / minimal-planning path | `anytime` |
| "This doc is too big" | shard document | `anytime` |
| "Improve this writing" | editorial review — prose or structure | `anytime` |
| "Poke holes in this" | adversarial review, edge-case hunting, elicitation | `anytime` |
| "Change how BMAD behaves" | customization, overrides | `anytime` |
| "Get several opinions" | party mode, multi-agent discussion | `anytime` |

### Ambiguous intent

When a task matches rows in more than one phase, the artifacts found in Phase 2
decide: recommend the earliest phase with an unmet prerequisite. Say which reading
was chosen and why, in one line.

### Intent with no match

Report that the install has no entry for it, name the closest entries, and — if
the request is ordinary engineering work rather than a method step — say plainly
that it does not need a BMAD workflow.

## 2. Artifact → phase

Glob the resolved artifact roots and match case-insensitively on these cues.
Names vary by version and by user; treat matches as evidence, not proof.

**An artifact may be a single file or a directory.** Large documents get sharded
into a folder of numbered parts with an index (`PRD/00-index.md`,
`01-requirements.md`, …). A `PRD/` directory and a `prd.md` file are the same
evidence — both observed in real installs. Never conclude an artifact is missing
because you only looked for a file.

| Evidence found | Suggests |
|---|---|
| Nothing in either artifact root | Not started — phase `1-analysis` |
| Source code present, no artifacts | Brownfield, not started — recommend project context first |
| Brainstorm / research / brief files only | In `1-analysis` |
| A PRD | `2-planning` done or in progress |
| PRD + UX | `2-planning` complete |
| Architecture document | `3-solutioning` in progress |
| Epics / stories list | `3-solutioning` near complete |
| Readiness report | `3-solutioning` complete → next is sprint planning |
| Sprint status file | `4-implementation` — in the story cycle |
| Story files with mixed states | Mid-loop — position from the sprint status file |
| Retrospective | An epic closed — next epic or next phase of work |

### Reading position inside the story cycle

When a sprint-status file exists, read it — it is the most reliable state source
in the project, better than any filename inference.

It is self-documenting. Observed installs write a `sprint-status.yaml` whose
header comments carry:

- `story_location` — where story files actually live; trust this over the
  configured path
- `project`, `project_key`, `tracking_system` — whether tracking is file-system
  based or wired to an external tracker
- **`STATUS DEFINITIONS`** — the epic, story and retrospective states *this
  version* uses, with their transitions

Read the status vocabulary from the file's own definitions block rather than
assuming a fixed set of states. Then report the specific story and its state, and
name the next step from the CSV's dependency edges.

### Reporting rules

State artifacts found and artifacts missing. Never upgrade a guess into a claim —
"a PRD exists and no architecture document was found, which puts you at the start
of solutioning" is correct; "you are in solutioning" alone is not.

## 3. Web protocol

Phase 4 decides *whether* to go out. This section covers *where* and *how*.

### Where to look, in order

1. The URL in the `_meta` row of `bmad-help.csv` (`output-location` column) —
   BMAD publishes its own LLM-oriented docs index there. Read it from the CSV.
2. `docs.bmad-method.org` — the documentation site.
3. `github.com/bmad-code-org/BMAD-METHOD` — releases for the current version,
   issues for known install problems.
4. The npm package page for the published version.

### How to use what comes back

- Report the latest version alongside the installed one and let the user decide.
  Never recommend upgrading mid-project without noting that workflow names and
  layout change between minor versions.
- Upstream documentation describes upstream. If it names a workflow this install
  does not have, that is a version gap — report it as such and keep routing to
  what is installed.
- Quote the install command verbatim from the docs rather than from memory; it has
  changed across the v6 line.
- Never install, upgrade, or modify anything. Print the command.

### Offline

If the network fails, say so, answer from local manifests, and mark the
version-currency question as unanswered. Never substitute remembered version
numbers for a failed lookup.
