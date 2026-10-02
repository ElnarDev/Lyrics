const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("preload exposes only the overlay commands and forwards fixed IPC channels", () => {
  const listeners = new Map();
  const sent = [];
  let exposed;
  const electron = {
    contextBridge: {
      exposeInMainWorld(name, api) {
        assert.equal(name, "lyrics");
        exposed = api;
      },
    },
    ipcRenderer: {
      on(channel, callback) { listeners.set(channel, callback); },
      send(channel, payload) { sent.push([channel, payload]); },
    },
  };
  const source = fs.readFileSync(path.join(__dirname, "../build/desktop/preload.js"), "utf8");
  vm.runInNewContext(source, { require: (name) => {
    assert.equal(name, "electron");
    return electron;
  } });

  assert.deepEqual(Object.keys(exposed).sort(), [
    "onPlayerUpdate", "onLyricsUpdate", "onCompactMode", "onResetAppearance",
    "setCompactContentHeight", "resizeOverlay", "moveOverlay", "hideOverlay", "exitCompactMode",
  ].sort());
  assert.equal("ipcRenderer" in exposed, false);

  const received = [];
  exposed.onPlayerUpdate((value) => received.push(["player", value]));
  exposed.onLyricsUpdate((value) => received.push(["lyrics", value]));
  exposed.onCompactMode((value) => received.push(["compact", value]));
  exposed.onResetAppearance(() => received.push(["reset"]));
  const player = { title: "Song" };
  const lyrics = { lines: [], status: "waiting" };
  listeners.get("player-update")({}, player);
  listeners.get("lyrics-update")({}, lyrics);
  listeners.get("compact-mode")({}, true);
  listeners.get("reset-appearance")({});
  assert.deepEqual(received, [
    ["player", player], ["lyrics", lyrics], ["compact", true], ["reset"],
  ]);

  exposed.setCompactContentHeight(120);
  exposed.resizeOverlay("left", 2, 3);
  exposed.moveOverlay(4, 5);
  exposed.hideOverlay();
  exposed.exitCompactMode();
  assert.deepEqual(sent.map(([channel, payload]) => [channel,
    payload && typeof payload === "object" ? { ...payload } : payload]), [
    ["compact-content-height", 120],
    ["resize-overlay", { side: "left", dx: 2, dy: 3 }],
    ["move-overlay", { dx: 4, dy: 5 }],
    ["hide-overlay", undefined],
    ["exit-compact-mode", undefined],
  ]);
});
