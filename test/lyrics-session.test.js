const test = require("node:test");
const assert = require("node:assert/strict");
const { createLyricsSession } = require("../build/desktop/lyrics-session");

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
  const warnings = [];
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
    warn: (error) => warnings.push(error),
  });
  const source = {};
  const select = (title) => ({ source, player: { title, artist: "Artist" } });
  const lyricEvents = () => events.filter((event) => event.channel === "lyrics-update").map((event) => event.payload);
  return { session, pending, events, invalidated, warnings, source, select, lyricEvents };
}

test("un fallo de la pista activa muestra su estado sin revelar el error", async () => {
  const f = fixture();
  f.session.showSelectedPlayer(f.select("A"), f.source);
  const error = new Error("private provider detail");
  f.pending[0].reject(error);
  await assert.rejects(f.pending[0].promise);
  await Promise.resolve();
  assert.equal(f.warnings[0], error);
  assert.deepEqual(f.lyricEvents().at(-1), { lines: [], status: "offline" });
  assert.equal(JSON.stringify(f.lyricEvents()).includes(error.message), false);
});

test("una letra sin tiempos no se publica como líneas sincronizadas", async () => {
  const f = fixture();
  f.session.showSelectedPlayer(f.select("A"), f.source);
  f.pending[0].resolve({ mode: "plain", lines: ["Untimed line"] });
  await f.pending[0].promise;
  await Promise.resolve();
  assert.deepEqual(f.lyricEvents().at(-1), { lines: [], status: "not-synced", mode: "plain" });
});

test("cada resultado del proveedor mantiene el estado y las líneas correctos", async () => {
  for (const [mode, status] of [["synced", "ready"], ["plain", "not-synced"],
    ["missing", "not-found"], ["unsynced-only", "not-synced"], ["ambiguous", "ambiguous"]]) {
    const f = fixture();
    const lines = mode === "synced" ? [{ time: 1, text: "Timed" }] : mode === "plain" ? ["Untimed"] : [];
    f.session.showSelectedPlayer(f.select("A"), f.source);
    f.pending[0].resolve({ mode, lines });
    await f.pending[0].promise;
    await Promise.resolve();
    assert.deepEqual(f.lyricEvents().at(-1), { mode, status, lines: mode === "plain" ? [] : lines });
  }
});

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
