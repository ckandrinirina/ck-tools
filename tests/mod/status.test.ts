import { expect, test } from "claude-code/testing";

import {
  ctxColor,
  modelName,
  parseGitStatus,
  parseShortstat,
  pillSvg,
  sessionText,
} from "../../hooks/mod/status";

test("modelName turns an id into its family and version, aliases into words", () => {
  expect(modelName("claude-opus-5-5")).toBe("Opus 5.5");
  expect(modelName("claude-sonnet-5-5[1m]")).toBe("Sonnet 5.5 · 1M");
  expect(modelName("claude-haiku-5-5-20261001")).toBe("Haiku 5.5");
  expect(modelName("opus")).toBe("Opus");
  expect(modelName("Opus 5.5")).toBe("Opus 5.5");
  expect(modelName("")).toBe("");
});

test("parseGitStatus reads the branch, ahead/behind and untracked count", () => {
  const out = [
    "# branch.oid 5fbcbfc0",
    "# branch.head main",
    "# branch.upstream origin/main",
    "# branch.ab +2 -1",
    "1 .M N... 100644 100644 100644 a b .gitignore",
    "? playground/",
    "? scripts/playground.sh",
  ].join("\n");
  expect(parseGitStatus(out)).toEqual({
    branch: "main",
    ahead: 2,
    behind: 1,
    untracked: 2,
  });
});

test("a detached HEAD shows its short commit", () => {
  const out = "# branch.oid 5fbcbfc0123456\n# branch.head (detached)\n";
  expect(parseGitStatus(out)?.branch).toBe("@5fbcbfc");
});

test("parseGitStatus refuses output that is not a status", () => {
  expect(parseGitStatus("")).toBeUndefined();
  expect(parseGitStatus("fatal: not a git repository")).toBeUndefined();
});

test("parseShortstat reads insertions and deletions, either may be missing", () => {
  expect(
    parseShortstat(" 2 files changed, 4 insertions(+), 1 deletion(-)\n"),
  ).toEqual({ added: 4, removed: 1 });
  expect(parseShortstat(" 1 file changed, 3 insertions(+)")).toEqual({
    added: 3,
    removed: 0,
  });
  expect(parseShortstat("")).toEqual({ added: 0, removed: 0 });
});

test("ctxColor warns as the window fills", () => {
  expect(ctxColor(10)).toBe("success");
  expect(ctxColor(60)).toBe("warning");
  expect(ctxColor(85)).toBe("error");
});

test("sessionText counts from the start", () => {
  expect(sessionText(1000, 1000 + 30_000)).toBe("<1m");
  expect(sessionText(0, 65 * 60_000)).toBe("1h05m");
});

test("pillSvg fills its share in the verdict's color and clamps", () => {
  const half = pillSvg(50, "warning", 80);
  expect(half).toContain('width="40"');
  expect(half).toContain("#d29922");
  expect(pillSvg(0, "success", 80)).not.toContain("#3fb950");
  expect(pillSvg(250, "error", 80)).toContain('<rect width="80" height="8" rx="4" fill="#e5534b"/>');
  expect(pillSvg(Number.NaN, "nope", 80)).toMatch(/^<svg .*<\/svg>$/);
});
