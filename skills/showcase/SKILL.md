---
name: showcase
description: >
  Use when the user wants to generate a modern presentation or landing website
  for their product or app (mobile, desktop, web) from its existing documentation
  or codebase, and optionally deploy it to a free host. Triggers on requests like
  "create a showcase site for my app", "build a landing page for my project",
  "publish a product website".
argument-hint: "[optional product name or output directory]"
effort: high
---

# Showcase — Analyze a Product, Build a Presentation Website, Deploy It

Analyzes a product end-to-end (ck-code architecture docs first, else available
docs and codebase), builds a modern Astro presentation website themed after the
app, packages it as its **own independent git + GitHub repo** (gitignored from the
project), then guides deployment to a free host. **Re-runnable**: a saved
`showcase.config.json` lets a later run intelligently UPDATE the site from project
changes instead of rebuilding. Project-agnostic — works in any repo.

References (read the one the active phase points to, not all up front):
- `references/analysis.md` — ck-code doc paths, fallback manifests, platform &
  theme detection, the Product Profile schema
- `references/site-build.md` — Astro scaffold tree, section templates, theme
  wiring, design rules
- `references/deploy.md` — free-host options, exact commands, existing-server path
- `references/state.md` — independent-repo + gitignore mechanics, public-repo
  creation, the `showcase.config.json` schema, and the smart-update diff logic

## INPUT

`$ARGUMENTS` is optional: a product name and/or the output directory for the site.
- **Provided:** use it as the product name hint and/or site output dir.
- **Empty:** infer the product name from the analysis; default the site dir to
  `showcase/` at the repo root.

## PHASE 0: PREFLIGHT

```bash
git rev-parse --show-toplevel 2>/dev/null
node --version 2>/dev/null
```

- Not a git repo → still works; treat the current directory as the project root.
- No Node.js → warn that Astro needs Node 18+; offer to continue analysis and
  generate files anyway (the user installs Node before build/deploy).

Pick the project root (git toplevel, else cwd). All paths below are relative to it.
Default the site dir to `showcase/` (or the `$ARGUMENTS` dir).

### 0.1 Detect mode — CREATE vs UPDATE

```bash
test -f <site-dir>/showcase.config.json && echo UPDATE || echo CREATE
```
Also scan `showcase/`, `site/`, `docs-site/` for a stray `showcase.config.json`.

- **UPDATE** — config found. Load it (see `references/state.md`). Reuse the saved
  deploy target, site repo, theme, and sections unless the user changes them.
  Announce: "Existing showcase found — I'll sync it with your latest changes."
- **CREATE** — no config. Run the full first-time flow.

## PHASE 1: ANALYZE THE PRODUCT

Follow `references/analysis.md`. Goal: produce one **Product Profile** object.

### 1.1 Detect ck-code architecture docs

```bash
ls docs/architecture/ tasks/FEATURE_INDEX.md 2>/dev/null
```

- **Present** → check recency with `git log -1 --format=%cr -- docs/architecture/`.
  Read the canonical docs in this order: `docs/architecture/README.md`,
  `tech-stack.md`, `_shared.md`, each `features/<slug>/index.md`, and
  `tasks/FEATURE_INDEX.md` (feature names + one-line descriptions). These are the
  primary source of truth for features and platforms.
- **Absent or stale (>90 days, no recent commits)** → go to 1.2.

### 1.2 Fallback — available docs & manifests

Read whatever exists: `README*`, `docs/`, and the platform manifest(s) listed in
`references/analysis.md` (`package.json`, `pubspec.yaml`, `Cargo.toml`,
`*.xcodeproj`, `build.gradle`, `tauri.conf.json`, …). Extract product name,
description, scripts, and dependencies.

### 1.3 Detect platforms & assets

Map the codebase to delivery platforms (web / mobile / desktop) using the
detection table in `references/analysis.md`. Locate screenshots, logos, and store
links under `assets/`, `public/`, `docs/`, `screenshots/`, or `*.png`/`*.svg`.

