const assert = require("node:assert/strict");
const test = require("node:test");
const { cleanTitle, shortTitle, chooseResult, findLyrics } = require("../desktop/lyrics-provider");

function response(status, data) {
  return { status, ok: status === 200, json: async () => data };
}

test("removes localized guest-credit suffix without changing the song title", () => {
  assert.equal(cleanTitle("Till I Collapse (con Nate Dogg)"), "Till I Collapse");
  assert.equal(cleanTitle("Song [feat. Guest]"), "Song");
  assert.equal(cleanTitle("Live and Let Die"), "Live and Let Die");
});

test("tries the cleaned title after an exact miss and prefers synced lyrics", async () => {
  const urls = [];
  const request = async (url) => {
    urls.push(url);
    if (url.includes("%28con+Nate+Dogg%29")) return response(404);
    return response(200, {
      trackName: "Till I Collapse", artistName: "Eminem",
      syncedLyrics: "[00:12.00] First line", plainLyrics: "First line",
    });
  };
  const result = await findLyrics({ title: "Till I Collapse (con Nate Dogg)", artist: "Eminem • The Eminem Show" }, request);
  assert.equal(result.mode, "synced");
  assert.deepEqual(result.lines, [{ time: 12, text: "First line" }]);
  assert.equal(urls.length, 2);
});

test("does not display unsynchronized lines when no timed version exists", async () => {
  const request = async (url) => url.includes("/api/get?")
    ? response(200, { trackName: "Song", artistName: "Artist", plainLyrics: "One\nTwo" })
    : response(200, []);
  const result = await findLyrics({ title: "Song", artist: "Artist" }, request);
  assert.deepEqual(result, { mode: "unsynced-only", lines: [] });
});

test("search ignores a different song even if it has timed lyrics", async () => {
  const request = async (url) => url.includes("/api/get?") ? response(404) : response(200, [
    { trackName: "Different song", artistName: "Artist", syncedLyrics: "[00:01.00] Wrong" },
    { trackName: "Song", artistName: "Artist", plainLyrics: "Correct" },
  ]);
  const result = await findLyrics({ title: "Song", artist: "Artist" }, request);
  assert.deepEqual(result, { mode: "unsynced-only", lines: [] });
});

test("a soundtrack subtitle can be searched as a short title, unlike live or remix versions", () => {
  assert.equal(shortTitle("Sunflower (Spider-Man: Into the Spider-Verse)"), "Sunflower");
  assert.equal(shortTitle("Song (Live at Wembley)"), "");
  assert.equal(shortTitle("Song (Acoustic Version)"), "");
});

test("finds a synced short-title match only with matching album and duration", async () => {
  const track = { title: "Sunflower (Spider-Man: Into the Spider-Verse)", artist: "Post Malone y Swae Lee • Spider-Man: Into the Spider-Verse", album: "Spider-Man: Into the Spider-Verse (Soundtrack From & Inspired by the Motion Picture)", duration: 159 };
  const request = async (url) => {
    if (url.includes("/api/get?")) return response(200, {
      trackName: track.title, artistName: "Post Malone", albumName: track.album, duration: 159,
      plainLyrics: "Plain version",
    });
    if (url.includes("track_name=Sunflower&")) return response(200, [
      { trackName: "Sunflower", artistName: "Post Malone", albumName: "Different Album", duration: 159,
        syncedLyrics: "[00:01.00] Wrong version" },
      { trackName: "Sunflower", artistName: "Post Malone", albumName: track.album.replace("&", "&amp;"), duration: 158,
        syncedLyrics: "[00:01.00] Right version" },
    ]);
    return response(200, []);
  };
  const result = await findLyrics(track, request);
  assert.deepEqual(result, { mode: "synced", lines: [{ time: 1, text: "Right version" }] });
});

