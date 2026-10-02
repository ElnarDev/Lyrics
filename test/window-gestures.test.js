const test = require("node:test");
const assert = require("node:assert/strict");
const { installWindowGestures } = require("../build/node/window-gestures");

function eventTarget(isLeft = false) {
  const listeners = new Map();
  return {
    listeners,
    classList: { contains: (name) => name === "left" && isLeft },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => {
      if (listeners.get(name) === callback) listeners.delete(name);
    },
    setPointerCapture() {},
  };
}

test("dragging follows pointer deltas and stops after release", () => {
  const host = eventTarget();
  const dragRegion = eventTarget();
  const lyricsElement = eventTarget();
  const moves = [];
  let compact = false;
  let exits = 0;
  installWindowGestures({
    host, dragRegion, lyricsElement, resizeGrips: [], isCompact: () => compact,
    api: { moveOverlay: (...delta) => moves.push(delta), resizeOverlay() {}, exitCompactMode: () => { exits += 1; } },
  });

  lyricsElement.listeners.get("pointerdown")({ currentTarget: lyricsElement, screenX: 10, screenY: 20,
    target: { closest: () => null } });
  assert.equal(host.listeners.has("pointermove"), false);
  dragRegion.listeners.get("pointerdown")({ currentTarget: dragRegion, screenX: 10, screenY: 20,
    target: { closest: () => null } });
  host.listeners.get("pointermove")({ screenX: 13, screenY: 25 });
  assert.deepEqual(moves, [[3, 5]]);
  host.listeners.get("pointerup")();
  assert.equal(host.listeners.has("pointermove"), false);
  lyricsElement.listeners.get("dblclick")();
  assert.equal(exits, 0);
  compact = true;
  lyricsElement.listeners.get("dblclick")();
  assert.equal(exits, 1);
});

test("left grip resizes until release", () => {
  const host = eventTarget();
  const grip = eventTarget(true);
  const sizes = [];
  installWindowGestures({
    host, dragRegion: eventTarget(), lyricsElement: eventTarget(), resizeGrips: [grip], isCompact: () => false,
    api: { moveOverlay() {}, resizeOverlay: (...args) => sizes.push(args), exitCompactMode() {} },
  });
  grip.listeners.get("pointerdown")({ screenX: 10, screenY: 20, pointerId: 1 });
  grip.listeners.get("pointermove")({ screenX: 7, screenY: 22 });
  assert.deepEqual(sizes, [["left", -3, 2]]);
  grip.listeners.get("pointerup")();
  assert.equal(grip.listeners.has("pointermove"), false);
});
