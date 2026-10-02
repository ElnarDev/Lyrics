import type { LyricsResult, SyncedLine } from "../../shared/protocol.js";

export type ParsedLyrics = Extract<LyricsResult, { mode: "synced" | "plain" }>;

// El puente admite posiciones de reproducción de hasta 24 horas.
const MAX_LYRICS_TIME_SECONDS = 86400;

export function parseSyncedLyrics(source: string): SyncedLine[] {
  return source.split(/\r?\n/).flatMap((line) => {
    const matches = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, "").trim();
    const times = matches.map((match) => {
      const seconds = Number(match[2]);
      const time = Number(match[1]) * 60 + seconds;
      if (!Number.isFinite(time) || seconds >= 60 || time > MAX_LYRICS_TIME_SECONDS) return invalidResponse();
      return time;
    });
    return text ? times.map((time) => ({ time, text })) : [];
  }).sort((a, b) => a.time - b.time);
}

function invalidResponse(): never {
  const error = new Error("Invalid lyrics response");
  error.name = "InvalidLyricsResponse";
  throw error;
}

/** Datos de LRCLIB aún sin validar. */
export function resultFromEntry(entry: unknown): ParsedLyrics | null {
  if (entry == null) return null;
  if (typeof entry !== "object" || Array.isArray(entry)) return invalidResponse();
  const value = entry as Record<string, unknown>;
  if ((value.syncedLyrics != null && typeof value.syncedLyrics !== "string") ||
      (value.plainLyrics != null && typeof value.plainLyrics !== "string")) return invalidResponse();
  const synced = typeof value.syncedLyrics === "string" ? parseSyncedLyrics(value.syncedLyrics) : [];
  if (synced.length) return { mode: "synced", lines: synced };
  const plain = typeof value.plainLyrics === "string" ? value.plainLyrics.split(/\r?\n/)
    .map((line) => line.trim()).filter(Boolean) : [];
  return plain.length ? { mode: "plain", lines: plain } : null;
}
