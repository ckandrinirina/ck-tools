#!/usr/bin/env bash
# tests/smoke.sh — drives ck-tools' shell scripts (bin/ck-disk, bin/ck-tools-report,
# scripts/format.sh) against throwaway repositories. Docker is a generated stub that answers
# from files, so no daemon is ever touched.
# Bash 3.2, no deps beyond git, awk, sed.

set -uo pipefail

ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd -P)"
WORK="$(CDPATH='' cd -- "$(mktemp -d "${TMPDIR:-/tmp}/ck-tools-smoke.XXXXXX")" && pwd -P)"
trap 'rm -rf "$WORK"' EXIT
PASS=0; FAIL=0
US="$(printf '\037')"

ok()   { printf 'ok      %s\n' "$1"; PASS=$((PASS + 1)); }
bad()  { printf 'FAIL    %s\n' "$1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/        /'; FAIL=$((FAIL + 1)); }
has()  { case "$3" in *"$2"*) ok "$1" ;; *) bad "$1" "expected to contain: $2"$'\n'"got: $3" ;; esac; }
lacks(){ case "$3" in *"$2"*) bad "$1" "expected NOT to contain: $2"$'\n'"got: $3" ;; *) ok "$1" ;; esac; }
eq()   { [ "$2" = "$3" ] && ok "$1" || bad "$1" "expected: $2"$'\n'"got:      $3"; }
gitq() { git -c user.email=t@t -c user.name=t "$@"; }

# ---- stub docker -----------------------------------------------------------------------
# $STUB/up present = the daemon answers. $STUB/containers: id|working_dir|state per line.
# $STUB/orphans: rows of `docker ps -a --format` (id, state, working_dir, project, name).
# Every call is appended to $STUB/calls.
STUB="$WORK/stub"; mkdir -p "$STUB/bin"
cat >"$STUB/bin/docker" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$STUB/calls"
[ -f "$STUB/up" ] || exit 1
case "$1" in
  version) echo 27.0.0 ;;
  ps)
    wd=""; run=""; fmt=""
    for a in "$@"; do
      case "$a" in
        label=com.docker.compose.project.working_dir=*) wd="${a#label=com.docker.compose.project.working_dir=}" ;;
        status=running) run=1 ;;
        --format) fmt=1 ;;
      esac
    done
    if [ -n "$fmt" ]; then cat "$STUB/orphans" 2>/dev/null; exit 0; fi
    [ -n "$wd" ] || exit 0
    awk -F'|' -v wd="$wd" -v run="$run" '$2 == wd && (run == "" || $3 == "running") { print $1 }' "$STUB/containers" 2>/dev/null ;;
  rm) shift; for a in "$@"; do case "$a" in -*) ;; *) echo "$a" ;; esac; done ;;
esac
exit 0
EOF
chmod +x "$STUB/bin/docker"
export STUB
DISK() { PATH="$STUB/bin:$PATH" "$ROOT/bin/ck-disk" "$@"; }

# ---- ck-disk: worktrees ------------------------------------------------------------------
echo "=== ck-disk worktrees ==="
R="$WORK/roots/repo"; mkdir -p "$R" && cd "$R" && git init -q -b main . && echo a >a && gitq add a && gitq commit -qm init
for w in "done" dirty broken busy; do gitq worktree add -q "$WORK/roots/wt-$w" -b "$w"; done
echo x >"$WORK/roots/wt-dirty/new"
# a worktree whose index is garbage: `git status` fails there, so nothing can prove it clean
printf 'garbage' >"$(git -C "$WORK/roots/wt-broken" rev-parse --absolute-git-dir)/index"
touch "$STUB/up"
printf 'c-done|%s|exited\nc-busy|%s|running\n' "$WORK/roots/wt-done" "$WORK/roots/wt-busy" >"$STUB/containers"
: >"$STUB/calls"
out="$(DISK clean worktrees --root "$WORK/roots" 2>&1)"
has "clean worktrees: only the finished, idle one goes" "removed 1 finished worktree(s)" "$out"
[ ! -d "$WORK/roots/wt-done" ] && ok "clean worktrees: the finished worktree is removed" || bad "clean worktrees: the finished worktree is removed"
eq  "clean worktrees: its merged branch is deleted" "" "$(git branch --list "done")"
[ -d "$WORK/roots/wt-dirty" ] && ok "clean worktrees: uncommitted work is kept" || bad "clean worktrees: uncommitted work is kept"
[ -d "$WORK/roots/wt-broken" ] && ok "clean worktrees: a failing git status is never read as clean" || bad "clean worktrees: a failing git status is never read as clean"
[ -d "$WORK/roots/wt-busy" ] && ok "clean worktrees: a worktree with a running container is kept" || bad "clean worktrees: a worktree with a running container is kept"
has "clean worktrees: names the worktree kept for its running container" "kept 1 with a running container" "$out"
has "clean worktrees: a stopped container of the removed worktree goes" "rm -v c-done" "$(cat "$STUB/calls")"
lacks "clean worktrees: never force-removes a container" "rm -f" "$(cat "$STUB/calls")"
rm -f "$STUB/up"; : >"$STUB/calls"
gitq -C "$R" worktree add -q "$WORK/roots/wt-done2" -b done2
out="$(DISK clean worktrees --root "$WORK/roots" 2>&1)"
has "clean worktrees: without Docker nothing is running, both finished ones go" "removed 2 finished worktree(s)" "$out"

