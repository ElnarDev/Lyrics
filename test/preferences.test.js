const assert = require("node:assert/strict");
const test = require("node:test");
const { STORAGE_KEY, OFFSETS_KEY, normalize, load, save, loadOffset, saveOffset } = require("../desktop/preferences");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("display preferences survive a new session", () => {
  const storage = memoryStorage();
  assert.deepEqual(load(storage), { windowOpacity: 92, lyricsOpacity: 100, fontSize: 27 });
  assert.equal(save(storage, { windowOpacity: "25", lyricsOpacity: "70", fontSize: "34" }), true);
  assert.deepEqual(load(storage), { windowOpacity: 25, lyricsOpacity: 70, fontSize: 34 });
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).fontSize, 34);
});

test("invalid or out-of-range preferences cannot break the controls", () => {
  assert.deepEqual(normalize({ windowOpacity: -5, lyricsOpacity: 999, fontSize: "oops" }), {
    windowOpacity: 0, lyricsOpacity: 100, fontSize: 27,
  });
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, "{invalid json");
  assert.deepEqual(load(storage), { windowOpacity: 92, lyricsOpacity: 100, fontSize: 27 });
});

test("unavailable storage falls back to defaults without crashing", () => {
  const storage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.deepEqual(load(storage), { windowOpacity: 92, lyricsOpacity: 100, fontSize: 27 });
  assert.equal(save(storage, { windowOpacity: 50 }), false);
});

test("sync offsets are saved per song and can be reset", () => {
  const storage = memoryStorage();
  assert.equal(saveOffset(storage, "song-a", .5), true);
  assert.equal(saveOffset(storage, "song-b", -1), true);
  assert.equal(loadOffset(storage, "song-a"), .5);
  assert.equal(loadOffset(storage, "song-b"), -1);
  assert.equal(saveOffset(storage, "song-a", 0), true);
  assert.equal(loadOffset(storage, "song-a"), 0);
  assert.equal(loadOffset(storage, "song-b"), -1);
  assert.equal(saveOffset(storage, "song-b", 11), false);
  storage.setItem(OFFSETS_KEY, "{invalid json");
  assert.equal(loadOffset(storage, "song-b"), 0);
});
