// ck-tools mod: plan-limit pace above the prompt, in every session (Claude Code ≥ 2.1.287).
//
// Nothing here is load-bearing: the skills never call it, and under --bare, --safe-mode or
// disableAllHooks the band is simply absent.
//
//   session.measure    records each new 5-hour / 7-day reading, toasts at thresholds
//   AbovePrompt band   one row per window: use, pace verdict, time to reset; other bands below
//   commands           /usage-pace (the full report) and /usage-band (show or hide), no model turn
//
// The readings are the ones the status line gets: Pro and Max plans only, after the first
// response. The last one is kept in $.store, shared by every session on the machine, so a new
// session draws the band at once, marked with its age. Pure rules live in logic.ts.

import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import type { Alerted, Reading, Snapshot } from "./logic";
import { registerUpdateCheck, startUpdateCheck } from "./update";
import {
  ageText,
  alertsFor,
  bar,
  color,
  fmtPercent,
  pace,
  paces,
  parseThresholds,
  report,
  resetText,
  toReadings,
  verdictText,
} from "./logic";

const usage = atom({ plugin: "ck-tools", key: "usage" } as const, null);
const now = atom({ plugin: "ck-tools", key: "now" } as const, 0);
const hidden = atom({ plugin: "ck-tools", key: "hidden" } as const, false);

let updateOn = true;
let bandOn = true;
let alertsOn = true;
let thresholds: number[] = [80, 95];

// The saved reading and the hidden flag, back into $.state: at start, and after /clear,
// /resume and /branch, which reset every atom.
async function load($: EngineInterface): Promise<void> {
  const saved = (await $.store.get("last")) as Snapshot | undefined;
  if (saved && Array.isArray(saved.readings))
    await update($, usage, () => saved);
  if ((await $.store.get("hidden")) === true)
    await update($, hidden, () => true);
  await update($, now, () => 0);
  await tick($);
}

async function tick($: EngineInterface): Promise<void> {
  const t = await $.clock.now();
  await update($, now, () => t);
}

// A fresh reading: drawn, saved for the next session, and checked against the thresholds.
async function record(
  $: EngineInterface,
  list: readonly Reading[],
): Promise<void> {
  if (list.length === 0) return;
  const t = await $.clock.now();
  const snapshot: Snapshot = { readings: toReadings(list), at: t };
  await update($, usage, () => snapshot);
  await update($, now, () => t);
  await $.store.set("last", snapshot);
  if (!alertsOn) return;
  // Read again right before the write: another session may have toasted meanwhile.
  const seen = ((await $.store.get("alerts")) ?? {}) as Record<string, Alerted>;
  const after: Record<string, Alerted> = { ...seen };
  let changed = false;
  for (const r of snapshot.readings) {
    const out = alertsFor(pace(r, t), r, thresholds, seen[r.kind]);
    for (const text of out.toasts) $.ui.toast(text, { timeoutMs: 8000 });
    if (JSON.stringify(out.next) !== JSON.stringify(seen[r.kind])) {
      after[r.kind] = out.next;
      changed = true;
    }
  }
  if (changed) await $.store.set("alerts", after);
}

export const register: Register = (on, options) => {
  bandOn = options.usage_band !== false;
  alertsOn = options.usage_alerts !== false;
  const parsed = parseThresholds(options.usage_alert_at);
  thresholds = parsed.length ? parsed : [80, 95];
  updateOn = options.update_check !== false;
  registerUpdateCheck(on);

  on("session.start", async ($, e, next) => {
    try {
      await startUpdateCheck($, updateOn);
    } catch {
      // The update check is independent of the usage band: its failure must not hide the band.
    }
    try {
      await load($);
      try {
        const first = await $.session.usage();
        await record($, first.rateLimits);
      } catch {
        // No reading yet: the saved one stands until session.measure brings one.
      }
      // The reset countdown moves by the minute; nothing else does between readings.
      $.clock.every(60_000, () => void tick($));
      await $.command.register({
        name: "usage-pace",
        description:
          "5-hour and weekly plan limits: use, pace and reset times, with no model turn",
        immediate: true,
      });
      await $.command.register({
        name: "usage-band",
        description: "Show or hide the plan-limit band above the prompt",
        immediate: true,
      });
    } catch {
      // Nothing here is load-bearing: a failed store or command call must not stop the session.
    }
    return next(e);
  });

  on(
    "classic.SessionStart",
    { source: ["clear", "resume", "fork"] },
    async ($, e, next) => {
      await load($);
      return next(e);
    },
  ).catch(($, e, next) => next(e));

  on("session.measure", async ($, e, next) => {
    try {
      if (e.changed.includes("rateLimits")) await record($, e.rateLimits);
    } catch {
      // A failed store or toast must not stop the measure chain.
    }
    return next(e);
  });

  on("command.run", { command: "usage-pace" }, async ($) => {
    const snapshot = await read($, usage);
    return { text: report(snapshot, await $.clock.now()) };
  });

  on("command.run", { command: "usage-band" }, async ($) => {
    const isHidden = !(await read($, hidden));
    await update($, hidden, () => isHidden);
    await $.store.set("hidden", isHidden);
    if (!isHidden) await tick($);
    return {
      text: isHidden
        ? "Plan-limit band hidden (/usage-band shows it again)."
        : "Plan-limit band shown.",
    };
  });

  // One row per window, drawn above whatever the other mods draw: the rows they get are
  // the band's minus ours, and their tree goes under ours, so ck-code's band stays.
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const snapshot = await read($, usage);
    const t = await read($, now);
    if (!bandOn || e.props.hasSurvey || (await read($, hidden)) || t === 0)
      return next(e);
    const all = paces(snapshot, t);
    if (!snapshot || all.length === 0 || e.props.maxRows < 1) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    const age = ageText(snapshot, t);
    // Side by side when the band is wide, one window per row when it isn't.
    const isWide = e.props.bodyColumns >= 70 * all.length;
    const rowsWanted = isWide ? 1 : all.length;
    const rows = Math.min(rowsWanted, e.props.maxRows);
    const cells = all.slice(0, isWide ? all.length : rows).map((p) => (
      <Box key={`w-${p.kind}`} gap={1}>
        <Text bold>{p.label}</Text>
        <Text color={color(p.verdict)}>{bar(p.used)}</Text>
        <Text bold>{fmtPercent(p.used)}</Text>
        <Text color={color(p.verdict)} wrap="truncate-end">
          {verdictText(p)}
        </Text>
        {resetText(p) !== "" && (
          <Text dimColor wrap="truncate-end">
            · {resetText(p)}
          </Text>
        )}
      </Box>
    ));
    const mine = (
      <Box
        key="usage"
        flexDirection={isWide ? "row" : "column"}
        gap={isWide ? 3 : 0}
      >
        {cells}
        {age !== "" && isWide && (
          <Text dimColor wrap="truncate-end">
            ({age})
          </Text>
        )}
      </Box>
    );
    const left = e.props.maxRows - rows;
    if (left < 1) return mine;
    const theirs = await next({ ...e, props: { ...e.props, maxRows: left } });
    return (
      <Box flexDirection="column">
        {mine}
        {theirs}
      </Box>
    );
  });
};
