# Showcase — State, Independent Repo & Smart Update Reference

Makes the site **independently packaged** and **re-runnable**. The site folder is
its own git repo + public GitHub repo, gitignored from the project; a config file
records everything so a later run UPDATES instead of rebuilding.

## Independent repo mechanics (Phase 3)

The site lives at `<project-root>/showcase/` (or the chosen dir) but is NOT part of
the project's git history.

1. **Init its own repo** — only if `<site-dir>/.git` does not already exist:
   ```bash
   git -C <site-dir> init -q
   ```
2. **Gitignore it from the project** — if the project root is a git repo, ensure a
   line ignoring the site dir exists in the project's `.gitignore` (create the file
   if absent). Append `\/<site-dir>/\n` only when not already present:
   ```bash
   grep -qxF '/<site-dir>/' <project-root>/.gitignore 2>/dev/null \
     || printf '\n# Showcase site — packaged independently\n/%s/\n' '<site-dir>' >> <project-root>/.gitignore
   ```
   If the project is not a git repo, skip this step (nothing tracks the folder).
3. **Site repo `.gitignore`** — write `node_modules/`, `dist/`, `.astro/` into
   `<site-dir>/.gitignore` so the site repo stays clean.

The result: the project ignores `showcase/`, while `showcase/` carries its own
`.git` and history. The two repos never entangle.

## Public GitHub repo (Phase 5 — requires approval)

Creating a public repo is outward-facing — **ask first**. Default name
`<project-slug>-showcase`. After approval:

```bash
cd <site-dir>
git add -A && git commit -q -m "chore: initial showcase site"
gh repo create <owner>/<project-slug>-showcase --public --source=. --remote=origin --push
```

If the repo already exists (update run), just commit and push to the saved remote:
```bash
cd <site-dir> && git add -A && git commit -q -m "chore: sync showcase with project changes" && git push -q
```

Record the resulting repo URL in `showcase.config.json`.

## State file — `<site-dir>/showcase.config.json`

The machine-readable memory of the site. Written in Phase 3, updated every run.
**Never hand-curated by the user** — it is the skill's source of truth for updates.

```json
{
  "schemaVersion": 1,
  "product": {
    "name": "MyApp",
    "slug": "myapp",
    "tagline": "...",
    "profileHash": "<sha256 of the normalized Product Profile>"
  },
  "sections": ["hero", "features", "platforms", "gettingStarted", "changelog"],
  "theme": { "primary": "#...", "accent": "#...", "source": "tailwind.config.ts" },
  "source": {
    "projectPath": "..",
    "repo": "<project git remote or null>",
    "lastSyncedCommit": "<project HEAD sha at last run, or null>",
    "lastSyncedAt": "YYYY-MM-DD"
  },
  "site": {
    "dir": "showcase",
    "framework": "astro",
    "repo": "https://github.com/<owner>/myapp-showcase",
    "generatedFiles": { "src/components/Features.astro": "<sha256>", "...": "..." }
  },
  "deploy": {
    "target": "github-pages | vercel | netlify | cloudflare | server | null",
    "config": {},
    "url": "<live url or null>",
    "lastDeployedAt": "YYYY-MM-DD or null"
  }
}
```

`profileHash` and `generatedFiles` checksums are what make updates smart — see below.
(Dates: read the project's `git log -1 --format=%cd --date=short` or have the caller
supply today's date; the skill environment has no clock.)

## Human docs — `<site-dir>/README.md`

The site repo's README documents how it was made and how to maintain it. Include:
- **What this is** — auto-generated presentation site for `<product>`, built with Astro.
- **Deployment** — the chosen target, the live URL, and the exact redeploy command/CI.
- **Project options** — sections enabled, theme source, source project repo/path.
- **Updating** — "Run `/ck-tools:showcase` from the project to sync this site with
  the latest project changes." Note that `showcase.config.json` is skill-managed.
- **Manual edits** — edits to generated components are detected and preserved on
  update (the skill asks before overwriting a changed file).

## Smart update (Phase 0 detection → Phase 2/3 diff)

### Detect mode (Phase 0)
```bash
test -f <site-dir>/showcase.config.json && echo UPDATE || echo CREATE
```
Also scan likely dirs (`showcase/`, `site/`, `docs-site/`) for a stray config.
- **CREATE** — no config → full first-run flow.
- **UPDATE** — config found → load it; the saved `deploy.target`, `site.repo`,
  `theme`, and `sections` are reused unless the user changes them.

### Compute the diff (UPDATE)
1. Re-run Phase 1 analysis → fresh Product Profile.
2. Compare to the saved snapshot:
   - **Features** — added / removed / reworded (by title + summary)
   - **Platforms** — newly detected or dropped
   - **Theme** — token changes at the source (e.g. brand color changed)
   - **Changelog** — new versions since `lastSyncedCommit`
   - **Tagline / description** — changed
3. Also list project commits since `source.lastSyncedCommit` to summarize "what
   changed" for the user:
   ```bash
   git -C <project-root> log --oneline <lastSyncedCommit>..HEAD 2>/dev/null
   ```
4. Present the diff in Phase 2 and update **only** affected sections.

### Preserve manual edits
Before overwriting any generated component, compare its current on-disk sha256 to
the `generatedFiles[path]` checksum in config:
- **Match** → file is untouched since generation → safe to regenerate.
- **Differ** → the user edited it → DO NOT silently overwrite. Show the conflict
  and ask: keep their version, overwrite with the regenerated version, or merge.

After writing, refresh each file's checksum in `generatedFiles` and bump
`source.lastSyncedCommit`/`lastSyncedAt`.

## RULES recap (enforced by SKILL.md)
- The site repo is always independent and gitignored from the project.
- `showcase.config.json` is written on create and refreshed on every update.
- Never overwrite a manually-edited generated file without asking.
- Creating the public GitHub repo and any deploy both require user approval.
