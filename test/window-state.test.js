const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { normalizeWindowState, restoreWindowState, loadWindowState, saveWindowState } = require("../build/desktop/window-state");

const primary = { x: 0, y: 0, width: 1600, height: 900 };
const left = { x: -1200, y: 0, width: 1200, height: 800 };
const normal = { x: -850, y: 150, width: 520, height: 430 };

test("persists position, size and compact mode across sessions", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lyrics-window-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const state = { compactMode: true, bounds: { ...normal, height: 90 }, normalBounds: normal };
  assert.equal(saveWindowState(directory, state), true);
  assert.deepEqual(loadWindowState(directory), { version: 1, ...state });
  const changed = { compactMode: false, bounds: normal, normalBounds: normal };
  assert.equal(saveWindowState(directory, changed), true);
  assert.deepEqual(loadWindowState(directory), { version: 1, ...changed });
});

test("recovers an off-screen window to the primary display after a monitor is removed", () => {
  const state = { version: 1, compactMode: true,
    bounds: { x: -900, y: 700, width: 520, height: 90 }, normalBounds: normal };
  assert.deepEqual(restoreWindowState(state, [primary], primary), {
    compactMode: true,
    bounds: { x: 0, y: 700, width: 520, height: 90 },
    normalBounds: { x: 0, y: 470, width: 520, height: 430 },
  });
});

test("keeps a window on an available secondary display", () => {
  const state = { version: 1, compactMode: false, bounds: normal, normalBounds: normal };
  assert.deepEqual(restoreWindowState(state, [primary, left], primary).bounds, normal);
});

test("invalid stored geometry is ignored", () => {
  assert.equal(normalizeWindowState({ version: 1, compactMode: false,
    bounds: { x: Infinity, y: 0, width: 520, height: 430 }, normalBounds: normal }), null);
  assert.equal(normalizeWindowState({ version: 2, compactMode: false,
    bounds: normal, normalBounds: normal }), null);
  assert.equal(normalizeWindowState({ version: 1, compactMode: false,
    bounds: { ...normal, width: "520" }, normalBounds: normal }), null);
  assert.equal(restoreWindowState(null, [primary], primary), null);
});

test("an invalid state cannot replace the saved window geometry", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lyrics-window-invalid-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const state = { compactMode: false, bounds: normal, normalBounds: normal };
  assert.equal(saveWindowState(directory, state), true);
  assert.equal(saveWindowState(directory, { ...state, bounds: { ...normal, width: -1 } }), false);
  assert.deepEqual(loadWindowState(directory), { version: 1, ...state });
});
