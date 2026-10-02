import { parseSyncedLyrics, resultFromEntry } from "./lyrics-parser.js";
import { primaryArtist, creditedArtist, cleanTitle, shortTitle, normalized,
  matchesTrack, matchingScore, chooseResult, hasCompleteArtistCredit, parseEntryDuration,
  isValidEntryMetadata, isShortArtistCredit, type Selection, type TrackQuery } from "./lyrics-matcher.js";

export { parseSyncedLyrics, resultFromEntry, cleanTitle, shortTitle, chooseResult };

type LookupResult = Selection | { mode: "unsynced-only"; lines: [] };
type JsonResponse = { status: number; ok: boolean; json(): Promise<unknown> };
type Request = (url: string, options: { headers: { "User-Agent": string }; signal: AbortSignal }) => Promise<JsonResponse>;
type Entry = Record<string, unknown>;

function stringField(entry: Entry, name: string): string {
  return typeof entry[name] === "string" ? entry[name] : "";
}

function invalidSearchResponse(): never {
  const error = new Error("Invalid lyrics search response");
  error.name = "InvalidLyricsResponse";
  throw error;
}

async function searchEntries(url: string, request: Request, options: Parameters<Request>[1]): Promise<unknown[]> {
  const response = await request(url, options);
  if (!response.ok) {
    const error = new Error(`Lyrics provider returned ${response.status}`);
    if (response.status >= 500) error.name = "LyricsProviderUnavailable";
    throw error;
  }
  const entries = await response.json();
  return Array.isArray(entries) ? entries : invalidSearchResponse();
}

export async function findLyrics(track: TrackQuery, request: Request = fetch): Promise<LookupResult> {
  const primary = primaryArtist(track.artist);
  // Una consulta amplia ayuda a LRCLIB; matchesTrack conserva la identidad completa.
  const artists = [...new Set([creditedArtist(track.artist), primary, primary.split(/\s*&(?:amp;)?\s*/i)[0].trim()])];
  const titles = [...new Set([track.title.trim(), cleanTitle(track.title)])];
  const duration = track.duration || 0;
  const options = {
    headers: { "User-Agent": "LyricsOverlay/0.1 (local desktop prototype)" },
    signal: AbortSignal.timeout(4000),
  };
  const entries: unknown[] = [];
  let lookupError: Error | undefined;
  let originalResult: Selection = { mode: "missing", lines: [] };
  for (const artistName of artists) {
    for (const candidate of titles) {
      const params = new URLSearchParams({ track_name: candidate, artist_name: artistName });
      if (track.album) params.set("album_name", track.album);
      if (duration > 0) params.set("duration", String(duration));
      const response = await request(`https://lrclib.net/api/get?${params}`, options);
      if (response.status === 404) continue;
      if (response.status >= 500) {
        lookupError ??= new Error(`Lyrics provider returned ${response.status}`);
        continue;
      }
      if (!response.ok) throw new Error(`Lyrics provider returned ${response.status}`);
      const raw = await response.json();
      if (!matchesTrack(raw, track.title, track.artist)) continue;
      const result = resultFromEntry(raw);
      if (!result || matchingScore(raw, track, result) === null) continue;
      const entry = raw as Entry;
      entries.push(entry);
      const albumMatches = !track.album || normalized(stringField(entry, "albumName")) === normalized(track.album);
      const entryDuration = parseEntryDuration(entry.duration);
      const durationMatches = !duration || (entryDuration !== null && entryDuration > 0 && Math.abs(duration - entryDuration) <= 2);
      const artistMatches = normalized(stringField(entry, "artistName")) === normalized(artistName) || !track.album || !duration;
      const creditMatches = !track.album || !duration || hasCompleteArtistCredit(entry, track);
      if (result.mode === "synced" && albumMatches && durationMatches && artistMatches && creditMatches) return result;
    }
    const params = new URLSearchParams({ track_name: cleanTitle(track.title), artist_name: artistName });
    try {
      entries.push(...await searchEntries(`https://lrclib.net/api/search?${params}`, request, options));
    } catch (error: unknown) {
      if (!(error instanceof Error) || error.name !== "LyricsProviderUnavailable") throw error;
      lookupError ??= error;
      continue;
    }
    originalResult = chooseResult(entries, track);
    if (originalResult.mode === "synced") return originalResult;
  }

  const artistName = artists[0];
  const album = track.album;
  if (album && duration > 0) {
    const titleParams = new URLSearchParams({ track_name: cleanTitle(track.title) });
    const titleEntries = await searchEntries(`https://lrclib.net/api/search?${titleParams}`, request, options);
    const verifiedEntries = titleEntries.filter((raw): raw is Entry => {
      if (!isValidEntryMetadata(raw)) return false;
      const candidateArtist = stringField(raw, "artistName");
      const entryDuration = parseEntryDuration(raw.duration);
      return Boolean(isShortArtistCredit(candidateArtist, track.artist) &&
        normalized(cleanTitle(stringField(raw, "trackName") || stringField(raw, "name"))) === normalized(cleanTitle(track.title)) &&
        normalized(stringField(raw, "albumName")) === normalized(album) &&
        entryDuration !== null && entryDuration > 0 && Math.abs(duration - entryDuration) <= 2);
    }).map((entry) => ({ ...entry, artistName: track.artist }));
    const fallbackResult = chooseResult(verifiedEntries, track);
    if (fallbackResult.mode === "synced" || fallbackResult.mode === "ambiguous") return fallbackResult;
  }

  const aliasTitle = shortTitle(track.title);
  let aliasHasPlainLyrics = false;
  if (aliasTitle && track.album && duration > 0) {
    const aliasParams = new URLSearchParams({ track_name: aliasTitle, artist_name: artistName });
    const aliasEntries = await searchEntries(`https://lrclib.net/api/search?${aliasParams}`, request, options);
    const aliasResult = chooseResult(aliasEntries, track, aliasTitle);
    if (aliasResult.mode === "synced" || aliasResult.mode === "ambiguous") return aliasResult;
    aliasHasPlainLyrics = aliasResult.mode === "plain";
  }
  if (originalResult.mode === "missing" && !aliasHasPlainLyrics && lookupError) throw lookupError;
  return originalResult.mode === "ambiguous" ? originalResult :
    { mode: originalResult.mode === "plain" || aliasHasPlainLyrics ? "unsynced-only" : "missing", lines: [] };
}
