import { resultFromEntry, type ParsedLyrics } from "./lyrics-parser.js";
import type { LyricsResult, TrackMetadata } from "../../shared/protocol.js";

export type TrackQuery = TrackMetadata;

type Entry = Record<string, unknown>;
export type Selection = ParsedLyrics | { mode: Extract<LyricsResult["mode"], "missing" | "ambiguous">; lines: [] };

export function primaryArtist(byline: string): string {
  // Conserva nombres compuestos con &, como Chino & Nacho.
  return byline.split(/[•·]/)[0].split(/\s+(?:y|and|x|feat(?:uring)?\.?|ft\.?|con)\s+|,\s+|\//i)[0].trim();
}

export function creditedArtist(byline: string): string {
  return byline.split(/[•·]/)[0].trim();
}

export function cleanTitle(title: string): string {
  return title.trim().replace(/\s*[([]\s*(?:(?:feat(?:uring)?|ft|con)\.?\s+[^)\]]+)\s*[)\]]/gi, "").trim();
}

export function shortTitle(title: string): string {
  const cleaned = cleanTitle(title);
  const match = cleaned.match(/^(.*?)\s*[([]([^()\[\]]+)[)\]]$/);
  if (!match || /\b(?:live|remix|acoustic|demo|instrumental|radio edit|remaster(?:ed)?|sped up|slowed|karaoke|cover|version)\b/i.test(match[2])) return "";
  return match[1].trim();
}

export function normalized(value: string): string {
  return value.replace(/&amp;/gi, "&").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function field(entry: Entry, name: string): string {
  return typeof entry[name] === "string" ? entry[name] : "";
}

/** Ausente/null equivale a duración desconocida; un valor malformado se rechaza. */
export function parseEntryDuration(value: unknown): number | null {
  if (value == null) return 0;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 86400 ? value : null;
}

/** Límites de identidad alineados con los metadatos admitidos por el puente. */
export function isValidEntryMetadata(raw: unknown): raw is Entry {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return false;
  const entry = raw as Entry;
  for (const [name, limit] of [["trackName", 300], ["name", 300], ["artistName", 500], ["albumName", 300]] as const) {
    const value = entry[name];
    if (value != null && (typeof value !== "string" || value.length > limit)) return false;
  }
  const title = entry.trackName || entry.name;
  return typeof title === "string" && Boolean(title.trim()) &&
    typeof entry.artistName === "string" && Boolean(entry.artistName.trim()) &&
    parseEntryDuration(entry.duration) !== null;
}

function artistNames(credit: string): string[] {
  return credit.replace(/&amp;/gi, "&")
    .split(/\s+(?:y|and|x|feat(?:uring)?\.?|ft\.?|con)\s+|\s*[&,/]\s*/i)
    .map(normalized).filter(Boolean);
}

/** Permite abreviar un nombre extendido, pero nunca quitar un miembro del dúo. */
export function isShortArtistCredit(candidate: string, artist: string): boolean {
  const primary = primaryArtist(artist);
  return artistNames(primary).length === 1 && artistNames(candidate).length === 1 &&
    Boolean(normalized(candidate)) && normalized(primary).startsWith(`${normalized(candidate)} `);
}

function titleGuests(title: string): string[] {
  return [...title.matchAll(/[([]\s*(?:feat(?:uring)?|ft|con)\.?\s+([^)\]]+)[)\]]/gi)]
    .flatMap((match) => artistNames(match[1]));
}

function expectedCredits(track: TrackQuery): string[] {
  return [...new Set([...artistNames(creditedArtist(track.artist)), ...titleGuests(track.title)])];
}

function entryCredits(entry: Entry): string[] {
  return [...new Set([...artistNames(field(entry, "artistName")),
    ...titleGuests(field(entry, "trackName") || field(entry, "name"))])];
}

export function hasCompleteArtistCredit(raw: unknown, track: TrackQuery): boolean {
  if (!isValidEntryMetadata(raw)) return false;
  const actual = entryCredits(raw);
  return expectedCredits(track).every((name) => actual.includes(name));
}

