# Showcase — Astro Site Build Reference

Scaffold a modern Astro presentation site by writing files directly. No
interactive `npm create` — it prompts and stalls. Output static HTML to `dist/`.

## File tree

```
<site-dir>/
  package.json
  astro.config.mjs
  tsconfig.json
  public/                  # logo, screenshots, favicon (copied from the app)
  src/
    styles/theme.css       # extracted theme tokens → CSS custom properties
    styles/global.css      # resets, base typography, layout primitives
    components/
      Hero.astro
      Features.astro
      Platforms.astro
      GettingStarted.astro
      Changelog.astro
      Nav.astro
      Footer.astro
    layouts/Base.astro
    pages/index.astro
```

Only generate components for sections confirmed in Phase 2.

## package.json

```json
{
  "name": "<product-slug>-showcase",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "devDependencies": {
    "astro": "^5.0.0"
  }
}
```

Use Astro 5 (latest). Static output is the default — no SSR adapter needed for
GitHub Pages / Vercel / Netlify / Cloudflare Pages.

## astro.config.mjs

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  // site + base are filled in Phase 5 per the chosen host (see deploy.md).
  // GitHub Pages project sites need base: '/<repo>/'.
});
```

## tsconfig.json

```json
{ "extends": "astro/tsconfigs/strict" }
```

## theme.css — wire the extracted tokens

Map the Product Profile `theme{}` to CSS custom properties. Example shape (fill
real values from analysis):

```css
:root {
  --color-primary: #4f46e5;
  --color-accent:  #06b6d4;
  --color-bg:      #0b0f1a;
  --color-surface: #131a2a;
  --color-text:    #e8edf7;
  --color-muted:   #9aa6c0;
  --font-heading: 'Space Grotesk', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --radius: 14px;
  --maxw: 1120px;
}
```

If the theme is light, invert bg/surface/text accordingly. Honor the app's
actual palette — do not override it with these placeholders.

## Section content mapping

| Component | Source from Product Profile | Notes |
|---|---|---|
| `Nav` | `name`, `logo`, section anchors | sticky, translucent, blurs on scroll |
| `Hero` | `name`, `tagline`, `description`, primary CTA = top platform link, `logo`/screenshot | gradient or screenshot-led; one clear CTA + secondary "View on GitHub" if repo link |
| `Features` | `features[]` | responsive card grid; icon or initial per card; mark `status: soon` as a subtle badge |
| `Platforms` | `platforms[]` | one block per platform with label + download/store button (App Store / Google Play / Releases) or device frame |
| `GettingStarted` | `links.docs`, README install steps | numbered steps or code block; link out to full docs |
| `Changelog` | `changelog[]` | newest-first list, version + date + highlights; collapse older entries |
| `Footer` | `links{}`, year | repo/homepage/docs links |

**Never render a tech-stack / badges section.** Platforms communicate delivery.

## Design rules

- **Invoke the `frontend-design` skill** for the visual layer. This file gives
  structure; that skill gives distinctiveness. The site must not look like a
  generic AI template.
- **Theme-true** — use the extracted palette/fonts everywhere; the site should
  feel like an extension of the app, not a stock theme.
- **Modern baseline** — generous whitespace, a real type scale, one accent color
  used intentionally, smooth section rhythm, subtle motion (CSS transitions on
  hover/scroll, `prefers-reduced-motion` respected), rounded surfaces via
  `--radius`, soft shadows or borders (not both heavily).
- **Responsive-first** — mobile layout works before desktop; nav collapses;
  feature grid reflows 1→2→3 columns.
- **Accessible** — semantic landmarks (`header/nav/main/footer`), alt text on
  every image, color contrast ≥ WCAG AA against the chosen palette, visible
  focus states, keyboard-navigable nav.
- **Performance** — no heavy JS; Astro ships zero JS by default, keep it that
  way. Optimize/compress images dropped into `public/`. Set a real `<title>`,
  meta description, Open Graph tags, and favicon from the logo.
- **No fake content** — no lorem ipsum, no invented testimonials, no fake
  screenshots. Empty slots get a tasteful themed placeholder, not fabrication.

## Build check

```bash
cd <site-dir> && npm install && npm run build
```

Green build → `dist/` is the deployable artifact. Fix any error before Phase 5.
