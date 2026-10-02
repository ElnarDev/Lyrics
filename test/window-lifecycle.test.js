const assert = require("node:assert/strict");
const test = require("node:test");
const { isUsableWindow, sendToWindow, showOrCreateWindow, toggleOrCreateWindow } = require("../build/desktop/window-lifecycle");

test("player updates never target a destroyed window or webContents", () => {
  const messages = [];
  const window = {
    isDestroyed: () => false,
    webContents: { isDestroyed: () => false, send: (...args) => messages.push(args) },
  };
  assert.equal(sendToWindow(window, "player-update", { title: "Song" }), true);
  assert.equal(messages.length, 1);
  window.webContents.isDestroyed = () => true;
  assert.equal(isUsableWindow(window), false);
  assert.equal(sendToWindow(window, "player-update", { title: "New song" }), false);
  assert.equal(messages.length, 1);
});

test("tray reopens a hidden window and recreates one that was destroyed", () => {
  let shown = 0;
  let created = 0;
  const window = {
    isDestroyed: () => false,
    webContents: { isDestroyed: () => false },
    show: () => { shown += 1; },
  };
  const create = () => { created += 1; };
  assert.equal(showOrCreateWindow(window, create), "shown");
  window.isDestroyed = () => true;
  assert.equal(showOrCreateWindow(window, create), "created");
  assert.equal(shown, 1);
  assert.equal(created, 1);
});

test("tray click hides and shows the same window without resetting its mode", () => {
  let visible = true;
  let created = 0;
  const window = {
    isDestroyed: () => false,
    webContents: { isDestroyed: () => false },
    isVisible: () => visible,
    hide: () => { visible = false; },
    show: () => { visible = true; },
  };
  const create = () => { created += 1; };
  assert.equal(toggleOrCreateWindow(window, create), "hidden");
  assert.equal(visible, false);
  assert.equal(toggleOrCreateWindow(window, create), "shown");
  assert.equal(visible, true);
  assert.equal(created, 0);
  window.isDestroyed = () => true;
  assert.equal(toggleOrCreateWindow(window, create), "created");
  assert.equal(created, 1);
});

test("recreates a window destroyed during show", () => {
  let created = 0;
  const window = {
    isDestroyed: () => false,
    webContents: { isDestroyed: () => false },
    show: () => { throw new Error("destroyed"); },
  };
  assert.equal(showOrCreateWindow(window, () => { created += 1; }), "created");
  assert.equal(created, 1);
});