test("collaborating artist bylines search under the first artist", async () => {
  const urls = [];
  const request = async (url) => {
    urls.push(url);
    if (url.includes("artist_name=Post+Malone+y+Swae+Lee")) return url.includes("/api/get?") ? response(404) : response(200, []);
    return response(200, { trackName: "Sunflower", artistName: "Post Malone", syncedLyrics: "[00:01.00] Song" });
  };
  await findLyrics({ title: "Sunflower", artist: "Post Malone y Swae Lee" }, request);
  assert.match(urls[0], /artist_name=Post\+Malone\+y\+Swae\+Lee/);
  assert.ok(urls.some((url) => /artist_name=Post\+Malone(?:&|$)/.test(url)));
});

test("short-title match without album or duration is not trusted", async () => {
  const track = { title: "Sunflower (Spider-Man: Into the Spider-Verse)", artist: "Post Malone" };
  const request = async (url) => url.includes("/api/get?")
    ? response(200, { trackName: track.title, artistName: "Post Malone", plainLyrics: "Untimed" })
    : response(200, [{ trackName: "Sunflower", artistName: "Post Malone", syncedLyrics: "[00:01.00] Another song" }]);
  assert.deepEqual(await findLyrics(track, request), { mode: "unsynced-only", lines: [] });
});

test("album and duration are passed to the exact lookup", async () => {
  const urls = [];
  const track = { title: "Song", artist: "Artist", album: "Studio Album", duration: 220 };
  const request = async (url) => {
    urls.push(url);
    return response(200, {
      trackName: "Song", artistName: "Artist", albumName: "Studio Album", duration: 220,
      syncedLyrics: "[00:01.00] Correct",
    });
  };
  const result = await findLyrics(track, request);
  assert.equal(result.mode, "synced");
  assert.match(urls[0], /album_name=Studio\+Album/);
  assert.match(urls[0], /duration=220/);
  assert.equal(urls.length, 1);
});

test("search favors matching album and duration over the first synced result", () => {
  const track = { title: "Song", artist: "Artist", album: "Live Album", duration: 300 };
  const entries = [
    { trackName: "Song", artistName: "Artist", albumName: "Studio Album", duration: 220, syncedLyrics: "[00:01.00] Studio" },
    { trackName: "Song", artistName: "Artist", albumName: "Live Album", duration: 300, syncedLyrics: "[00:01.00] Live" },
  ];
  assert.deepEqual(chooseResult(entries, track).lines, [{ time: 1, text: "Live" }]);
});

test("ambiguous recordings with equal evidence are not chosen arbitrarily", () => {
  const track = { title: "Song", artist: "Artist" };
  const entries = [
    { trackName: "Song", artistName: "Artist", syncedLyrics: "[00:01.00] Version one" },
    { trackName: "Song", artistName: "Artist", syncedLyrics: "[00:01.00] Version two" },
  ];
  assert.deepEqual(chooseResult(entries, track), { mode: "ambiguous", lines: [] });
});

test("song matching keeps non-Latin titles distinct", () => {
  const track = { title: "夜に駆ける", artist: "YOASOBI" };
  const entries = [
    { trackName: "群青", artistName: "YOASOBI", syncedLyrics: "[00:01.00] Wrong" },
    { trackName: "夜に駆ける", artistName: "YOASOBI", syncedLyrics: "[00:01.00] Correct" },
  ];
  assert.deepEqual(chooseResult(entries, track).lines, [{ time: 1, text: "Correct" }]);
});

test("a mismatched exact response does not block a better searched recording", async () => {
  const track = { title: "Song", artist: "Artist", album: "Live Album", duration: 300 };
  const studio = { trackName: "Song", artistName: "Artist", albumName: "Studio Album", duration: 220,
    syncedLyrics: "[00:01.00] Studio" };
  const live = { trackName: "Song", artistName: "Artist", albumName: "Live Album", duration: 300,
    syncedLyrics: "[00:01.00] Live" };
  const request = async (url) => response(200, url.includes("/api/search?") ? [studio, live] : studio);
  assert.deepEqual((await findLyrics(track, request)).lines, [{ time: 1, text: "Live" }]);
});

