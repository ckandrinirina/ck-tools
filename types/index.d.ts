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
    };
  }
}
