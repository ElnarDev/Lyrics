const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("resends an unchanged paused track after reconnecting", () => {
  const connections = [];
  let reconnect;
  class FakeWebSocket {
    static OPEN = 1;
    constructor() {
      this.readyState = 0;
      this.messages = [];
      connections.push(this);
    }
    send(message) { this.messages.push(JSON.parse(message)); }
    open() { this.readyState = FakeWebSocket.OPEN; this.onopen(); }
    ready() { this.onmessage({ data: JSON.stringify({ type: "ready" }) }); }
    close() { this.readyState = 3; this.onclose(); }
  }
  const page = {
    "ytmusic-player-bar .title": "Paused song",
    "ytmusic-player-bar .byline": "Artist",
  };
  const context = {
    WebSocket: FakeWebSocket,
    chrome: {
      storage: {
        local: { get(_key, callback) { callback({ bridgeToken: "a".repeat(64) }); } },
        onChanged: { addListener() {} },
      },
    },
    document: {
      documentElement: {},
      querySelector(selector) {
        return selector === "video"
          ? { currentTime: 42, paused: true }
          : { textContent: page[selector] };
      },
    },
    MutationObserver: class { observe() {} disconnect() {} },
    setInterval() {},
    setTimeout(callback) { reconnect = callback; },
  };
  const source = readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");
  vm.runInNewContext(source, context);
  connections[0].open();
  assert.deepEqual(connections[0].messages, [{ type: "auth", token: "a".repeat(64) }]);
  connections[0].ready();
  assert.equal(connections[0].messages.length, 2);
  connections[0].close();
  reconnect();
  connections[1].open();
  connections[1].ready();
  assert.equal(connections[1].messages.length, 2);
  assert.equal(connections[1].messages[1].title, "Paused song");
  assert.equal(connections[1].messages[1].paused, true);
  assert.equal(connections[1].messages[1].album, "");
  assert.equal(connections[1].messages[1].duration, 0);
});

test("waits for pairing and connects when the key is saved", () => {
  const connections = [];
  let storageListener;
  class FakeWebSocket {
    constructor() { connections.push(this); }
  }
  const context = {
    WebSocket: FakeWebSocket,
    chrome: {
      storage: {
        local: { get(_key, callback) { callback({}); } },
        onChanged: { addListener(callback) { storageListener = callback; } },
      },
    },
    document: { documentElement: {}, querySelector() { return null; } },
    MutationObserver: class { observe() {} disconnect() {} },
    setInterval() {},
  };
  const source = readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");
  vm.runInNewContext(source, context);
  assert.equal(connections.length, 0);
  storageListener({ bridgeToken: { newValue: "a".repeat(64) } }, "local");
  assert.equal(connections.length, 1);
});

test("observes only the player bar and responds to song and media events", () => {
  const intervals = [];
  const scheduled = [];
  const observations = [];
  const listeners = {};
  const bar = {};
  const page = { title: "First song", byline: "Artist" };
  const video = {
    currentTime: 10, paused: false, duration: 180,
    addEventListener(name, callback) { listeners[name] = callback; },
    removeEventListener(name) { delete listeners[name]; },
  };
  let mutationCallback;
  let connection;
  class FakeWebSocket {
    static OPEN = 1;
    constructor() { this.readyState = 1; this.messages = []; connection = this; }
    send(value) { this.messages.push(JSON.parse(value)); }
  }
  const context = {
    WebSocket: FakeWebSocket,
    chrome: { storage: {
      local: { get(_key, callback) { callback({ bridgeToken: "a".repeat(64) }); } },
      onChanged: { addListener() {} },
    } },
    document: {
      querySelector(selector) {
        if (selector === "ytmusic-player-bar") return bar;
        if (selector === "video") return video;
        if (selector.endsWith(".title")) return { textContent: page.title };
        if (selector.endsWith(".byline")) return { textContent: page.byline };
        return null;
      },
    },
    MutationObserver: class {
      constructor(callback) { mutationCallback = callback; }
      observe(target) { observations.push(target); }
      disconnect() {}
    },
    setInterval(callback, ms) { intervals.push({ callback, ms }); },
    setTimeout(callback) { scheduled.push(callback); },
    clearTimeout() {},
  };
  vm.runInNewContext(readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8"), context);
  assert.deepEqual(observations, [bar]);
  assert.deepEqual(intervals.map((interval) => interval.ms), [750, 2000]);
  connection.onopen();
  connection.onmessage({ data: JSON.stringify({ type: "ready" }) });
  page.title = "Second song";
  mutationCallback();
  scheduled.at(-1)();
  assert.equal(connection.messages.at(-1).title, "Second song");
  video.paused = true;
  listeners.pause();
  assert.equal(connection.messages.at(-1).paused, true);
});
