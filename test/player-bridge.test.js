const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const WebSocket = require("ws");
const { PROTOCOL_VERSION, startPlayerBridge } = require("../build/desktop/player-bridge");

test("local bridge authenticates before accepting player updates", async (t) => {
  const sent = [];
  let readyLyrics;
  const lyricsReady = new Promise((resolve) => { readyLyrics = resolve; });
  const token = "a".repeat(64);
  const bridge = startPlayerBridge({
    token,
    port: 0,
    lookup: async () => ({ mode: "synced", lines: [{ time: 1, text: "Line" }] }),
    trackKey: (player) => player.title,
    send: (channel, payload) => {
      sent.push({ channel, payload });
      if (channel === "lyrics-update" && payload.status === "ready") readyLyrics();
    },
    invalidate: () => {},
    errorStatus: () => "error",
    warn: () => {},
  });
  t.after(() => bridge.close());
  await once(bridge.server, "listening");
  const socket = new WebSocket(`ws://127.0.0.1:${bridge.server.address().port}`, {
    origin: "https://music.youtube.com",
  });
  t.after(() => socket.close());
  await once(socket, "open");
  assert.equal(sent.length, 0);

  socket.send(JSON.stringify({ type: "auth", token }));
  const [ready] = await once(socket, "message");
  assert.deepEqual(JSON.parse(ready.toString()), { type: "ready", protocolVersion: PROTOCOL_VERSION });
  socket.send(JSON.stringify({ type: "hello", protocolVersion: PROTOCOL_VERSION }));
  const [compatible] = await once(socket, "message");
  assert.deepEqual(JSON.parse(compatible.toString()), { type: "compatible" });
  socket.send(JSON.stringify({ title: "Song", artist: "Artist", currentTime: 12, paused: false }));
  await lyricsReady;
  assert.equal(sent.find((event) => event.channel === "player-update")?.payload.title, "Song");
  assert.equal(sent.find((event) => event.channel === "lyrics-update" && event.payload.status === "ready")?.payload.lines[0].text, "Line");
  socket.close();
  await once(socket, "close");
});

test("an old extension cannot send a player message before protocol negotiation", async (t) => {
  const sent = [];
  const token = "b".repeat(64);
  const bridge = startPlayerBridge({
    token,
    port: 0,
    lookup: async () => ({ mode: "missing", lines: [] }),
    trackKey: (player) => player.title,
    send: (channel, payload) => sent.push({ channel, payload }),
    invalidate: () => {},
    errorStatus: () => "error",
    warn: () => {},
  });
  t.after(() => bridge.close());
  await once(bridge.server, "listening");
  const socket = new WebSocket(`ws://127.0.0.1:${bridge.server.address().port}`, {
    origin: "https://music.youtube.com",
  });
  t.after(() => socket.close());
  await once(socket, "open");
  socket.send(JSON.stringify({ type: "auth", token }));
  await once(socket, "message");
  socket.send(JSON.stringify({ title: "Song", artist: "Artist", currentTime: 1, paused: false }));
  const [code] = await once(socket, "close");
  assert.equal(code, 4002);
  assert.equal(sent.some((event) => event.channel === "player-update"), false);
  assert.equal(sent.at(-1).payload.status, "update-extension");
});
