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
    ready() { this.onmessage({ data: JSON.stringify({ type: "ready" }) }); }
    reject() { this.onclose({ code: 1008 }); }
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
  const source = readFileSync(path.join(__dirname, "..", "extension", "popup.js"), "utf8");
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
  connections[0].ready();
  assert.equal(elements.heading.textContent, "Lyrics conectado");
  connections[0].reject();
  assert.equal(elements.heading.textContent, "Lyrics vinculado");
  assert.match(elements.status.textContent, /No se pudo verificar/);
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
