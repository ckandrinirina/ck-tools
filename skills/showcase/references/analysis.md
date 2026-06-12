# Showcase — Product Analysis Reference

How to analyze a product into a single **Product Profile**. Prefer ck-code
architecture docs; fall back to manifests and codebase.

## ck-code architecture docs (primary source)

When `docs/architecture/` exists, these are authored by ck-code and are the
source of truth. Read in this order, stopping when you have enough:

| File | What it gives the site |
|---|---|
| `docs/architecture/README.md` | Product overview, purpose, one-paragraph pitch |
| `docs/architecture/tech-stack.md` | Platforms in use (read for platform detection only — **do not** put a tech-stack section on the site) |
| `docs/architecture/_shared.md` | Cross-cutting concepts, naming, domain language |
| `docs/architecture/features/<slug>/index.md` | One feature each — title + summary → a feature card |
| `tasks/FEATURE_INDEX.md` | Authoritative feature list with one-line descriptions and status (DONE/IN PROGRESS/TODO) |

Feature cards come from `FEATURE_INDEX.md` descriptions + each feature's
`index.md`. Use status to optionally mark "Coming soon" on TODO/IN-PROGRESS
features. Recency check: `git log -1 --format=%cr -- docs/architecture/`; treat
docs older than ~90 days with no recent commits as stale and cross-check the code.

## Fallback — manifests by ecosystem

When no architecture docs (or stale), read README(s) and the matching manifest:

| Ecosystem | Manifest(s) | Platform implied |
|---|---|---|
| Node / web | `package.json` | web (+ desktop/mobile via deps below) |
| Flutter | `pubspec.yaml` | mobile + desktop + web |
| React Native | `package.json` (`react-native` dep), `app.json` | mobile (iOS + Android) |
| iOS native | `*.xcodeproj`, `Info.plist`, `Package.swift` | mobile (iOS) |
| Android native | `build.gradle(.kts)`, `AndroidManifest.xml` | mobile (Android) |
| Rust | `Cargo.toml` | desktop / CLI |
| Tauri | `src-tauri/tauri.conf.json` | desktop |
| Electron | `package.json` (`electron` dep) | desktop |
| Python | `pyproject.toml`, `setup.py` | CLI / web (Django/Flask/FastAPI) |
| Go | `go.mod` | CLI / web / desktop |

From the manifest extract: product name, description, version, homepage/repo
links, and notable dependencies (to confirm platform, not to list on the site).

## Platform detection table

| Signal | Platform |
|---|---|
| `next`, `react`, `vue`, `svelte`, `astro`, `vite`, server frameworks | **Web** |
| `react-native`, `expo`, `flutter`, `*.xcodeproj`, `AndroidManifest.xml`, `Capacitor` | **Mobile** |
| `electron`, `tauri`, `*.xcodeproj` (macOS), `.deb`/`.dmg`/`.exe` build scripts | **Desktop** |
| `bin` field in package.json, `Cargo.toml [[bin]]`, click/argparse, cobra | **CLI** |

A product may hit several rows — list every platform found. Look for store/badge
links (App Store, Google Play, releases page) in README and manifests to power
the platform sections' download buttons.

## Theme extraction

Pull real brand tokens from the app, in priority order — stop at the first hit:

1. `tailwind.config.{js,ts,mjs,cjs}` → `theme.extend.colors`, `fontFamily`
2. CSS custom properties (`--color-*`, `--brand-*`) in `*.css`, `globals.css`,
   `src/styles/`
3. Framework theme files: `theme.{ts,js,dart}`, `colors.{ts,dart}`, MUI/Chakra
   theme, `ThemeData` (Flutter)
4. `app.json` / `manifest.json` / `manifest.webmanifest` → `theme_color`,
   `background_color`, icons
5. Logo image — derive a primary + accent from its dominant colors

Record tokens: `primary`, `accent`, `bg`, `surface`, `text`, `muted`,
`fontHeading`, `fontBody`, `radius`. Locate the logo (`logo.*`, `icon.*`,
`favicon.*`, `assets/`, `public/`). If nothing is found, derive from the logo or
pick a modern default palette and STATE the choice in Phase 2.

## Asset discovery

Search for visuals to feature on the site:
```bash
ls assets/ public/ static/ docs/ screenshots/ images/ 2>/dev/null
find . -maxdepth 3 \( -iname "*screenshot*" -o -iname "*logo*" -o -iname "*icon*" -o -iname "*.svg" \) -not -path "*/node_modules/*" 2>/dev/null | head -40
```
Prefer real screenshots/mockups. If none exist, the Hero uses a themed gradient +
the logo, and platform sections use simple device frames (no fake screenshots).

## Product Profile schema

Assemble one object — this is the only handoff to Phase 2/3:

```yaml
name: string                 # product display name
tagline: string              # ≤ 12 words, benefit-driven
description: string          # 1–2 sentence pitch
features:                    # 4–8 items
  - title: string
    summary: string          # one line
    status: shipped | soon   # 'soon' from TODO/IN-PROGRESS features (optional)
platforms:                   # only those detected
  - kind: web | mobile | desktop | cli
    label: string            # e.g. "iOS & Android", "macOS · Windows · Linux"
    link: url | null         # store / download / live URL if found
theme:
  primary, accent, bg, surface, text, muted: hex
  fontHeading, fontBody: string
  radius: string             # e.g. "12px"
  source: string             # where tokens came from, or "default (no theme found)"
assets:
  logo: path | null
  screenshots: [path]
links:
  repo, homepage, docs: url | null
changelog:                   # from CHANGELOG.md, newest first, optional
  - version: string
    date: string
    highlights: [string]
```

Never fabricate fields — leave `null`/empty and ask the user in Phase 2.
**No `techStack` field** — platforms convey delivery; the framework list stays off the site.
