const assert = require("node:assert/strict");
const test = require("node:test");
const { lyricsErrorStatus } = require("../desktop/lyrics-errors");

test("provider failures have distinct user-facing states", () => {
  assert.equal(lyricsErrorStatus({ name: "TimeoutError" }), "timeout");
  assert.equal(lyricsErrorStatus(new TypeError("fetch failed")), "offline");
  assert.equal(lyricsErrorStatus(new SyntaxError("bad JSON")), "invalid-response");
  assert.equal(lyricsErrorStatus({ name: "InvalidLyricsResponse" }), "invalid-response");
  assert.equal(lyricsErrorStatus(new Error("HTTP 500")), "error");
});
