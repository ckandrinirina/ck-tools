// Pure rules for the ck-tools disk-space warning: parse `df`, rate the free space, decide when
// to check again and what to toast. No `$` here.

export type DiskLevel = "ok" | "low" | "critical";

// One `df` reading of the volume the session works on, kept in the store for every session.
export type DiskReading = {
  freeKb: number;
  totalKb: number;
  at: number;
};

const HOUR = 3_600_000;
export const PERIODS: Record<string, number> = {
  hour: HOUR,
  day: 24 * HOUR,
  week: 7 * 24 * HOUR,
  month: 30 * 24 * HOUR,
};

// The check period from the setting; anything unknown is a day.
export function periodMs(value: unknown): number {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PERIODS[key] ?? (PERIODS.day as number);
}

// The low threshold in GB from the setting; critical is a quarter of it, at least 1 GB.
export function lowGb(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : 20;
}

// `df -Pk <dir>`: the last line's 1024-blocks and Available columns. The Used column is left
// alone: on APFS it counts only one volume of the container, Available is what can be written.
export function parseDf(out: string): { freeKb: number; totalKb: number } | undefined {
  const lines = out.trim().split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return undefined;
  const cols = (lines[lines.length - 1] as string).trim().split(/\s+/);
  // Filesystem names may hold spaces; the four numbers before "Capacity" sit at the end.
  const cap = cols.findIndex((c, i) => i > 0 && /^\d+%$/.test(c));
  if (cap < 4) return undefined;
  const totalKb = Number(cols[cap - 3]);
  const freeKb = Number(cols[cap - 1]);
  if (!Number.isFinite(totalKb) || !Number.isFinite(freeKb) || totalKb <= 0) return undefined;
  return { freeKb, totalKb };
}

// Low under the GB threshold, critical under a quarter of it (at least 1 GB). GB, never a
// percentage: 10% of a 2 TB disk is 200 GB, which is no reason to clean.
export function diskLevel(r: { freeKb: number; totalKb: number }, low = 20): DiskLevel {
  const gb = r.freeKb / 1_048_576;
  if (gb < Math.max(1, low / 4)) return "critical";
  if (gb < low) return "low";
  return "ok";
}

// When the next check is due: the chosen period, but hourly while space is short, so the
// warning clears soon after a clean.
export function dueAt(last: DiskReading | undefined, period: number, low = 20): number {
  if (!last) return 0;
  const step = diskLevel(last, low) === "ok" ? period : Math.min(period, HOUR);
  return last.at + step;
}

export function fmtSize(kb: number): string {
  const gb = kb / 1_048_576;
  if (gb >= 100) return `${Math.round(gb)} GB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(kb / 1024)} MB`;
}

export function freePercent(r: { freeKb: number; totalKb: number }): number {
  return (r.freeKb / r.totalKb) * 100;
}

// The band's segment: "⛁ 8.2 GB free · /ck-tools:disk-clean".
export function diskText(r: { freeKb: number; totalKb: number }): string {
  return `⛁ ${fmtSize(r.freeKb)} free · /ck-tools:disk-clean`;
}

export function diskColor(level: DiskLevel): string {
  return level === "critical" ? "error" : level === "low" ? "warning" : "inactive";
}

// The toast one reading earns, given the level already announced: one per step down, none
// while it stays, and the memory cleared once space is back.
export function diskAlert(
  level: DiskLevel,
  r: { freeKb: number; totalKb: number },
  announced: DiskLevel | undefined,
): { toast?: string; next: DiskLevel } {
  const rank = { ok: 0, low: 1, critical: 2 } as const;
  if (level === "ok") return { next: "ok" };
  if (announced && rank[announced] >= rank[level]) return { next: announced };
  const free = `${fmtSize(r.freeKb)} free (${Math.round(freePercent(r))}%)`;
  return {
    toast:
      level === "critical"
        ? `Disk almost full: ${free} — run /ck-tools:disk-clean`
        : `Disk space low: ${free} — /ck-tools:disk-clean shows what can go`,
    next: level,
  };
}

// The /disk-space report.
export function diskReport(r: DiskReading | undefined, low: number, period: number, now: number): string {
  if (!r) return "No disk reading yet: df could not be read.";
  const level = diskLevel(r, low);
  const every = Object.keys(PERIODS).find((k) => PERIODS[k] === period) ?? "day";
  const verdict =
    level === "ok"
      ? "enough space"
      : level === "low"
        ? "low — /ck-tools:disk-clean shows what can go"
        : "almost full — run /ck-tools:disk-clean";
  const next = Math.max(0, dueAt(r, period, low) - now);
  const inH = Math.round(next / HOUR);
  return [
    `Disk: ${fmtSize(r.freeKb)} free of ${fmtSize(r.totalKb)} (${Math.round(freePercent(r))}%) · ${verdict}`,
    `Warns under ${low} GB free (red under ${Math.max(1, low / 4)} GB); checked every ${every}${level === "ok" ? "" : " (hourly while low)"}, next in ~${inH}h.`,
  ].join("\n");
}
