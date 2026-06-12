---
name: showcase
description: >
  Use when the user wants to generate a modern presentation or landing website
  for their product or app (mobile, desktop, web) from its existing documentation
  or codebase, and optionally deploy it to a free host. Triggers on requests like
  "create a showcase site for my app", "build a landing page for my project",
  "publish a product website".
argument-hint: "[optional product name or output directory]"
disable-model-invocation: false
---

# Showcase — Analyze a Product, Build a Presentation Website, Deploy It

Analyzes a product end-to-end (ck-code architecture docs first, else available
docs and codebase), builds a modern Astro presentation website themed after the
app, then guides deployment to a free host. Project-agnostic — works in any repo.

References (read the one the active phase points to, not all up front):
- `references/analysis.md` — ck-code doc paths, fallback manifests, platform &
  theme detection, the Product Profile schema
- `references/site-build.md` — Astro scaffold tree, section templates, theme
  wiring, design rules
- `references/deploy.md` — free-host options, exact commands, existing-server path

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

Present a compact summary to the user:
- Product name + one-line tagline
- Platforms detected (web / mobile / desktop)
- Feature list (top 4–8) the site will highlight
- Theme tokens (primary/accent colors, font) and logo path — or what you'll
  default to and why
- Site sections to build: **Hero + features**, **Platform sections**,
  **Getting started / docs**, **Changelog** (no tech-stack section)
- Output directory for the Astro site

Ask the user to confirm or correct anything (especially tagline, feature
selection, and theme). **Wait for confirmation before scaffolding.** Apply any
corrections to the Product Profile.

## PHASE 3: SCAFFOLD THE ASTRO SITE

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

## PHASE 5: DEPLOY

Follow `references/deploy.md`. **Ask before publishing anything** — deployment is
outward-facing.

### 5.1 Ask about hosting

Ask the user, with the existing-server question included:
- Do you already have a server/host ready? If yes, what kind (static host, VPS
  with nginx/Apache, S3, …)?
- Otherwise pick a free option: **GitHub Pages**, **Vercel**, **Netlify**, or
  **Cloudflare Pages**.

Present the free options with their one-line trade-offs from `references/deploy.md`
(cost, custom domain, build setup, private-repo support). Recommend one based on
where the repo already lives (e.g. GitHub repo → GitHub Pages or Vercel).

### 5.2 Configure & deploy the chosen target

Apply the target-specific config from `references/deploy.md` (e.g. Astro `site`/
`base` for GitHub Pages, adapter-free static output for the rest), then run the
documented deploy command **only after the user approves**. For an existing
server, generate the upload command (rsync/scp of `dist/`) and the static-serving
note, but let the user run it if it touches their infrastructure.

### 5.3 Report

Give the user the live URL (or the exact command they must run), the source
location of the site, and how to redeploy after future changes.

## RULES

- **Never publish without explicit approval** — Phase 5 deployment is
  outward-facing; present options and wait. Approval for one target is not
  approval for another.
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
