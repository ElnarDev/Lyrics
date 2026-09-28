const test = require("node:test");
const assert = require("node:assert/strict");
const { createLyricsSession } = require("../desktop/lyrics-session");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture() {
  const pending = [];
  const events = [];
  const invalidated = [];
  const session = createLyricsSession({
    lookup: () => {
      const request = deferred();
      pending.push(request);
      return request.promise;
    },
    trackKey: (player) => player.title,
    send: (channel, payload) => events.push({ channel, payload }),
    invalidate: (key) => invalidated.push(key),
    errorStatus: () => "offline",
    warn: () => {},
  });
  const source = {};
  const select = (title) => ({ source, player: { title, artist: "Artist" } });
  const lyricEvents = () => events.filter((event) => event.channel === "lyrics-update").map((event) => event.payload);
  return { session, pending, events, invalidated, source, select, lyricEvents };
}

test("a late response from the previous track cannot replace the current lyrics", async () => {
  const f = fixture();
  f.session.showSelectedPlayer(f.select("A"), f.source);
  f.session.showSelectedPlayer(f.select("B"), f.source);
  f.pending[1].resolve({ mode: "synced", lines: [{ time: 3, text: "B line" }] });
  await f.pending[1].promise;
  await Promise.resolve();
  f.pending[0].resolve({ mode: "synced", lines: [{ time: 2, text: "A line" }] });
  await f.pending[0].promise;
  await Promise.resolve();
  assert.deepEqual(f.lyricEvents().map((event) => event.status), ["loading", "loading", "ready"]);
  assert.deepEqual(f.lyricEvents().at(-1).lines, [{ time: 3, text: "B line" }]);
});

test("retrying the same track invalidates the previous lookup", async () => {
  const f = fixture();
  f.session.showSelectedPlayer(f.select("A"), f.source);
  f.session.showSelectedPlayer(f.select("A"), f.source, true);
  f.pending[0].resolve({ mode: "missing", lines: [] });
  await f.pending[0].promise;
  await Promise.resolve();
  f.pending[1].resolve({ mode: "synced", lines: [{ time: 1, text: "New" }] });
  await f.pending[1].promise;
  await Promise.resolve();
  assert.deepEqual(f.invalidated, ["A"]);
  assert.deepEqual(f.lyricEvents().map((event) => event.status), ["loading", "loading", "ready"]);
});

test("clearing the player ignores a pending lookup", async () => {
  const f = fixture();
  f.session.showSelectedPlayer(f.select("A"), f.source);
  f.session.showSelectedPlayer(null);
  f.pending[0].resolve({ mode: "synced", lines: [{ time: 1, text: "Stale" }] });
  await f.pending[0].promise;
  await Promise.resolve();
  assert.equal(f.lyricEvents().at(-1).status, "waiting");
});

test("replaying the same track ignores a lookup from the previous window", async () => {
  const f = fixture();
  f.session.showSelectedPlayer(f.select("A"), f.source);
  f.session.reset();
  f.session.showSelectedPlayer(f.select("A"), f.source);
  f.pending[0].reject(new Error("Old window failed"));
  await assert.rejects(f.pending[0].promise);
  await Promise.resolve();
  f.pending[1].resolve({ mode: "synced", lines: [{ time: 1, text: "Current" }] });
  await f.pending[1].promise;
  await Promise.resolve();
  assert.deepEqual(f.lyricEvents().map((event) => event.status), ["loading", "loading", "ready"]);
});
