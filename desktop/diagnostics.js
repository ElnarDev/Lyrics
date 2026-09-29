const CODES = new Set([
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

function createDiagnostics({ maxEntries = 50, now = () => new Date() } = {}) {
  const entries = [];
  return {
    record(code) {
      if (!CODES.has(code)) return false;
      entries.push({ at: now().toISOString(), code });
      if (entries.length > maxEntries) entries.shift();
      return true;
    },
    report(version, platform = process.platform) {
      return JSON.stringify({ app: "Lyrics", version, platform, events: entries }, null, 2);
    },
  };
}

module.exports = { createDiagnostics };