### 1.4 Extract the theme

Pull brand colors, fonts, and the logo from the app itself — Tailwind config,
CSS variables, theme files, `app.json`/`manifest`, or the dominant colors of the
logo. Record them as design tokens. If nothing is found, derive a tasteful
palette from the logo or pick a modern default and SAY which.

### 1.5 Build the Product Profile

Assemble the profile (name, tagline, description, features[], platforms[],
theme{}, assets{}, links{}, changelog[]) per the schema in
`references/analysis.md`. Pull `changelog[]` from `CHANGELOG.md` if present.
**Do not include a tech-stack section** — omit framework/badge listings.

## PHASE 2: CONFIRM PROFILE & SITE PLAN

**UPDATE mode** — instead of the full summary, compute and present the diff
(per `references/state.md`): features added/removed/reworded, new or dropped
platforms, theme changes, new changelog versions, and a one-line list of project
commits since `source.lastSyncedCommit`. Confirm which changes to apply, then go
to Phase 3 and update **only** the affected sections. Skip the rest of this phase.

**CREATE mode** — present a compact summary to the user:
- Product name + one-line tagline
- Platforms detected (web / mobile / desktop)
- Feature list (top 4–8) the site will highlight
- Theme tokens (primary/accent colors, font) and logo path — or what you'll
  default to and why
- Site sections to build: **Hero + features**, **Platform sections**,
  **Getting started / docs**, **Changelog** (no tech-stack section)
- Output directory for the Astro site, and that it will be its **own independent
  git repo** (gitignored from the project), published as the public GitHub repo
  `<project-slug>-showcase`

Ask the user to confirm or correct anything (especially tagline, feature
selection, and theme). **Wait for confirmation before scaffolding.** Apply any
corrections to the Product Profile.

## PHASE 3: SCAFFOLD / UPDATE THE SITE

### 3.1 Build or update the Astro files

Follow `references/site-build.md` exactly. Write files directly (no interactive
`npm create`) into the chosen output dir:

1. Scaffold the file tree: `package.json`, `astro.config.mjs`, `tsconfig.json`,
   `src/`, `public/`.
2. Wire the extracted theme into `src/styles/theme.css` as CSS custom properties.
3. Generate one section component per confirmed section (Hero, Features,
   Platforms, GettingStarted, Changelog) and compose them in `src/pages/index.astro`.
4. Copy located logos/screenshots into `public/`; reference them in components.
5. Apply the design rules in `references/site-build.md` — and invoke the
   `frontend-design` skill for the visual layer so the result is distinctive, not
   generic. The design must follow the app's own theme as closely as possible.

**UPDATE mode** — only rewrite the sections flagged in the Phase 2 diff. Before
overwriting any generated file, check its sha256 against `generatedFiles` in
`showcase.config.json` (per `references/state.md`): if it was manually edited, ask
before overwriting — never clobber the user's changes silently.

### 3.2 Make the site an independent, gitignored repo

Per `references/state.md`:
- `git init` inside the site dir if it has no `.git` yet.
- Add `/<site-dir>/` to the **project's** `.gitignore` (create it if absent) so the
  main repo never tracks the site. Skip if the project is not a git repo.
- Write the site repo's own `.gitignore` (`node_modules/`, `dist/`, `.astro/`).

### 3.3 Write state + docs

- `showcase.config.json` — the skill's source of truth (schema in
  `references/state.md`): product snapshot + `profileHash`, sections, theme,
  source repo/commit, site repo URL, deploy target, and per-file checksums.
- `README.md` in the site repo — human docs: what it is, the deployment target +
  live URL + redeploy command, project options, and "run `/ck-tools:showcase` to
  update". Refresh both on every run.

## PHASE 4: BUILD & VERIFY

```bash
cd <site-dir> && npm install && npm run build
```

