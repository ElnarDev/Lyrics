const assert = require("node:assert/strict");
const test = require("node:test");
const { MAX_PLAYER_MESSAGE_BYTES, isAllowedPlayerOrigin, parsePlayerMessage } = require("../build/desktop/player-message");

const valid = { title: "Song", artist: "Artist", currentTime: 12.5, paused: false };
const encode = (value) => Buffer.from(JSON.stringify(value));

test("accepts the four player fields and trims metadata", () => {
  assert.deepEqual(parsePlayerMessage(encode({ ...valid, title: " Song " })), { ...valid, title: "Song", album: "", duration: 0 });
  assert.deepEqual(parsePlayerMessage(encode({ ...valid, album: " Album ", duration: 221 })),
    { ...valid, album: "Album", duration: 221 });
});

test("rejects malformed and extra data before it reaches the renderer", () => {
  for (const value of [
    { ...valid, currentTime: -1 },
    { ...valid, currentTime: "12" },
    { ...valid, paused: "false" },
    { ...valid, password: "unexpected" },
    { ...valid, duration: -1 },
    { ...valid, album: 123 },
    { ...valid, artist: "a".repeat(501) },
    [valid],
  ]) assert.equal(parsePlayerMessage(encode(value)), null);
  assert.equal(parsePlayerMessage(Buffer.from("not json")), null);
  assert.equal(parsePlayerMessage(encode(valid), true), null);
  assert.equal(parsePlayerMessage(Buffer.alloc(MAX_PLAYER_MESSAGE_BYTES + 1)), null);
});

test("accepts the music page or a Chrome extension origin only", () => {
  assert.equal(isAllowedPlayerOrigin("https://music.youtube.com"), true);
  assert.equal(isAllowedPlayerOrigin(`chrome-extension://${"a".repeat(32)}`), true);
  assert.equal(isAllowedPlayerOrigin("https://example.com"), false);
  assert.equal(isAllowedPlayerOrigin("https://music.youtube.com.evil.test"), false);
  assert.equal(isAllowedPlayerOrigin(undefined), false);
});
