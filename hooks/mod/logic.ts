// Pure rules for the ck-tools usage band: pace, verdicts, formatting, alert levels. No `$` here.

// One plan-limit window as $.session.usage() and session.measure report it.
export type Reading = { kind: string; percentUsed: number; resetsAt?: string };

// The last readings seen by any session, and when (ms). Kept in $.store, so a new session
// draws the band before its first response brings fresh figures.
export type Snapshot = { readings: Reading[]; at: number };

export type Verdict = "safe" | "tight" | "over" | "hit" | "early";

export type Pace = {
  kind: string;
  label: string;
  used: number;
  verdict: Verdict;
  // The window's use at reset if the pace so far holds; absent when it can't be told.
  projected?: number;
  // Until the window resets, and until it runs out at this pace (only when before reset).
  resetsInMs?: number;
  runsOutInMs?: number;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Windows of known length get a pace; any other kind (a gateway's spend_limit) gets a level.
export const WINDOW_MS: Record<string, number> = {
  five_hour: 5 * HOUR,
  seven_day: 7 * DAY,
};

const LABELS: Record<string, string> = {
  five_hour: "5h",
  seven_day: "7d",
  spend_limit: "$",
};

// Projected use at reset below SAFE is safe, below 100 is tight, above runs out.
export const SAFE = 85;
// Before this share of a window has passed, a projection is noise unless use is already high.
const EARLY_SHARE = 0.05;
const EARLY_USED = 50;

export function label(kind: string): string {
  return LABELS[kind] ?? kind;
}

// The pace of one window at `now`. A window whose reset time has passed has started over.
export function pace(r: Reading, now: number): Pace {
  const base = { kind: r.kind, label: label(r.kind) };
  const resetAt = r.resetsAt ? Date.parse(r.resetsAt) : NaN;
  if (Number.isFinite(resetAt) && resetAt <= now)
    return { ...base, used: 0, verdict: "early" };
  const used = r.percentUsed;
  const resetsInMs = Number.isFinite(resetAt) ? resetAt - now : undefined;
  if (used >= 100) return { ...base, used, verdict: "hit", resetsInMs };
  const windowMs = WINDOW_MS[r.kind];
  if (windowMs === undefined || resetsInMs === undefined) {
    const verdict = used < 75 ? "safe" : used < 90 ? "tight" : "over";
    return { ...base, used, verdict, resetsInMs };
  }
  const elapsed = Math.min(windowMs, Math.max(0, windowMs - resetsInMs));
  const share = elapsed / windowMs;
  if (share < EARLY_SHARE && used < EARLY_USED)
    return { ...base, used, verdict: "early", resetsInMs };
  const projected = share > 0 ? used / share : Infinity;
  if (projected < SAFE)
    return { ...base, used, verdict: "safe", projected, resetsInMs };
  if (projected <= 100)
    return { ...base, used, verdict: "tight", projected, resetsInMs };
  const runsOut = used > 0 ? ((100 - used) * elapsed) / used : resetsInMs;
  return {
    ...base,
    used,
    verdict: "over",
    projected,
    resetsInMs,
    runsOutInMs: runsOut < resetsInMs ? runsOut : undefined,
  };
}

// 5h before 7d before anything else, so the band reads the same every time.
export function paces(snapshot: Snapshot | null, now: number): Pace[] {
  if (!snapshot) return [];
  const order = (k: string) =>
    k === "five_hour" ? 0 : k === "seven_day" ? 1 : 2;
  return [...snapshot.readings]
    .sort((a, b) => order(a.kind) - order(b.kind))
    .map((r) => pace(r, now));
}

// "<1m", "45m", "2h10m", "4d3h".
export function fmtDuration(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "<1m";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)
    return min % 60 ? `${h}h${String(min % 60).padStart(2, "0")}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d${h % 24}h` : `${d}d`;
}

export function fmtPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function bar(used: number, width = 8): string {
  const full = Math.max(0, Math.min(width, Math.round((used / 100) * width)));
  return "█".repeat(full) + "░".repeat(width - full);
}

// The theme key each verdict draws in.
export function color(v: Verdict): string {
  return v === "safe" || v === "early"
    ? "success"
    : v === "tight"
      ? "warning"
      : "error";
}

// "✓ safe · ~58% at reset", "⚠ tight · ~96% at reset", "✗ out in 1h05m", "✗ limit hit".
export function verdictText(p: Pace): string {
  switch (p.verdict) {
    case "hit":
      return "✗ limit hit";
    case "early":
      return p.used === 0 && p.resetsInMs === undefined
        ? "✓ reset"
        : "✓ too early to tell";
    case "over":
      return p.runsOutInMs !== undefined
        ? `✗ out in ${fmtDuration(p.runsOutInMs)}`
        : "✗ over pace";
    case "tight":
      return p.projected !== undefined
        ? `⚠ tight · ~${fmtPercent(p.projected)} at reset`
        : "⚠ tight";
    case "safe":
      return p.projected !== undefined
        ? `✓ safe · ~${fmtPercent(p.projected)} at reset`
        : "✓ safe";
  }
}

export function resetText(p: Pace): string {
  return p.resetsInMs === undefined
    ? ""
    : `resets ${fmtDuration(p.resetsInMs)}`;
}

// The age note for figures another session or an earlier turn saw: "", or "as of 12m ago".
export const STALE_MS = 5 * 60_000;
export function ageText(snapshot: Snapshot, now: number): string {
  const age = now - snapshot.at;
  return age > STALE_MS ? `as of ${fmtDuration(age)} ago` : "";
}

// The /usage-pace report: one paragraph per window.
export function report(snapshot: Snapshot | null, now: number): string {
  const all = paces(snapshot, now);
  if (!snapshot || all.length === 0)
    return "No plan-limit reading yet. Figures arrive with the first response on a Pro or Max plan.";
  const lines = all.map((p) => {
    const parts = [
      `${p.label.padEnd(2)} ${bar(p.used, 20)} ${fmtPercent(p.used)} used`,
      verdictText(p),
      resetText(p),
    ].filter(Boolean);
    return parts.join(" · ");
  });
  const age = ageText(snapshot, now);
  return [...lines, ...(age ? [`(${age})`] : [])].join("\n");
}

// "80,95" → [80, 95]; junk and out-of-range values are dropped.
export function parseThresholds(text: unknown): number[] {
  return String(text ?? "")
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 100)
    .sort((a, b) => a - b);
}

