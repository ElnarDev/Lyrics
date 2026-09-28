const assert = require("node:assert/strict");
const test = require("node:test");
const { LyricsCache } = require("../desktop/lyrics-cache");

test("coalesces simultaneous lookups and reuses synced lyrics until expiry", async () => {
  let now = 1000;
  let calls = 0;
  const cache = new LyricsCache({ now: () => now });
  const load = () => { calls += 1; return { mode: "synced", lines: [{ time: 1, text: "Line" }] }; };
  const first = cache.get("song", load);
  const second = cache.get("song", load);
  assert.strictEqual(first, second);
  assert.equal((await first).mode, "synced");
  assert.equal(calls, 1);
  now += 59 * 60 * 1000;
  await cache.get("song", load);
  assert.equal(calls, 1);
  now += 2 * 60 * 1000;
  await cache.get("song", load);
  assert.equal(calls, 2);
});

test("missing lyrics expire sooner and provider errors are never cached", async () => {
  let now = 0;
  let calls = 0;
  const cache = new LyricsCache({ now: () => now });
  const missing = () => { calls += 1; return { mode: "missing", lines: [] }; };
  await cache.get("missing", missing);
  now += 4 * 60 * 1000;
  await cache.get("missing", missing);
  assert.equal(calls, 1);
  now += 2 * 60 * 1000;
  await cache.get("missing", missing);
  assert.equal(calls, 2);
  const failure = () => { calls += 1; throw new Error("offline"); };
  await assert.rejects(cache.get("offline", failure), /offline/);
  await assert.rejects(cache.get("offline", failure), /offline/);
  assert.equal(calls, 4);
});

test("limits memory with LRU eviction and allows forced refresh", async () => {
  const cache = new LyricsCache({ maxEntries: 2 });
  let calls = 0;
  const load = () => { calls += 1; return { mode: "synced", lines: [] }; };
  await cache.get("a", load);
  await cache.get("b", load);
  await cache.get("a", load);
  await cache.get("c", load);
  assert.equal(cache.entries.size, 2);
  await cache.get("b", load);
  assert.equal(calls, 4);
  cache.delete("b");
  await cache.get("b", load);
  assert.equal(calls, 5);
});
