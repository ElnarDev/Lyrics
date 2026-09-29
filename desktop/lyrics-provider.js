function primaryArtist(byline) {
  return byline.split(/[•·]/)[0].split(/\s+(?:y|and|&|x|feat\.?|ft\.?|con)\s+|,\s+/i)[0].trim();
}

function creditedArtist(byline) {
  return byline.split(/[•·]/)[0].trim();
}

function cleanTitle(title) {
  return title.trim().replace(/\s*[([]\s*(?:(?:feat(?:uring)?|ft|con)\.?\s+[^)\]]+)\s*[)\]]/gi, "").trim();
}

function shortTitle(title) {
  const cleaned = cleanTitle(title);
  const match = cleaned.match(/^(.*?)\s*[([]([^()\[\]]+)[)\]]$/);
  if (!match || /\b(?:live|remix|acoustic|demo|instrumental|radio edit|remaster(?:ed)?|sped up|slowed|karaoke|cover|version)\b/i.test(match[2])) return "";
  return match[1].trim();
}

function normalized(value) {
  return value.replace(/&amp;/gi, "&").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function parseSyncedLyrics(source) {
  return source.split(/\r?\n/).flatMap((line) => {
    const matches = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, "").trim();
    return text ? matches.map((match) => ({ time: Number(match[1]) * 60 + Number(match[2]), text })) : [];
  }).sort((a, b) => a.time - b.time);
}

function resultFromEntry(entry) {
  if (entry == null) return null;
  if (typeof entry !== "object" || Array.isArray(entry) ||
      (entry.syncedLyrics != null && typeof entry.syncedLyrics !== "string") ||
      (entry.plainLyrics != null && typeof entry.plainLyrics !== "string")) {
    const error = new Error("Invalid lyrics response");
    error.name = "InvalidLyricsResponse";
    throw error;
  }
  const synced = entry.syncedLyrics ? parseSyncedLyrics(entry.syncedLyrics) : [];
  if (synced.length) return { mode: "synced", lines: synced };
  const plain = entry.plainLyrics?.split(/\r?\n/).map((line) => line.trim())
    .filter(Boolean) || [];
  return plain.length ? { mode: "plain", lines: plain } : null;
}

function matchesTrack(entry, title, artist) {
  const candidateTitle = entry?.trackName || entry?.name;
  const candidateArtist = entry?.artistName;
  const expectedArtist = normalized(primaryArtist(artist));
  const actualArtist = typeof candidateArtist === "string" ? normalized(candidateArtist) : "";
  return typeof candidateTitle === "string" && typeof candidateArtist === "string" &&
    normalized(cleanTitle(candidateTitle)) === normalized(cleanTitle(title)) &&
    (actualArtist === expectedArtist || actualArtist.startsWith(`${expectedArtist} `));
}

function matchingScore(entry, track, result, aliasTitle = "") {
  const exactTitle = matchesTrack(entry, track.title, track.artist);
  const aliasMatch = aliasTitle && matchesTrack(entry, aliasTitle, track.artist);
  if (!exactTitle && !aliasMatch) return null;
  const knownDuration = track.duration > 0 && Number.isFinite(track.duration);
  const entryDuration = Number(entry.duration);
  if (knownDuration && entryDuration > 0 && Math.abs(track.duration - entryDuration) > 3) return null;
  if (!exactTitle && (!knownDuration || !entryDuration || Math.abs(track.duration - entryDuration) > 2 ||
    !track.album || normalized(entry.albumName || "") !== normalized(track.album))) return null;
  let score = result.mode === "synced" ? 3 : 0;
  if (exactTitle) score += 1;
  if (normalized(entry.artistName || "") === normalized(track.artist)) score += 5;
  else if (normalized(entry.artistName || "") === normalized(creditedArtist(track.artist))) score += 3;
  if (track.album && entry.albumName && normalized(entry.albumName) === normalized(track.album)) score += 4;
  if (knownDuration && entryDuration > 0) score += 5 - Math.min(3, Math.abs(track.duration - entryDuration));
  return score;
}

function chooseResult(entries, track, aliasTitle = "") {
  const candidates = entries.flatMap((entry) => {
    if (!matchesTrack(entry, track.title, track.artist) &&
      !(aliasTitle && matchesTrack(entry, aliasTitle, track.artist))) return [];
    const result = resultFromEntry(entry);
    if (!result) return [];
    const score = matchingScore(entry, track, result, aliasTitle);
    return score === null ? [] : [{ result, score, entry, content: entry.syncedLyrics || entry.plainLyrics }];
  }).sort((a, b) => b.score - a.score);
  if (!candidates.length) return { mode: "missing", lines: [] };
  const trustedSynced = candidates.filter(({ result, entry }) => result.mode === "synced" &&
    ((track.duration > 0 && Number(entry.duration) > 0 && Math.abs(track.duration - Number(entry.duration)) <= 2) ||
      (track.album && normalized(entry.albumName || "") === normalized(track.album))));
  const ranked = trustedSynced.length ? trustedSynced : candidates;
  const best = ranked[0];
  if (ranked.some((candidate) => candidate.score === best.score && candidate.content !== best.content)) {
    return { mode: "ambiguous", lines: [] };
  }
  return best.result;
}

