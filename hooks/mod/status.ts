// Pure rules for the ck-tools status row: git, model, context and session time. No `$` here.

import { fmtDuration } from "./logic";

export type Git = {
  branch: string;
  ahead: number;
  behind: number;
  untracked: number;
};

// What the status row draws from; each part is left out when the engine or git has none.
export type Status = {
  git?: Git;
  added: number;
  removed: number;
  model: string;
  ctx?: number;
  startedAt?: number;
};

const FAMILY = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?/;

// "claude-opus-5-5" → "Opus 5.5", "claude-sonnet-5-5[1m]" → "Sonnet 5.5 · 1M", "opus" → "Opus".
export function modelName(id: string): string {
  const raw = id.trim();
  const big = /\[1m\]$/i.test(raw) ? " · 1M" : "";
  const bare = raw.replace(/\[[^\]]*\]$/, "");
  const m = FAMILY.exec(bare);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  // group 1 is `[a-z]+`, so it is a non-empty string whenever the pattern matches.
  if (m?.[1]) return `${cap(m[1])} ${m[2]}${m[3] ? `.${m[3]}` : ""}${big}`;
  if (/^[a-z]+$/.test(bare)) return `${cap(bare)}${big}`;
  return `${bare}${big}`;
}

// `git status --porcelain=v2 --branch`: the branch (or `@<sha>` detached), ahead/behind, untracked.
export function parseGitStatus(out: string): Git | undefined {
  const lines = out.split("\n");
  const head = lines.find((l) => l.startsWith("# branch.head "));
  if (!head) return undefined;
  let branch = head.slice("# branch.head ".length).trim();
  if (branch === "(detached)") {
    const oid = lines.find((l) => l.startsWith("# branch.oid "));
    branch = `@${(oid ?? "").slice("# branch.oid ".length, "# branch.oid ".length + 7)}`;
  }
  const ab = /^# branch\.ab \+(\d+) -(\d+)/m.exec(out);
  return {
    branch,
    ahead: ab ? Number(ab[1]) : 0,
    behind: ab ? Number(ab[2]) : 0,
    untracked: lines.filter((l) => l.startsWith("? ")).length,
  };
}

// `git diff HEAD --shortstat`: lines added and removed, staged and unstaged together.
export function parseShortstat(out: string): { added: number; removed: number } {
  const add = /(\d+) insertions?\(\+\)/.exec(out);
  const del = /(\d+) deletions?\(-\)/.exec(out);
  return { added: add ? Number(add[1]) : 0, removed: del ? Number(del[1]) : 0 };
}

// Context fill: green under half, amber under 80%, red after — where autocompaction looms.
export function ctxColor(percent: number): string {
  return percent < 50 ? "success" : percent < 80 ? "warning" : "error";
}

export function sessionText(startedAt: number, now: number): string {
  return fmtDuration(Math.max(0, now - startedAt));
}

// A thin bar for the context window: "▰▰▱▱▱▱".
export function slimBar(percent: number, width = 6): string {
  const full = Math.max(0, Math.min(width, Math.round((percent / 100) * width)));
  return "▰".repeat(full) + "▱".repeat(width - full);
}

// The theme keys the bars draw in, as colors an SVG can hold: an Svg is drawn as an image, so
// it cannot read the theme. Mid tones that read on a light and a dark background alike.
const PILL_HEX: Record<string, string> = {
  success: "#3fb950",
  warning: "#d29922",
  error: "#e5534b",
};

// A rounded progress pill for the surfaces that draw Svg (desktop, editor, mobile), where the
// terminal's block glyphs fall into a proportional font: a soft track, a filled part, any width.
export function pillSvg(percent: number, colorKey: string, width = 64, height = 8): string {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const r = height / 2;
  const fill = p > 0 ? Math.max(height, Math.round((p / 100) * width)) : 0;
  const hex = PILL_HEX[colorKey] ?? "#3fb950";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" rx="${r}" fill="#8b8b8b" fill-opacity="0.28"/>` +
    (fill ? `<rect width="${fill}" height="${height}" rx="${r}" fill="${hex}"/>` : "") +
    `</svg>`
  );
}