export function matchesTrack(raw: unknown, title: string, artist: string): boolean {
  if (!isValidEntryMetadata(raw)) return false;
  const entry = raw;
  const candidateTitle = entry.trackName || entry.name;
  const candidateArtist = entry.artistName;
  const expectedArtists = artistNames(primaryArtist(artist));
  const actualArtists = typeof candidateArtist === "string" ? artistNames(candidateArtist) : [];
  return typeof candidateTitle === "string" && typeof candidateArtist === "string" &&
    normalized(cleanTitle(candidateTitle)) === normalized(cleanTitle(title)) &&
    expectedArtists.length > 0 && expectedArtists.every((name) => actualArtists.includes(name));
}

export function matchingScore(raw: unknown, track: TrackQuery, result: ParsedLyrics, aliasTitle = ""): number | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entry = raw as Entry;
  const exactTitle = matchesTrack(entry, track.title, track.artist);
  const aliasMatch = aliasTitle && matchesTrack(entry, aliasTitle, track.artist);
  if (!exactTitle && !aliasMatch) return null;
  const duration = track.duration || 0;
  const knownDuration = duration > 0 && Number.isFinite(duration);
  const entryDuration = parseEntryDuration(entry.duration);
  if (entryDuration === null) return null;
  if (knownDuration && entryDuration > 0 && Math.abs(duration - entryDuration) > 3) return null;
  if (!exactTitle && (!knownDuration || !entryDuration || Math.abs(duration - entryDuration) > 2 ||
    !track.album || normalized(field(entry, "albumName")) !== normalized(track.album))) return null;
  let score = result.mode === "synced" ? 3 : 0;
  if (exactTitle) score += 1;
  if (normalized(field(entry, "artistName")) === normalized(track.artist)) score += 5;
  else if (normalized(field(entry, "artistName")) === normalized(creditedArtist(track.artist))) score += 3;
  if (track.album && entry.albumName && normalized(field(entry, "albumName")) === normalized(track.album)) score += 4;
  if (knownDuration && entryDuration > 0) score += 5 - Math.min(3, Math.abs(duration - entryDuration));
  // Los colaboradores solo desempatan grabaciones con álbum y duración próximos.
  if (track.album && normalized(field(entry, "albumName")) === normalized(track.album) &&
    knownDuration && entryDuration > 0 && Math.abs(duration - entryDuration) <= 2) {
    const expected = expectedCredits(track);
    const actual = entryCredits(entry);
    if (expected.length > 1) score += 3 * expected.filter((name) => actual.includes(name)).length;
  }
  return score;
}

export function chooseResult(entries: unknown[], track: TrackQuery, aliasTitle = ""): Selection {
  const candidates = entries.flatMap((raw) => {
    if (!matchesTrack(raw, track.title, track.artist) &&
      !(aliasTitle && matchesTrack(raw, aliasTitle, track.artist))) return [];
    const entry = raw as Entry;
    const result = resultFromEntry(entry);
    if (!result) return [];
    const score = matchingScore(entry, track, result, aliasTitle);
    return score === null ? [] : [{ result, score, entry, content: entry.syncedLyrics || entry.plainLyrics }];
  }).sort((a, b) => b.score - a.score);
  if (!candidates.length) return { mode: "missing", lines: [] };
  const duration = track.duration || 0;
  const trustedSynced = candidates.filter(({ result, entry }) => {
    const entryDuration = parseEntryDuration(entry.duration);
    return result.mode === "synced" &&
      ((duration > 0 && entryDuration !== null && entryDuration > 0 && Math.abs(duration - entryDuration) <= 2) ||
        (track.album && normalized(field(entry, "albumName")) === normalized(track.album)));
  });
  const ranked = trustedSynced.length ? trustedSynced : candidates;
  const best = ranked[0];
  if (ranked.some((candidate) => candidate.score === best.score && candidate.content !== best.content)) {
    return { mode: "ambiguous", lines: [] };
  }
  return best.result;
}
