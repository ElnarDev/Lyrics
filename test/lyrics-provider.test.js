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
    return response(200, { trackName: "Sunflower", artistName: "Post Malone", syncedLyrics: "[00:01.00] Song" });
  };
  await findLyrics({ title: "Sunflower", artist: "Post Malone y Swae Lee" }, request);
  assert.match(urls[0], /artist_name=Post\+Malone(?:&|$)/);
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