async function findLyrics(track, request = fetch) {
  const artists = [...new Set([creditedArtist(track.artist), primaryArtist(track.artist)])];
  const titles = [...new Set([track.title.trim(), cleanTitle(track.title)])];
  const options = {
    headers: { "User-Agent": "LyricsOverlay/0.1 (local desktop prototype)" },
    signal: AbortSignal.timeout(4000),
  };
  const entries = [];
  let originalResult = { mode: "missing", lines: [] };
  for (const artistName of artists) {
    for (const candidate of titles) {
      const params = new URLSearchParams({ track_name: candidate, artist_name: artistName });
      if (track.album) params.set("album_name", track.album);
      if (track.duration > 0) params.set("duration", String(track.duration));
      const response = await request(`https://lrclib.net/api/get?${params}`, options);
      if (response.status === 404) continue;
      if (!response.ok) throw new Error(`Lyrics provider returned ${response.status}`);
      const entry = await response.json();
      if (!matchesTrack(entry, track.title, track.artist)) continue;
      const result = resultFromEntry(entry);
      if (!result || matchingScore(entry, track, result) === null) continue;
      entries.push(entry);
      const albumMatches = !track.album || normalized(entry.albumName || "") === normalized(track.album);
      const durationMatches = !track.duration || (Number(entry.duration) > 0 && Math.abs(track.duration - Number(entry.duration)) <= 2);
      const artistMatches = normalized(entry.artistName || "") === normalized(artistName) || !track.album || !track.duration;
      if (result.mode === "synced" && albumMatches && durationMatches && artistMatches) return result;
    }
    const params = new URLSearchParams({ track_name: cleanTitle(track.title), artist_name: artistName });
    const response = await request(`https://lrclib.net/api/search?${params}`, options);
    if (!response.ok) throw new Error(`Lyrics provider returned ${response.status}`);
    const entriesFromSearch = await response.json();
    if (!Array.isArray(entriesFromSearch)) {
      const error = new Error("Invalid lyrics search response");
      error.name = "InvalidLyricsResponse";
      throw error;
    }
    entries.push(...entriesFromSearch);
    originalResult = chooseResult(entries, track);
    if (originalResult.mode === "synced") return originalResult;
  }

  const artistName = artists[0];

  if (track.album && track.duration > 0) {
    const titleParams = new URLSearchParams({ track_name: cleanTitle(track.title) });
    const titleResponse = await request(`https://lrclib.net/api/search?${titleParams}`, options);
    if (!titleResponse.ok) throw new Error(`Lyrics provider returned ${titleResponse.status}`);
    const titleEntries = await titleResponse.json();
    if (!Array.isArray(titleEntries)) {
      const error = new Error("Invalid lyrics search response");
      error.name = "InvalidLyricsResponse";
      throw error;
    }
    const expectedArtist = normalized(primaryArtist(track.artist));
    const verifiedEntries = titleEntries.filter((entry) => {
      const candidateArtist = typeof entry?.artistName === "string" ? normalized(entry.artistName) : "";
      return candidateArtist && expectedArtist.startsWith(`${candidateArtist} `) &&
        normalized(cleanTitle(entry.trackName || entry.name || "")) === normalized(cleanTitle(track.title)) &&
        normalized(entry.albumName || "") === normalized(track.album) &&
        Number(entry.duration) > 0 && Math.abs(track.duration - Number(entry.duration)) <= 2;
    }).map((entry) => ({ ...entry, artistName: track.artist }));
    const fallbackResult = chooseResult(verifiedEntries, track);
    if (fallbackResult.mode === "synced" || fallbackResult.mode === "ambiguous") return fallbackResult;
  }

  const aliasTitle = shortTitle(track.title);
  let aliasHasPlainLyrics = false;
  if (aliasTitle && track.album && track.duration > 0) {
    const aliasParams = new URLSearchParams({ track_name: aliasTitle, artist_name: artistName });
    const aliasResponse = await request(`https://lrclib.net/api/search?${aliasParams}`, options);
    if (!aliasResponse.ok) throw new Error(`Lyrics provider returned ${aliasResponse.status}`);
    const aliasEntries = await aliasResponse.json();
    if (!Array.isArray(aliasEntries)) {
      const error = new Error("Invalid lyrics search response");
      error.name = "InvalidLyricsResponse";
      throw error;
    }
    const aliasResult = chooseResult(aliasEntries, track, aliasTitle);
    if (aliasResult.mode === "synced") return aliasResult;
    if (aliasResult.mode === "ambiguous") return aliasResult;
    aliasHasPlainLyrics = aliasResult.mode === "plain";
  }
  return originalResult.mode === "ambiguous" ? originalResult :
    { mode: originalResult.mode === "plain" || aliasHasPlainLyrics ? "unsynced-only" : "missing", lines: [] };
}

module.exports = { cleanTitle, shortTitle, parseSyncedLyrics, resultFromEntry, chooseResult, findLyrics };
