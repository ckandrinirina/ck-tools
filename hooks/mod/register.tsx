// ck-tools mod: a status row and the weekly plan-limit pace above the prompt, in every session
// (Claude Code ≥ 2.1.287).
//
// Nothing here is load-bearing: the skills never call it, and under --bare, --safe-mode or
// disableAllHooks the band is simply absent.
//
//   status row         git branch and diff, model, context fill, session time: the status line
//   session.measure    records each new weekly reading, toasts at thresholds
//   AbovePrompt band   the status row, then the weekly use, pace and reset; other bands below
//   commands           /usage-pace (the full report) and /usage-band (show or hide), no model turn
//
// The readings are the ones the status line gets: Pro and Max plans only, after the first
// response. The 5-hour window is retired: logic.ts drops it wherever a reading enters. The last
// reading is kept in $.store, shared by every session on the machine, so a new session draws
// the band at once, marked with its age. Pure rules live in logic.ts and status.ts.

import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import type { Alerted, Reading, Snapshot } from "./logic";
import type { Status } from "./status";
import {
  ctxColor,
  modelName,
  parseGitStatus,
  parseShortstat,
  sessionText,
  slimBar,
} from "./status";
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
const status = atom({ plugin: "ck-tools", key: "status" } as const, null);

let updateOn = true;
let bandOn = true;
let alertsOn = true;
let statusOn = true;
// Git runs at most this often; the minute tick and every turn's end ask for it.
const GIT_EVERY_MS = 5_000;
let gitAt = 0;
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
  const readings = toReadings(list);
  if (readings.length === 0) return;
  const t = await $.clock.now();
  const snapshot: Snapshot = { readings, at: t };
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

// The status row's figures, read again. Git is throttled and fails quietly outside a repo; the
// model and the context come from the engine and are free.
async function refreshStatus(
  $: EngineInterface,
  force = false,
): Promise<void> {
  if (!statusOn) return;
  const prior = await read($, status);
  const next: Status = prior
    ? { ...prior }
    : { added: 0, removed: 0, model: "" };
  try {
    next.model = modelName(await $.session.model());
  } catch {
    // No model yet: the segment stays empty.
  }
  try {
    const u = await $.session.usage();
    next.ctx = u.context.percent;
    next.startedAt = u.startedAt;
  } catch {
    // No figures yet.
  }
  const t = await $.clock.now();
  if (force || t - gitAt >= GIT_EVERY_MS) {
    gitAt = t;
    try {
      const cwd = await $.session.cwd();
      const st = await $.process.run(
        ["git", "status", "--porcelain=v2", "--branch"],
        { cwd, timeoutMs: 3_000 },
      );
      next.git = st.exitCode === 0 ? parseGitStatus(st.stdout) : undefined;
      if (next.git) {
        const diff = await $.process.run(["git", "diff", "HEAD", "--shortstat"], {
          cwd,
          timeoutMs: 3_000,
        });
        Object.assign(next, parseShortstat(diff.exitCode === 0 ? diff.stdout : ""));
      } else Object.assign(next, { added: 0, removed: 0 });
    } catch {
      // No git, or it hung: the row draws without the branch.
      next.git = undefined;
    }
  }
  await update($, status, () => next);
}

