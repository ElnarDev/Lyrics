const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadOrCreateBridgeToken, isValidBridgeAuth } = require("../desktop/bridge-auth");

test("creates a persistent unpredictable bridge token", (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "lyrics-bridge-test-"));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const first = loadOrCreateBridgeToken(folder);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(loadOrCreateBridgeToken(folder), first);
});

test("requires a complete authentication message before player data", () => {
  const token = "a".repeat(64);
  const encode = (value) => Buffer.from(JSON.stringify(value));
  assert.equal(isValidBridgeAuth(encode({ type: "auth", token }), false, token), true);
  for (const value of [
    { type: "auth", token: "b".repeat(64) },
    { type: "auth", token, extra: true },
    { type: "player", token },
    { title: "Song", artist: "Artist" },
  ]) assert.equal(isValidBridgeAuth(encode(value), false, token), false);
  assert.equal(isValidBridgeAuth(encode({ type: "auth", token }), true, token), false);
});
