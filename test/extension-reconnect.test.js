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
    ready() {
      this.onmessage({ data: JSON.stringify({ type: "ready", protocolVersion: 1 }) });
      this.onmessage({ data: JSON.stringify({ type: "compatible" }) });
    }
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
  assert.equal(connections[0].messages.length, 3);
  assert.deepEqual(connections[0].messages[1], { type: "hello", protocolVersion: 1 });
  connections[0].close();
  reconnect();
  connections[1].open();
  connections[1].ready();
  assert.equal(connections[1].messages.length, 3);
  assert.equal(connections[1].messages[2].title, "Paused song");
  assert.equal(connections[1].messages[2].paused, true);
  assert.equal(connections[1].messages[2].album, "");
  assert.equal(connections[1].messages[2].duration, 0);
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

test("an older desktop app cannot receive player data and is retried after update", () => {
  const connections = [];
  const timers = [];
  class FakeWebSocket {
    static OPEN = 1;
    constructor() { this.readyState = 0; this.messages = []; connections.push(this); }
    send(value) { this.messages.push(JSON.parse(value)); }
    open() { this.readyState = 1; this.onopen(); }
    close() { this.readyState = 3; this.onclose(); }
  }
  const context = {
    WebSocket: FakeWebSocket,
    chrome: { storage: {
      local: { get(_key, callback) { callback({ bridgeToken: "a".repeat(64) }); } },
      onChanged: { addListener() {} },
    } },
    document: { querySelector() { return null; } },
    MutationObserver: class { observe() {} disconnect() {} },
    setInterval() {},
    setTimeout(callback, delay) { timers.push({ callback, delay }); },
  };
  vm.runInNewContext(readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8"), context);
  connections[0].open();
  connections[0].onmessage({ data: JSON.stringify({ type: "ready" }) });
  assert.equal(connections[0].messages.length, 1);
  assert.equal(timers.at(-1).delay, 30000);
  timers.at(-1).callback();
  assert.equal(connections.length, 2);
});

test("observes only the player bar and responds to song and media events", () => {
  const intervals = [];
  const scheduled = [];
  const observations = [];
  const listeners = {};
  const bar = {};
  const page = { title: "First song", byline: "Artist" };
  let titleNode = { get textContent() { metadataReads += 1; return page.title; } };
  const bylineNode = { get textContent() { metadataReads += 1; return page.byline; } };
  const video = {
    currentTime: 10, paused: false, duration: 180,
    addEventListener(name, callback) { listeners[name] = callback; },
    removeEventListener(name) { delete listeners[name]; },
  };
  let metadataMutationCallback;
  let barMutationCallback;
  let connection;
  let metadataReads = 0;
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
        if (selector.endsWith(".title")) return titleNode;
        if (selector.endsWith(".byline")) return bylineNode;
        return null;
      },
    },
    MutationObserver: class {
      constructor(callback) {
        if (!metadataMutationCallback) metadataMutationCallback = callback;
        else barMutationCallback = callback;
      }
      observe(target) { observations.push(target); }
      disconnect() {}
    },
    setInterval(callback, ms) { intervals.push({ callback, ms }); },
    setTimeout(callback) { scheduled.push(callback); },
    clearTimeout() {},
  };
  vm.runInNewContext(readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8"), context);
  assert.deepEqual(observations, [bar, titleNode, bylineNode]);
  assert.deepEqual(intervals.map((interval) => interval.ms), [750, 2000]);
  assert.equal(metadataReads, 2);
  connection.onopen();
  connection.onmessage({ data: JSON.stringify({ type: "ready", protocolVersion: 1 }) });
  connection.onmessage({ data: JSON.stringify({ type: "compatible" }) });
  for (let i = 0; i < 10; i += 1) {
    video.currentTime += 0.75;
    intervals[0].callback();
  }
  assert.equal(metadataReads, 2, "clock samples must reuse cached title and artist");
  barMutationCallback();
  assert.equal(metadataReads, 2, "unrelated player-bar changes must not reread metadata");
  page.title = "Second song";
  metadataMutationCallback();
  scheduled.at(-1)();
  assert.equal(metadataReads, 4);
  assert.equal(connection.messages.at(-1).title, "Second song");
  titleNode = { get textContent() { metadataReads += 1; return "Replaced song"; } };
  barMutationCallback();
  assert.equal(connection.messages.at(-1).title, "Replaced song");
  video.paused = true;
  listeners.pause();
  assert.equal(connection.messages.at(-1).paused, true);
});