export const register: Register = (on, options) => {
  bandOn = options.usage_band !== false;
  alertsOn = options.usage_alerts !== false;
  statusOn = options.status_row !== false;
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
      await refreshStatus($, true);
      // The reset countdown and the session time move by the minute; git may move any time.
      $.clock.every(60_000, () => {
        void tick($);
        void refreshStatus($).catch(() => undefined);
      });
      await $.command.register({
        name: "usage-pace",
        description:
          "Weekly plan limit: use, pace and reset time, with no model turn",
        immediate: true,
      });
      await $.command.register({
        name: "usage-band",
        description: "Show or hide the weekly plan limit above the prompt",
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
      await refreshStatus($, true);
      return next(e);
    },
  ).catch(($, e, next) => next(e));

  on("session.measure", async ($, e, next) => {
    try {
      if (e.changed.includes("rateLimits")) await record($, e.rateLimits);
      if (e.changed.includes("context") && statusOn) {
        const percent = e.context.percent;
        await update($, status, (s) => (s ? { ...s, ctx: percent } : s));
      }
    } catch {
      // A failed store or toast must not stop the measure chain.
    }
    return next(e);
  });

  // A turn's edits, commits and /model switches show once it ends.
  on("turn.complete", async ($, e, next) => {
    try {
      await refreshStatus($, true);
    } catch {
      // Nothing here is load-bearing.
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

  // The status row, then the weekly limit — on the same row when the band is wide enough —
  // drawn above whatever the other mods draw: the rows they get are the band's minus ours,
  // and their tree goes under ours, so ck-code's band stays.
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const t = await read($, now);
    if (e.props.hasSurvey || t === 0 || e.props.maxRows < 1) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    const snapshot = await read($, usage);
    const showUsage = bandOn && !(await read($, hidden));
    const all = showUsage ? paces(snapshot, t) : [];
    const s = statusOn ? await read($, status) : null;
    const sep = (k: string) => (
      <Text key={k} dimColor>
        │
      </Text>
    );

    // ---- the status row: ⎇ main +4 −0 ↑1 │ ◆ Opus 5.5 │ ctx ▰▱▱▱▱▱ 12% │ ◷ 1h05m
    const segs: { el: unknown; width: number }[] = [];
    if (s?.git) {
      const g = s.git;
      const bits = [
        <Text key="b" color="suggestion" bold>
          ⎇ {g.branch}
        </Text>,
      ];
      let width = 2 + g.branch.length;
      if (s.added || s.removed) {
        bits.push(
          <Text key="a" color="success">
            +{s.added}
          </Text>,
          <Text key="r" color="error">
            −{s.removed}
          </Text>,
        );
        width += `${s.added}${s.removed}`.length + 4;
      }
      if (g.ahead) {
        bits.push(
          <Text key="up" color="claude">
            ↑{g.ahead}
          </Text>,
        );
        width += String(g.ahead).length + 2;
      }
      if (g.behind) {
        bits.push(
          <Text key="dn" color="warning">
            ↓{g.behind}
          </Text>,
        );
        width += String(g.behind).length + 2;
      }
      if (g.untracked) {
        bits.push(
          <Text key="u" dimColor>
            ?{g.untracked}
          </Text>,
        );
        width += String(g.untracked).length + 2;
      }
      segs.push({
        el: (
          <Box key="git" gap={1}>
            {bits}
          </Box>
        ),
        width,
      });
    }
    if (s?.model)
      segs.push({
        el: (
          <Text key="model" color="claude">
            ◆ {s.model}
          </Text>
        ),
        width: 2 + s.model.length,
      });
    if (s?.ctx !== undefined) {
      const pct = fmtPercent(s.ctx);
      segs.push({
        el: (
          <Box key="ctx" gap={1}>
            <Text dimColor>ctx</Text>
            <Text color={ctxColor(s.ctx)}>{slimBar(s.ctx)}</Text>
            <Text bold>{pct}</Text>
          </Box>
        ),
        width: 12 + pct.length,
      });
    }
    if (s?.startedAt !== undefined) {
      const dur = sessionText(s.startedAt, t);
      segs.push({
        el: (
          <Text key="time" dimColor>
            ◷ {dur}
          </Text>
        ),
        width: 2 + dur.length,
      });
    }

    // ---- the weekly limit: 7d ████░░░░ 31% ✓ safe · ~58% at reset · resets 4d3h (as of 12m ago)
    const age = snapshot ? ageText(snapshot, t) : "";
    const cells = all.map((p, i) => {
      const reset = resetText(p);
      const note = i === all.length - 1 && age ? `(${age})` : "";
      const width =
        p.label.length +
        bar(p.used).length +
        fmtPercent(p.used).length +
        verdictText(p).length +
        (reset ? reset.length + 2 : 0) +
        (note ? note.length + 1 : 0) +
        4;
      return {
        width,
        el: (
          <Box key={`w-${p.kind}`} gap={1}>
            <Text bold>{p.label}</Text>
            <Text color={color(p.verdict)}>{bar(p.used)}</Text>
            <Text bold>{fmtPercent(p.used)}</Text>
            <Text color={color(p.verdict)} wrap="truncate-end">
              {verdictText(p)}
            </Text>
            {reset !== "" && (
              <Text dimColor wrap="truncate-end">
                · {reset}
              </Text>
            )}
            {note !== "" && (
              <Text dimColor wrap="truncate-end">
                {note}
              </Text>
            )}
          </Box>
        ),
      };
    });
    if (segs.length === 0 && cells.length === 0) return next(e);

    // Pack segments then cells into rows of at most bodyColumns, a separator between each.
    const items = [...segs, ...cells];
    const lines: { el: unknown; width: number }[][] = [];
    for (const it of items) {
      const line = lines[lines.length - 1];
      const used = line ? line.reduce((n, x) => n + x.width + 3, -3) : 0;
      if (line && used + 3 + it.width <= e.props.bodyColumns) line.push(it);
      else lines.push([it]);
    }
    const rows = Math.min(lines.length, e.props.maxRows);
    const mine = (
      <Box key="ck-tools" flexDirection="column">
        {lines.slice(0, rows).map((line, r) => (
          <Box key={`row-${r}`} gap={1}>
            {line.flatMap((x, i) => (i === 0 ? [x.el] : [sep(`s-${r}-${i}`), x.el]))}
          </Box>
        ))}
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
