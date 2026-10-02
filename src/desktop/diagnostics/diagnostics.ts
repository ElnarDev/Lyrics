const CODES: ReadonlySet<string> = new Set([
  "window-state-save-failed",
  "lyrics-timeout",
  "lyrics-offline",
  "lyrics-invalid-response",
  "lyrics-error",
  "bridge-socket-error",
  "bridge-unavailable",
  "bridge-auth-init-failed",
  "compact-shortcut-unavailable",
  "retry-shortcut-unavailable",
]);

interface DiagnosticEvent {
  at: string;
  code: string;
}

export function createDiagnostics({ maxEntries = 50, now = () => new Date() }: {
  maxEntries?: number;
  now?: () => Date;
} = {}) {
  const entries: DiagnosticEvent[] = [];
  return {
    record(code: unknown): boolean {
      if (typeof code !== "string" || !CODES.has(code)) return false;
      entries.push({ at: now().toISOString(), code });
      if (entries.length > maxEntries) entries.shift();
      return true;
    },
    report(version: string, platform = process.platform): string {
      return JSON.stringify({ app: "Lyrics", version, platform, events: entries }, null, 2);
    },
  };
}