- Build fails → read the error, fix the offending file, rebuild. Do not proceed
  to deploy with a broken build.
- Build passes → offer a local preview: `npm run preview` (report the local URL
  for the user to open). Confirm `dist/` was produced.

State plainly whether the build passed and what `dist/` contains. Never claim
the site works without a green build.

## PHASE 5: PUBLISH REPO & DEPLOY

Follow `references/deploy.md` and `references/state.md`. **Ask before publishing
anything** — creating a public repo and deploying are both outward-facing.

### 5.1 Publish the site's GitHub repo

- **CREATE** — propose the public repo `<project-slug>-showcase`. After approval,
  commit the site and `gh repo create … --public --source=. --push` (commands in
  `references/state.md`). Record the repo URL in `showcase.config.json`.
- **UPDATE** — commit and push to the saved `site.repo` remote.

Skip only if the user declines a GitHub repo (still keep the local independent repo).

### 5.2 Ask about hosting

Ask the user, with the existing-server question included:
- Do you already have a server/host ready? If yes, what kind (static host, VPS
  with nginx/Apache, S3, …)?
- Otherwise pick a free option: **GitHub Pages**, **Vercel**, **Netlify**, or
  **Cloudflare Pages**.

Present the free options with their one-line trade-offs from `references/deploy.md`
(cost, custom domain, build setup, private-repo support). Recommend one based on
where the site repo lives (GitHub repo → GitHub Pages or Vercel). **UPDATE mode**:
reuse the saved `deploy.target` without re-asking unless the user wants to change it.

### 5.3 Configure & deploy the chosen target

Apply the target-specific config from `references/deploy.md` (e.g. Astro `site`/
`base` for GitHub Pages, adapter-free static output for the rest), then run the
documented deploy command **only after the user approves**. For an existing
server, generate the upload command (rsync/scp of `dist/`) and the static-serving
note, but let the user run it if it touches their infrastructure.

### 5.4 Persist state & report

Update `showcase.config.json` (`deploy.target`/`url`, refreshed `generatedFiles`
checksums, `source.lastSyncedCommit`/`lastSyncedAt`) and the site `README.md`, then
commit & push the site repo. Give the user the live URL (or the exact command they
must run), the site repo URL, and remind them to re-run `/ck-tools:showcase` to sync
after future project changes.

## RULES

- **Never publish without explicit approval** — creating the public GitHub repo
  (Phase 5.1) and deploying (Phase 5.3) are outward-facing; present and wait.
  Approval for one target is not approval for another.
- **Always package the site as its own repo, gitignored from the project** —
  `git init` in the site dir and add `/<site-dir>/` to the project's `.gitignore`.
  Never commit the site into the project's git history.
- **Always write and refresh `showcase.config.json`** — it is the skill's source of
  truth that makes re-runs an UPDATE, not a rebuild. Never delete it.
- **On UPDATE, never overwrite a manually-edited generated file without asking** —
  compare its checksum to `generatedFiles` first (Phase 3.1).
- **On UPDATE, change only the sections in the Phase 2 diff** — do not rebuild
  untouched sections or re-ask settings already saved in the config.
- **Never claim the site builds or works without a green `npm run build`** —
  evidence before assertions.
- **Always prefer ck-code architecture docs** when present and recent (Phase 1.1)
  over re-deriving everything from the codebase.
- **Never invent product facts** — if a feature, platform, or link is not found in
  the docs or code, ask the user rather than fabricating it.
- **Never include a tech-stack / badge section** — the product may be personal;
  present features and platforms, not the framework list.
- **Always follow the app's own theme** — extract real colors/fonts/logo; only
  fall back to a default palette when none exist, and say so.
- **Never deploy a broken build** — a failing Phase 4 blocks Phase 5.
- **Always invoke the `frontend-design` skill** for the visual layer — the site
  must be modern and distinctive, not a generic AI template.
