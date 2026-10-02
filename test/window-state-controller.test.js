const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createWindowStateController } = require("../build/desktop/window-state-controller.js");
const { loadWindowState } = require("../build/desktop/window-state.js");

class FakeWindow extends EventEmitter {
  constructor(bounds) {
    super();
    this.bounds = bounds;
    this.messages = [];
    this.webContents = {
      isDestroyed: () => false,
      send: (channel, value) => this.messages.push([channel, value]),
    };
  }
  isDestroyed() { return false; }
  getBounds() { return { ...this.bounds }; }
  setBounds(bounds) { this.bounds = { ...bounds }; this.emit("resize"); }
  setMinimumSize(width, height) { this.minimumSize = [width, height]; }
}

test("modo compacto conserva tamaño normal, guarda estado y recupera ventana tras quitar monitor", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lyrics-window-controller-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const primary = { x: 0, y: 0, width: 1600, height: 900 };
  const left = { x: -1200, y: 0, width: 1200, height: 800 };
  let displays = [primary, left];
  const screen = {
    getAllDisplays: () => displays.map((workArea) => ({ workArea })),
    getPrimaryDisplay: () => ({ workArea: primary }),
    getDisplayMatching: (bounds) => ({ workArea: bounds.x < 0 ? left : primary }),
  };
  const window = new FakeWindow({ x: -850, y: 150, width: 520, height: 430 });
  const errors = [];
  const controller = createWindowStateController({
    screen,
    userDataPath: () => directory,
    getWindow: () => window,
    onSaveError: () => errors.push("save"),
  });
  assert.equal(controller.restore(), null);
  controller.attach(window);
  controller.setCompactMode(true);
  assert.equal(controller.compactMode, true);
  assert.deepEqual(window.minimumSize, [360, 80]);
  assert.deepEqual(window.messages.at(-1), ["compact-mode", true]);
  assert.equal(loadWindowState(directory).normalBounds.height, 430);

  displays = [primary];
  controller.recoverAfterDisplayChange();
  assert.equal(window.bounds.x, 0);
  controller.setCompactMode(false);
  assert.equal(controller.compactMode, false);
  assert.equal(window.bounds.height, 430);
  assert.deepEqual(window.minimumSize, [360, 260]);
  window.emit("close");
  window.emit("closed");
  assert.equal(loadWindowState(directory).compactMode, false);
  assert.deepEqual(errors, []);
});
