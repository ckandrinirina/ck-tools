import { expect, mock, test } from "claude-code/testing";
import type { On } from "claude-code";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-10-14T12:00:00Z");
const at = (ms: number) => new Date(NOW + ms).toISOString();

const LIMITS = [
  { kind: "seven_day", percentUsed: 31, resetsAt: at(99 * HOUR) },
  { kind: "five_hour", percentUsed: 40, resetsAt: at(4 * HOUR) },
];
// The 5-hour window is retired: a reading of it, fresh or saved, is never drawn or toasted.

const BAND = {
  plugin: "ck-tools",
  surface: "terminal",
  component: "AbovePrompt",
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 160,
    scroll: { offset: 0, bodyRows: 4 },
    view: {},
  },
} as const;

// A session at NOW with these limits, a store the test can read, and toasts collected.
function session(
  on: On,
  limits: unknown[],
  saved: Record<string, unknown> = {},
  started: { startedAt: number; percent?: number } = { startedAt: NOW },
) {
  const toasts: string[] = [];
  mock.clock(on, { now: NOW });
  on("store.get", (_$, e) => ({ value: saved[e.key] }));
  on("store.set", (_$, e) => {
    saved[e.key] = e.value;
    return { value: undefined };
  });
  on("session.usage", () => ({
    value: {
      startedAt: started.startedAt,
      context: { window: 200000, percent: started.percent },
      rateLimits: limits,
    },
  }));
  on("command.register", () => ({ value: undefined }));
  on("ui.toast", (_$, e) => {
    toasts.push(e.text);
    return { value: undefined };
  });
  on("session.start", () => ({ cwd: "/p" }));
  on("ui.render", () => ({
    type: "Text",
    props: {},
    children: ["other band"],
  }));
  return { toasts, saved };
}

test("the band shows the weekly use, pace and reset, above the other bands; never 5h", async ($, on) => {
  session(on, LIMITS);
  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/p",
  });
  const ui = await $.ui.mount(BAND as never);
  expect(await ui.find({ text: "7d" })).toBeDefined();
  expect(await ui.find({ text: "31%" })).toBeDefined();
  expect(await ui.find({ text: /resets 4d3h/ })).toBeDefined();
  expect(await ui.find({ text: "5h" })).toBeUndefined();
  expect(await ui.find({ text: "40%" })).toBeUndefined();
  expect(await ui.find({ text: "other band" })).toBeDefined();
});

test("nothing is drawn off a subscription, with no saved reading", async ($, on) => {
  session(on, []);
  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/p",
  });
  const ui = await $.ui.mount(BAND as never);
  expect(await ui.find({ text: "other band" })).toBeDefined();
  expect(await ui.find({ text: "7d" })).toBeUndefined();
  const out = await $.command.run({ command: "usage-pace", args: "" });
  expect(out.text).toContain("No plan-limit reading yet");
});

test("a new session draws the saved reading at once, with its age", async ($, on) => {
  const last = {
    at: NOW - 30 * 60_000,
    readings: [
      { kind: "five_hour", percentUsed: 77, resetsAt: at(3 * HOUR) },
      { kind: "seven_day", percentUsed: 12, resetsAt: at(100 * HOUR) },
    ],
  };
  session(on, [], { last });
  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/p",
  });
  const ui = await $.ui.mount(BAND as never);
  expect(await ui.find({ text: "12%" })).toBeDefined();
  expect(await ui.find({ text: /as of 30m ago/ })).toBeDefined();
  expect(await ui.find({ text: "77%" })).toBeUndefined();
});

test("a measured reading is saved and toasts its thresholds once", async ($, on) => {
  const { toasts, saved } = session(on, []);
  on("session.measure", (_$, e) => ({ changed: e.changed }));
  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/p",
  });
  const high = [{ kind: "seven_day", percentUsed: 81, resetsAt: at(140 * HOUR) }];
  const five = { kind: "five_hour", percentUsed: 99, resetsAt: at(1 * HOUR) };
  const measure = {
    context: { window: 200000 },
    rateLimits: [...high, five],
    changed: ["rateLimits"],
  } as never;
  await $.session.measure(measure);
  await $.session.measure(measure);
  expect(toasts).toEqual([
    "7d limit at 81% · resets 5d20h",
    "7d limit: at this pace it runs out in 6h34m, before it resets 5d20h",
  ]);
  expect((saved.last as { readings: unknown[] }).readings).toEqual(high);
});

