import { expect, test } from "claude-code/testing";

import { diskAlert, diskLevel, diskReport, dueAt, fmtSize, lowGb, parseDf, periodMs } from "../../hooks/mod/disk";

const GB = 1_048_576;
const HOUR = 3_600_000;
const r = (gb: number, totalGb = 500) => ({ freeKb: gb * GB, totalKb: totalGb * GB });

test("parseDf reads the size and Available columns of the last line", () => {
  const mac =
    "Filesystem   1024-blocks      Used Available Capacity  Mounted on\n" +
    "/dev/disk1s1   488245288 413420424  57795040    88%    /System/Volumes/Data\n";
  expect(parseDf(mac)).toEqual({ totalKb: 488245288, freeKb: 57795040 });
  const spaced = "Filesystem 1024-blocks Used Available Capacity Mounted on\nmap auto home 0 0 0 100% /home\n";
  expect(parseDf(spaced)).toBeUndefined();
  expect(parseDf("")).toBeUndefined();
  expect(parseDf("fatal: not df\n")).toBeUndefined();
  const linux = "Filesystem 1024-blocks Used Available Capacity Mounted on\nmy disk 1000 400 600 40% /\n";
  expect(parseDf(linux)).toEqual({ totalKb: 1000, freeKb: 600 });
});

test("diskLevel is GB only: low under the threshold, critical under a quarter", () => {
  expect(diskLevel(r(57))).toBe("ok");
  expect(diskLevel(r(19.9))).toBe("low");
  expect(diskLevel(r(4.9))).toBe("critical");
  expect(diskLevel(r(150, 2000))).toBe("ok");
  expect(diskLevel(r(40), 50)).toBe("low");
  expect(diskLevel(r(0.5), 2)).toBe("critical");
  expect(diskLevel(r(1.5), 2)).toBe("low");
});

test("settings fall back to a day and 20 GB", () => {
  expect(periodMs("week")).toBe(7 * 24 * HOUR);
  expect(periodMs(" Month ")).toBe(30 * 24 * HOUR);
  expect(periodMs("hour")).toBe(HOUR);
  expect(periodMs("fortnight")).toBe(24 * HOUR);
  expect(periodMs(undefined)).toBe(24 * HOUR);
  expect(lowGb("50")).toBe(50);
  expect(lowGb(" 5 ")).toBe(5);
  expect(lowGb("abc")).toBe(20);
  expect(lowGb("-3")).toBe(20);
  expect(lowGb(undefined)).toBe(20);
});

test("dueAt waits the period, but only an hour while space is short", () => {
  expect(dueAt(undefined, 7 * 24 * HOUR)).toBe(0);
  expect(dueAt({ ...r(100), at: 1000 }, 7 * 24 * HOUR)).toBe(1000 + 7 * 24 * HOUR);
  expect(dueAt({ ...r(10), at: 1000 }, 7 * 24 * HOUR)).toBe(1000 + HOUR);
});

test("diskAlert toasts once per step down and forgets once space is back", () => {
  const low = diskAlert("low", r(10), undefined);
  expect(low.toast).toBe("Disk space low: 10.0 GB free (2%) — /ck-tools:disk-clean shows what can go");
  expect(diskAlert("low", r(9), "low")).toEqual({ next: "low" });
  const crit = diskAlert("critical", r(3), "low");
  expect(crit.toast).toBe("Disk almost full: 3.0 GB free (1%) — run /ck-tools:disk-clean");
  expect(diskAlert("low", r(10), "critical")).toEqual({ next: "critical" });
  expect(diskAlert("ok", r(100), "critical")).toEqual({ next: "ok" });
  expect(diskAlert("low", r(10), "ok").toast).toContain("Disk space low");
});

test("fmtSize and the report", () => {
  expect(fmtSize(512 * 1024)).toBe("512 MB");
  expect(fmtSize(8.25 * GB)).toBe("8.3 GB");
  expect(fmtSize(465.6 * GB)).toBe("466 GB");
  expect(diskReport(undefined, 20, 24 * HOUR, 0)).toContain("No disk reading");
  const out = diskReport({ ...r(10), at: 0 }, 20, 7 * 24 * HOUR, 0);
  expect(out).toContain("10.0 GB free of 500 GB (2%)");
  expect(out).toContain("checked every week (hourly while low), next in ~1h");
});
