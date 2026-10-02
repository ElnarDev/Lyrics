const test = require("node:test");
const assert = require("node:assert/strict");
const { trackIdentity, activeLineIndex, adjustedOffset } = require("../build/node/sync-state");

test("track identity changes with recording metadata and clears with no title", () => {
  const player = { title: " Song ", artist: " Artist ", album: " Album ", duration: 120 };
  assert.equal(trackIdentity(player), JSON.stringify(["song", "artist", "album", 120]));
  assert.notEqual(trackIdentity({ ...player, duration: 180 }), trackIdentity(player));
  assert.equal(trackIdentity({ ...player, title: "" }), "");
});

test("active line follows time plus song offset", () => {
  const lines = [{ time: 0, text: "A" }, { time: 10, text: "B" }];
  assert.equal(activeLineIndex(lines, 9.5, 0), 0);
  assert.equal(activeLineIndex(lines, 9.5, .5), 1);
});

test("offset advances in half seconds and stays within ten seconds", () => {
  assert.equal(adjustedOffset(0, .5), .5);
  assert.equal(adjustedOffset(.5, -.5), 0);
  assert.equal(adjustedOffset(10, .5), 10);
  assert.equal(adjustedOffset(-10, -.5), -10);
});
