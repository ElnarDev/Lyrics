const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { STORAGE_KEY, OFFSETS_KEY, normalize, load, save, loadOffset, saveOffset } = require("../build/node/preferences");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("browser build exposes LyricsPreferences without Node globals", () => {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.join(__dirname, "../build/desktop/preferences.js"), "utf8");
  vm.runInContext(source, context);
  assert.equal(context.LyricsPreferences.STORAGE_KEY, STORAGE_KEY);
  assert.equal(context.LyricsPreferences.loadOffset(memoryStorage(), "song"), 0);
});

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

test("stored preferences discard invalid shapes and normalize only known fields", () => {
  const storage = memoryStorage();
  const defaults = { windowOpacity: 92, lyricsOpacity: 100, fontSize: 27 };
  for (const value of [null, [], "text", 42, { windowOpacity: null, lyricsOpacity: {}, fontSize: [] }]) {
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
    assert.deepEqual(load(storage), defaults);
  }
  assert.deepEqual(normalize({ ...defaults, extra: true }), defaults);
  assert.deepEqual(normalize({ windowOpacity: Infinity, lyricsOpacity: NaN, fontSize: "" }), defaults);
  for (const value of [null, [], "text", { song: "1" }, { song: 11 }]) {
    storage.setItem(OFFSETS_KEY, JSON.stringify(value));
    assert.equal(loadOffset(storage, "song"), 0);
  }
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

test("saving an offset discards malformed stored values and preserves valid songs", () => {
  const storage = memoryStorage();
  storage.setItem(OFFSETS_KEY, JSON.stringify({
    valid: -1, text: "1", tooLarge: 11, zero: 0, empty: null, object: {}, "": .5,
  }));
  assert.equal(saveOffset(storage, "new-song", .5), true);
  assert.deepEqual(JSON.parse(storage.getItem(OFFSETS_KEY)), { valid: -1, "new-song": .5 });
  assert.equal(loadOffset(storage, "valid"), -1);
});

test("invalid offsets do not evict valid songs and the limit keeps the most recently saved", () => {
  const storage = memoryStorage();
  const valid = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`song-${i}`, .5]));
  storage.setItem(OFFSETS_KEY, JSON.stringify({ ...valid, invalid: "1", tooLarge: 20 }));
  assert.equal(saveOffset(storage, "song-0", -1), true);
  let entries = JSON.parse(storage.getItem(OFFSETS_KEY));
  assert.equal(Object.keys(entries).length, 100);
  assert.equal(entries["song-1"], .5);
  assert.equal(Object.keys(entries).at(-1), "song-0");
  assert.equal(saveOffset(storage, "new-song", 10), true);
  entries = JSON.parse(storage.getItem(OFFSETS_KEY));
  assert.equal(Object.keys(entries).length, 100);
  assert.equal(Object.hasOwn(entries, "song-1"), false);
  assert.equal(entries["song-0"], -1);
  assert.equal(loadOffset(storage, "new-song"), 10);
});

test("offset keys are stored as own data properties even for reserved object names", () => {
  const storage = memoryStorage();
  for (const key of ["__proto__", "constructor", "toString"]) {
    assert.equal(saveOffset(storage, key, .5), true);
    assert.equal(loadOffset(storage, key), .5);
    assert.equal(Object.hasOwn(JSON.parse(storage.getItem(OFFSETS_KEY)), key), true);
  }
  assert.equal(saveOffset(storage, "__proto__", 0), true);
  assert.equal(loadOffset(storage, "__proto__"), 0);
  assert.equal(loadOffset(storage, "constructor"), .5);
});