// What has been announced for one window: the reset it belongs to, the highest threshold
// toasted, and whether the "runs out before reset" warning was shown.
export type Alerted = { resetsAt: string; level: number; paced: boolean };

// The toasts one reading earns, given what was announced; and what to remember after.
export function alertsFor(
  p: Pace,
  r: Reading,
  thresholds: number[],
  seen: Alerted | undefined,
): { toasts: string[]; next: Alerted } {
  const resetsAt = r.resetsAt ?? "";
  const prior = seen && seen.resetsAt === resetsAt ? seen : undefined;
  const crossed = thresholds.filter((t) => p.used >= t).pop() ?? 0;
  const level = Math.max(prior?.level ?? 0, crossed);
  const toasts: string[] = [];
  const reset = resetText(p);
  if (crossed > (prior?.level ?? 0))
    toasts.push(
      `${p.label} limit at ${fmtPercent(p.used)}${reset ? ` · ${reset}` : ""}`,
    );
  const paced = p.verdict === "over" && p.runsOutInMs !== undefined;
  if (paced && !prior?.paced)
    toasts.push(
      `${p.label} limit: at this pace it runs out in ${fmtDuration(p.runsOutInMs!)}${reset ? `, before it ${reset}` : ""}`,
    );
  return { toasts, next: { resetsAt, level, paced: paced || !!prior?.paced } };
}

// Readings as the engine hands them, frozen: copied to plain data for state and store.
export function toReadings(list: readonly Reading[]): Reading[] {
  return list.map((r) => ({
    kind: r.kind,
    percentUsed: r.percentUsed,
    ...(r.resetsAt ? { resetsAt: r.resetsAt } : {}),
  }));
}