test("/usage-band hides the band and remembers it; the other bands stay", async ($, on) => {
  const { saved } = session(on, LIMITS);
  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/p",
  });
  const out = await $.command.run({ command: "usage-band", args: "" });
  expect(out.text).toContain("hidden");
  expect(saved.hidden).toBe(true);
  const ui = await $.ui.mount(BAND as never);
  expect(await ui.find({ text: "7d" })).toBeUndefined();
  expect(await ui.find({ text: "other band" })).toBeDefined();
});

test("after /clear the saved reading comes back", async ($, on) => {
  const last = {
    at: NOW,
    readings: [{ kind: "seven_day", percentUsed: 55, resetsAt: at(48 * HOUR) }],
  };
  session(on, [], { last });
  on("classic.SessionStart", () => ({}));
  await $.classic.SessionStart({ source: "clear" } as never);
  const ui = await $.ui.mount(BAND as never);
  expect(await ui.find({ text: "55%" })).toBeDefined();
});

test("a narrow band puts the weekly limit under the status row", async ($, on) => {
  session(on, LIMITS);
  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/p",
  });
  const ui = await $.ui.mount({
    ...BAND,
    props: { ...BAND.props, bodyColumns: 80 },
  } as never);
  expect(await ui.find({ text: "5h" })).toBeUndefined();
  expect(await ui.find({ text: "7d" })).toBeDefined();
  expect(await ui.find({ text: "other band" })).toBeDefined();
});

// A session on Opus, 12% of its context used, started 65 minutes ago; in a git repo or not.
function repo(on: On, isRepo = true) {
  session(on, LIMITS, {}, { startedAt: NOW - 65 * 60_000, percent: 12 });
  on("session.model", () => ({ value: "claude-opus-5-5" }));
  on("session.cwd", () => ({ value: "/p" }));
  on("process.run", (_$, e) => ({
    value: !isRepo
      ? { exitCode: 128, stderr: "fatal", stdout: "" }
      : e.argv[1] === "status"
        ? {
            exitCode: 0,
            stderr: "",
            stdout:
              "# branch.oid abc\n# branch.head main\n# branch.ab +1 -0\n? x\n",
          }
        : {
            exitCode: 0,
            stderr: "",
            stdout: " 1 file changed, 4 insertions(+)\n",
          },
  }));
}

test("the status row shows branch, diff, model, context and session time", async ($, on) => {
  repo(on);
  await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/p" });
  const ui = await $.ui.mount(BAND as never);
  expect(await ui.find({ text: "⎇ main" })).toBeDefined();
  expect(await ui.find({ text: "+4" })).toBeDefined();
  expect(await ui.find({ text: "−0" })).toBeDefined();
  expect(await ui.find({ text: "↑1" })).toBeDefined();
  expect(await ui.find({ text: "?1" })).toBeDefined();
  expect(await ui.find({ text: "◆ Opus 5.5" })).toBeDefined();
  expect(await ui.find({ text: "12%" })).toBeDefined();
  expect(await ui.find({ text: "◷ 1h05m" })).toBeDefined();
  expect(await ui.find({ text: "7d" })).toBeDefined();
  expect(await ui.find({ text: "other band" })).toBeDefined();
});

test("/usage-band hides the weekly limit only; the status row stays", async ($, on) => {
  repo(on);
  await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/p" });
  await $.command.run({ command: "usage-band", args: "" });
  const ui = await $.ui.mount(BAND as never);
  expect(await ui.find({ text: "7d" })).toBeUndefined();
  expect(await ui.find({ text: "◆ Opus 5.5" })).toBeDefined();
});

test("outside a git repo the row draws without the branch", async ($, on) => {
  repo(on, false);
  await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/p" });
  const ui = await $.ui.mount(BAND as never);
  expect(await ui.find({ text: /⎇/ })).toBeUndefined();
  expect(await ui.find({ text: "◆ Opus 5.5" })).toBeDefined();
});
