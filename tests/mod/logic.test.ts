import { expect, test } from "claude-code/testing";

import {
  alertsFor,
  bar,
  fmtDuration,
  pace,
  paces,
  parseThresholds,
  report,
  toReadings,
  verdictText,
} from "../../hooks/mod/logic";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-10-14T12:00:00Z");
const at = (ms: number) => new Date(NOW + ms).toISOString();

test("half a 7d window used halfway through projects 100%: tight", () => {
  // 3.5 days elapsed, 50% used → 100% projected: tight, not over.
  const p = pace(
    { kind: "seven_day", percentUsed: 50, resetsAt: at(84 * HOUR) },
    NOW,
  );
  expect(p.verdict).toBe("tight");
  expect(Math.round(p.projected!)).toBe(100);
  expect(p.resetsInMs).toBe(84 * HOUR);
});

test("a slow pace is safe and names the projected use at reset", () => {
  const p = pace(
    { kind: "seven_day", percentUsed: 20, resetsAt: at(84 * HOUR) },
    NOW,
  );
  expect(p.verdict).toBe("safe");
  expect(verdictText(p)).toBe("✓ safe · ~40% at reset");
});

test("a fast pace runs out before the reset, with the time it takes", () => {
  // 1 day elapsed, 40% used → 40%/day; 60% left → 1d12h, before the 6d reset.
  const p = pace(
    { kind: "seven_day", percentUsed: 40, resetsAt: at(144 * HOUR) },
    NOW,
  );
  expect(p.verdict).toBe("over");
  expect(p.runsOutInMs).toBe(36 * HOUR);
  expect(verdictText(p)).toBe("✗ out in 1d12h");
});

test("the first minutes of a window are too early to tell, unless use is already high", () => {
  const early = pace(
    { kind: "seven_day", percentUsed: 3, resetsAt: at(165 * HOUR) },
    NOW,
  );
  expect(early.verdict).toBe("early");
  const high = pace(
    { kind: "seven_day", percentUsed: 60, resetsAt: at(165 * HOUR) },
    NOW,
  );
  expect(high.verdict).toBe("over");
});

test("a used-up window is hit; a window past its reset has started over", () => {
  expect(
    pace({ kind: "seven_day", percentUsed: 100, resetsAt: at(HOUR) }, NOW)
      .verdict,
  ).toBe("hit");
  const reset = pace(
    { kind: "seven_day", percentUsed: 90, resetsAt: at(-1) },
    NOW,
  );
  expect(reset.used).toBe(0);
  expect(verdictText(reset)).toBe("✓ reset");
});

test("a window of unknown length gets a level, not a pace", () => {
  expect(
    pace({ kind: "spend_limit", percentUsed: 50, resetsAt: at(HOUR) }, NOW)
      .verdict,
  ).toBe("safe");
  expect(pace({ kind: "spend_limit", percentUsed: 92 }, NOW).verdict).toBe(
    "over",
  );
});

test("the retired 5h window is dropped; 7d comes before the rest", () => {
  const all = paces(
    {
      at: NOW,
      readings: [
        { kind: "spend_limit", percentUsed: 1 },
        { kind: "seven_day", percentUsed: 1, resetsAt: at(48 * HOUR) },
        { kind: "five_hour", percentUsed: 1, resetsAt: at(HOUR) },
      ],
    },
    NOW,
  );
  expect(all.map((p) => p.label)).toEqual(["7d", "$"]);
  expect(
    toReadings([
      { kind: "five_hour", percentUsed: 9 },
      { kind: "seven_day", percentUsed: 1 },
    ]).map((r) => r.kind),
  ).toEqual(["seven_day"]);
});

test("durations, bars and thresholds format compactly", () => {
  expect(fmtDuration(30_000)).toBe("<1m");
  expect(fmtDuration(45 * 60_000)).toBe("45m");
  expect(fmtDuration(2 * HOUR + 5 * 60_000)).toBe("2h05m");
  expect(fmtDuration(3 * HOUR)).toBe("3h");
  expect(fmtDuration(99 * HOUR)).toBe("4d3h");
  expect(bar(50)).toBe("████░░░░");
  expect(bar(130)).toBe("████████");
  expect(parseThresholds("95, 80,x,0,120")).toEqual([80, 95]);
});

test("each threshold toasts once per window, and again after a reset", () => {
  const r1 = { kind: "seven_day", percentUsed: 82, resetsAt: at(4 * HOUR) };
  const first = alertsFor(pace(r1, NOW), r1, [80, 95], undefined);
  expect(first.toasts.length).toBeGreaterThan(0);
  expect(first.toasts[0]).toBe("7d limit at 82% · resets 4h");
  const again = alertsFor(pace(r1, NOW), r1, [80, 95], first.next);
  expect(again.toasts).toEqual([]);
  const r2 = { ...r1, resetsAt: at(5 * HOUR) };
  const fresh = alertsFor(pace(r2, NOW), r2, [80, 95], first.next);
  expect(fresh.toasts[0]).toBe("7d limit at 82% · resets 5h");
});

test("the pace warning toasts once, when the window will run out before its reset", () => {
  const r = { kind: "seven_day", percentUsed: 40, resetsAt: at(144 * HOUR) };
  const out = alertsFor(pace(r, NOW), r, [80, 95], undefined);
  expect(out.toasts).toEqual([
    "7d limit: at this pace it runs out in 1d12h, before it resets 6d",
  ]);
  expect(alertsFor(pace(r, NOW), r, [80, 95], out.next).toasts).toEqual([]);
});

test("the report says when there is nothing to show, and the age of old figures", () => {
  expect(report(null, NOW)).toContain("No plan-limit reading yet");
  const text = report(
    {
      at: NOW - 20 * 60_000,
      readings: [
        { kind: "five_hour", percentUsed: 70, resetsAt: at(2 * HOUR) },
        { kind: "seven_day", percentUsed: 20, resetsAt: at(84 * HOUR) },
      ],
    },
    NOW,
  );
  expect(text).toContain("7d");
  expect(text).not.toContain("5h");
  expect(text).toContain("20% used");
  expect(text).toContain("(as of 20m ago)");
});