test("finds a shorter provider artist only with matching album and duration", async () => {
  const track = { title: "Dios Mío Hasta Que Me Enamoré", artist: "Armonía 10 de Walther Lozada", album: "30 Años Armonia 10", duration: 190 };
  const request = async (url) => {
    if (url.includes("/api/get?")) return response(404);
    if (url.includes("artist_name=")) return response(200, []);
    return response(200, [
      { trackName: track.title, artistName: "Armonia 10", albumName: "Otro álbum", duration: 190, syncedLyrics: "[00:01.00] Wrong" },
      { trackName: track.title, artistName: "Armonia 10", albumName: track.album, duration: 190, syncedLyrics: "[00:02.00] Correct" },
    ]);
  };
  assert.deepEqual(await findLyrics(track, request), { mode: "synced", lines: [{ time: 2, text: "Correct" }] });
});

test("prefers the closest synced recording over an exact-album untimed entry", async () => {
  const track = { title: "El Jardín Prohibido", artist: "Alex Bueno • Alex Bueno • 1990", album: "Alex Bueno", duration: 326 };
  const plain = { trackName: track.title, artistName: "Alex Bueno", albumName: track.album,
    duration: 326, plainLyrics: "Untimed" };
  const synced = { trackName: track.title, artistName: "Alex Bueno, Alex Bueno, 1990",
    albumName: "", duration: 326, syncedLyrics: "[00:01.00] Timed" };
  const other = { trackName: track.title, artistName: "Alex Bueno", albumName: "Other album",
    duration: 326, syncedLyrics: "[00:01.00] Other recording" };
  const request = async (url) => response(200, url.includes("/api/get?") ? plain : [plain, other, synced]);
  assert.deepEqual(await findLyrics(track, request), { mode: "synced", lines: [{ time: 1, text: "Timed" }] });
});

test("a distant synced recording does not replace an untimed exact match", () => {
  const track = { title: "Song", artist: "Artist", album: "Album", duration: 326 };
  const result = chooseResult([
    { trackName: "Song", artistName: "Artist", albumName: "Album", duration: 326, plainLyrics: "Untimed" },
    { trackName: "Song", artistName: "Artist", albumName: "Other", duration: 331, syncedLyrics: "[00:01.00] Wrong" },
  ], track);
  assert.equal(result.mode, "plain");
});

test("equally close synced recordings remain ambiguous", () => {
  const track = { title: "Song", artist: "Artist", album: "Album", duration: 326 };
  const result = chooseResult([
    { trackName: "Song", artistName: "Artist", albumName: "Album", duration: 326, plainLyrics: "Untimed" },
    { trackName: "Song", artistName: "Artist", albumName: "Other A", duration: 326, syncedLyrics: "[00:01.00] A" },
    { trackName: "Song", artistName: "Artist", albumName: "Other B", duration: 326, syncedLyrics: "[00:01.00] B" },
  ], track);
  assert.deepEqual(result, { mode: "ambiguous", lines: [] });
});

test("searches a band credit before shortening the artist name", async () => {
  const track = { title: "Rebelión", artist: "Joe Arroyo y La Verdad • Musa Original • 1986",
    album: "Musa Original", duration: 376 };
  const urls = [];
  const request = async (url) => {
    urls.push(url);
    if (url.includes("/api/get?")) return response(404);
    return response(200, [
      { trackName: track.title, artistName: "Joe Arroyo", albumName: track.album,
        duration: 375, syncedLyrics: "[02:27.00] Wrong timing" },
      { trackName: track.title, artistName: "Joe Arroyo y La Verdad", albumName: track.album,
        duration: 375, syncedLyrics: "[01:10.00] Correct timing" },
    ]);
  };
  assert.deepEqual(await findLyrics(track, request), { mode: "synced", lines: [{ time: 70, text: "Correct timing" }] });
  assert.match(urls[0], /artist_name=Joe\+Arroyo\+y\+La\+Verdad/);
});
