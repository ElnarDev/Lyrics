const assert = require("node:assert/strict");
const test = require("node:test");
const { PlayerSources } = require("../build/desktop/player-sources");

const track = (title, paused = false, currentTime = 0) => ({ title, artist: "Artist", paused, currentTime });

test("a paused tab cannot replace the playing tab", () => {
  const sources = new PlayerSources();
  const playing = {};
  const paused = {};
  sources.update(playing, track("Song A"));
  assert.equal(sources.update(paused, track("Song B", true)).source, playing);
  assert.equal(sources.update(paused, track("Song B", true, 10)).player.title, "Song A");
});

test("a newly playing tab wins and closing it restores the other playing tab", () => {
  const sources = new PlayerSources();
  const first = {};
  const second = {};
  sources.update(first, track("Song A"));
  sources.update(second, track("Song B", true));
  assert.equal(sources.update(second, track("Song B")).source, second);
  assert.equal(sources.update(first, track("Song A", false, 20)).source, second);
  assert.equal(sources.remove(second).source, first);
});

test("pausing the active tab switches to another playing tab", () => {
  const sources = new PlayerSources();
  const first = {};
  const second = {};
  sources.update(first, track("Song A"));
  sources.update(second, track("Song B"));
  assert.equal(sources.update(second, track("Song B", true)).source, first);
});

test("stale sources are ignored and empty metadata clears the selection", () => {
  let now = 0;
  const sources = new PlayerSources(() => now, 5000);
  const first = {};
  assert.equal(sources.update(first, track("Song A")).source, first);
  now = 5000;
  assert.equal(sources.select(), null);
  assert.equal(sources.update(first, track("", true)), null);
});
