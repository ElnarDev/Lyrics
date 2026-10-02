const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function runPopup(initialToken = "") {
  const elements = Object.fromEntries(
    ["pair-form", "bridge-token", "status", "heading", "instructions", "change-key"].map((id) =>
      [id, { hidden: false, textContent: "", value: "", addEventListener(name, callback) { this[name] = callback; }, focus() {} }]),
  );
  const connections = [];
  class FakeWebSocket {
    constructor() { this.sent = []; connections.push(this); }
    send(message) { this.sent.push(JSON.parse(message)); }
    close() { this.onclose?.({ code: 1000 }); }
    open() { this.onopen(); }
    ready() {
      this.onmessage({ data: JSON.stringify({ type: "ready", protocolVersion: 1 }) });
      this.onmessage({ data: JSON.stringify({ type: "compatible" }) });
    }
    oldApp() { this.onmessage({ data: JSON.stringify({ type: "ready" }) }); }
    newerApp() { this.onmessage({ data: JSON.stringify({ type: "ready", protocolVersion: 2 }) }); }
    malformed() { this.onmessage({ data: "null" }); this.onmessage({ data: "{invalid" }); }
    reject() { this.onclose({ code: 1008 }); }
    incompatible() { this.onclose({ code: 4002 }); }
  }
  const context = {
    document: { getElementById: (id) => elements[id] },
    window: { addEventListener() {} },
    WebSocket: FakeWebSocket,
    clearTimeout() {},
    setTimeout() {},
    chrome: {
      storage: { local: {
        get(_key, callback) { callback({ bridgeToken: initialToken }); },
        set(_value, callback) { callback(); },
      } },
      runtime: { lastError: null },
    },
  };
  const source = readFileSync(path.join(__dirname, "..", "build", "extension", "popup.js"), "utf8");
  vm.runInNewContext(source, context);
  return { elements, connections };
}

test("saved key hides pairing instructions and shows confirmed connection only after ready", () => {
  const token = "a".repeat(64);
  const { elements, connections } = runPopup(token);
  assert.equal(elements.heading.textContent, "Lyrics vinculado");
  assert.equal(elements["pair-form"].hidden, true);
  assert.equal(elements.instructions.hidden, true);
  assert.equal(elements["change-key"].hidden, false);
  assert.match(elements.status.textContent, /comprobando/);
  connections[0].open();
  assert.equal(connections[0].sent[0].token, token);
  connections[0].onmessage({ data: JSON.stringify({ type: "compatible" }) });
  connections[0].onmessage({ data: JSON.stringify({ type: "ready", protocolVersion: 1, unexpected: true }) });
  assert.notEqual(elements.heading.textContent, "Lyrics conectado");
  assert.equal(connections[0].sent.length, 1);
  connections[0].ready();
  assert.equal(elements.heading.textContent, "Lyrics conectado");
  assert.deepEqual(connections[0].sent[1], { type: "hello", protocolVersion: 1 });
  connections[0].reject();
  assert.equal(elements.heading.textContent, "Lyrics vinculado");
  assert.match(elements.status.textContent, /No se pudo verificar/);
});

test("an old desktop app shows an update message instead of connected", () => {
  const { elements, connections } = runPopup("a".repeat(64));
  connections[0].open();
  connections[0].oldApp();
  assert.match(elements.status.textContent, /Actualiza la aplicación/);
  assert.notEqual(elements.heading.textContent, "Lyrics conectado");
});

test("an incompatible extension shows its own update message", () => {
  const { elements, connections } = runPopup("a".repeat(64));
  connections[0].open();
  connections[0].ready();
  connections[0].incompatible();
  assert.match(elements.status.textContent, /Actualízala en Chrome/);
});

test("newer protocol and malformed bridge data never confirm connection", () => {
  const { elements, connections } = runPopup("a".repeat(64));
  connections[0].open();
  connections[0].malformed();
  assert.notEqual(elements.heading.textContent, "Lyrics conectado");
  connections[0].newerApp();
  assert.match(elements.status.textContent, /Actualízala en Chrome/);
});

test("invalid stored token type leaves the popup unpaired", () => {
  const { elements, connections } = runPopup(42);
  assert.equal(elements.heading.textContent, "Vincular Lyrics");
  assert.equal(connections.length, 0);
});

test("unpaired user can save a key and switch to connection status", () => {
  const { elements, connections } = runPopup();
  assert.equal(elements.heading.textContent, "Vincular Lyrics");
  assert.equal(elements["pair-form"].hidden, false);
  elements["bridge-token"].value = "b".repeat(64);
  elements["pair-form"].submit({ preventDefault() {} });
  assert.equal(elements["pair-form"].hidden, true);
  assert.equal(elements.heading.textContent, "Lyrics vinculado");
  assert.equal(connections.length, 1);
  elements["change-key"].click();
  assert.equal(elements["pair-form"].hidden, false);
});
