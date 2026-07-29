# Native Claude Code commands — when to reach for them

These are **built-in Claude Code commands** (not ck-tools skills). ck-tools skills can
recommend them, but cannot toggle them for you — you type them. Use this map to pair
ck-tools' utility skills with Claude Code's native power.

## `/goal` — autonomous, criteria-driven completion (CC ≥ 2.1.139)

`/goal` sets a verifiable completion condition and keeps Claude working across turns
until a fast/cheap verifier model confirms it holds — no manual re-prompting.

| ck-tools skill | Suggested `/goal` |
|---|---|
| `implement` verification loop | `/goal "the build passes and all tests are green"` |
| `dependency-upgrade` phase | `/goal "the upgraded phase installs cleanly, builds, and tests pass with no new CVEs"` |

Token note: the verifier runs on a cheap model, so `/goal` is *cheaper* than re-prompting
each turn yourself. One goal per session; run `/goal` with no argument to see turns/tokens spent.

## `/fast` — faster Opus output (user toggle only)

`/fast` (or `"fastMode": true` in `~/.claude/settings.json`) routes through a faster
serving path — same Opus model (available on Opus 5 and 4.x), quicker output. **A plugin
cannot enable it for you.**

| Situation | `/fast`? |
|---|---|
| Small / mechanical: simple `implement` task, a focused `deliver` commit, a single `gh-issue` | ✅ **On** — deliberation not needed |
| Big / complex: large refactor, framework-major `dependency-upgrade`, multi-PR `release-prep` | 🧠 **Off** — keep full reasoning |

The skill-side lever that *is* automatic: `implement` already scales on `${CLAUDE_EFFORT}`.

## Other native commands worth pairing

- **`/code-review` / `/code-review --fix`** — deeper read-only diff review before `deliver` opens a PR; `--fix` applies findings.
- **`/context`** — visual context-usage grid; run it before a long `implement` or `dependency-upgrade`.
- **`/rewind`** — roll code+conversation back to a checkpoint before a risky change.
