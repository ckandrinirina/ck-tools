# Showcase — Deployment Reference

Free hosting options for the static Astro site (`dist/`), plus the existing-server
path. **Ask the user first** — deployment is outward-facing. Recommend the option
that matches where the repo already lives.

## Options at a glance

| Host | Cost | Custom domain | Private repo | Best when |
|---|---|---|---|---|
| **GitHub Pages** | Free | Free (CNAME) | Needs GitHub Pro | Repo already on GitHub; simplest CI deploy |
| **Vercel** | Free hobby | Free | Free | Want instant deploys + preview URLs; GitHub/GitLab repo |
| **Netlify** | Free | Free | Free | Same as Vercel; generous static tier |
| **Cloudflare Pages** | Free | Free | Free | Want Cloudflare CDN/edge; unlimited bandwidth |
| **Existing server** | Yours | Yours | n/a | User already has a VPS / static host / S3 |

All four free hosts serve Astro's static `dist/` with no SSR adapter.

## GitHub Pages

Project site is served at `https://<user>.github.io/<repo>/`, so set `base`.

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://<user>.github.io',
  base: '/<repo>/',
});
```

`.github/workflows/deploy.yml` (build + deploy on push to main):
```yaml
name: Deploy showcase to Pages
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
        working-directory: <site-dir>
      - run: npm run build
        working-directory: <site-dir>
      - uses: actions/upload-pages-artifact@v3
        with: { path: <site-dir>/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
Then in the repo: Settings → Pages → Source = "GitHub Actions". After approval,
push; the workflow publishes. (User-/org-root site `<user>.github.io` needs no `base`.)

## Vercel

Static output, no adapter. After user approval:
```bash
npm i -g vercel        # if not installed
cd <site-dir> && vercel        # first run links/creates project (interactive)
cd <site-dir> && vercel --prod # production deploy
```
Or connect the repo at vercel.com → it auto-detects Astro, build `npm run build`,
output `dist`. Set the project root to `<site-dir>` if the site is in a subfolder.

## Netlify

```bash
npm i -g netlify-cli   # if not installed
cd <site-dir> && netlify deploy           # draft URL
cd <site-dir> && netlify deploy --prod    # production
```
Or `netlify.toml` for repo-connected builds:
```toml
[build]
  base = "<site-dir>"
  command = "npm run build"
  publish = "dist"
```

## Cloudflare Pages

```bash
npm i -g wrangler      # if not installed
cd <site-dir> && npm run build
cd <site-dir> && wrangler pages deploy dist --project-name <product-slug>-showcase
```
Or connect the repo in the Cloudflare dashboard (build `npm run build`, output
directory `dist`, root directory `<site-dir>`).

## Existing server

Build locally, then ship `dist/` to the user's host. **Generate the command but
let the user run it** — it touches their infrastructure.

Static host / nginx / Apache via rsync (preferred):
```bash
cd <site-dir> && npm run build
rsync -avz --delete dist/ <user>@<host>:/var/www/<site>/
```
Or scp:
```bash
scp -r <site-dir>/dist/* <user>@<host>:/var/www/<site>/
```
nginx static block (if they need it):
```nginx
server {
  listen 80;
  server_name <domain>;
  root /var/www/<site>;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```
S3 + static hosting:
```bash
aws s3 sync <site-dir>/dist/ s3://<bucket>/ --delete
```

For a subpath deploy (served under `https://<domain>/<path>/`), set Astro
`base: '/<path>/'` and rebuild, same as GitHub Pages.

## After deploy — report

Give the user: the live URL (or the exact command to run for an existing server),
the site source location, and how to redeploy after changes (push for CI hosts,
re-run the deploy command for CLI/server hosts).
