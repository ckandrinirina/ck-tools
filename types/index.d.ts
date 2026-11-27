// The ck-tools mod's $.state contract: what its band draws from.

declare module "claude-code" {
  interface PluginState {
    "ck-tools": {
      // The last plan-limit readings, from this session or, at start, another one.
      usage: {
        readings: { kind: string; percentUsed: number; resetsAt?: string }[];
        at: number;
      } | null;
      // The clock the band draws against (ms), moved once a minute; 0 before the first tick.
      now: number;
      hidden: boolean;
      // The status row: git branch and diff, model, context fill, session start.
      status: {
        git?: { branch: string; ahead: number; behind: number; untracked: number };
        added: number;
        removed: number;
        model: string;
        ctx?: number;
        startedAt?: number;
      } | null;
      // The last free-space reading of the session's disk, shared through the store.
      disk: { freeKb: number; totalKb: number; at: number } | null;
    };
  }
}