# ---- ck-disk: docker-orphans --------------------------------------------------------------
echo "=== ck-disk docker-orphans ==="
touch "$STUB/up"; : >"$STUB/calls"
printf '%s\n' "o-stopped${US}exited${US}$WORK/gone-a${US}a${US}a-1" "o-running${US}running${US}$WORK/gone-b${US}b${US}b-1" >"$STUB/orphans"
out="$(DISK clean docker-orphans 2>&1)"
has "docker-orphans: removes the stopped orphan" "removed 1 container(s)" "$out"
has "docker-orphans: names the running one it kept" "kept 1 running" "$out"
lacks "docker-orphans: never removes a running container" "o-running" "$(grep '^rm' "$STUB/calls")"
lacks "docker-orphans: never force-removes" "rm -f" "$(cat "$STUB/calls")"
rm -f "$STUB/up"
has "docker-orphans: no daemon, skipped" "Docker is not running, skipped" "$(DISK clean docker-orphans 2>&1)"
has "ck-disk: an unknown key is skipped, not fatal" "unknown key, skipped" "$(DISK clean bogus 2>&1)"
DISK frobnicate >/dev/null 2>&1; eq "ck-disk: an unknown command exits 2" 2 "$?"

# ---- ck-tools-report hook ---------------------------------------------------------------
echo "=== report hook ==="
export XDG_CACHE_HOME="$WORK/cache"
ev() {  # session, event, error text → a hook payload
  printf '{"session_id":"%s","hook_event_name":"%s","tool_name":"Bash","tool_input":{"command":"ck-disk scan"},"error":"%s"}' "$1" "$2" "$3"
}
eq  "report hook: ordinary output says nothing" "" "$(ev s1 PostToolUse 'all fine' | "$ROOT/bin/ck-tools-report" hook)"
CRASH="$ROOT/bin/ck-disk: line 12: foo: unbound variable"
out="$(ev s1 PostToolUseFailure "$CRASH" | "$ROOT/bin/ck-tools-report" hook)"
has "report hook: a crash in the plugin's own script is flagged" "ck-tools auto-report" "$out"
has "report hook: names the script relative to the plugin" "<plugin>/bin/ck-disk" "$out"
eq  "report hook: the same crash is flagged once per session" "" "$(ev s1 PostToolUseFailure "$CRASH" | "$ROOT/bin/ck-tools-report" hook)"
eq  "report hook: a crash outside the plugin is not ours" "" "$(ev s2 PostToolUseFailure '/usr/local/bin/x: line 3: y: unbound variable' | "$ROOT/bin/ck-tools-report" hook)"
"$ROOT/bin/ck-tools-report" hook </dev/null; eq "report hook: empty input exits 0" 0 "$?"
has "report env: names this plugin" "ck-tools " "$("$ROOT/bin/ck-tools-report" env)"

# ---- format.sh ------------------------------------------------------------------------------
echo "=== format hook ==="
F="$WORK/fmt"; mkdir -p "$F" && cd "$F" && printf 'a  =  1\n' >x.md
fev() { printf '{"tool_name":"Write","tool_input":{"file_path":"%s"}}' "$1"; }
fev "$F/x.md" | "$ROOT/scripts/format.sh"; eq "format: always exits 0" 0 "$?"
eq  "format: no prettier config, the file is left alone" "a  =  1" "$(cat x.md)"
fev "$WORK/missing.md" | "$ROOT/scripts/format.sh"; eq "format: a missing file is a no-op" 0 "$?"
printf 'not json' | "$ROOT/scripts/format.sh"; eq "format: a garbled event is a no-op" 0 "$?"

echo
echo "smoke: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
