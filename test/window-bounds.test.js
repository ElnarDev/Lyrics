const assert = require("node:assert/strict");
const test = require("node:test");
const { restoreNormalBounds } = require("../desktop/window-bounds");

test("leaving compact mode keeps the compact window's new position", () => {
  const normal = { x: 100, y: 120, width: 520, height: 430 };
  const compact = { x: 700, y: 300, width: 520, height: 130 };
  const workArea = { x: 0, y: 0, width: 1600, height: 900 };
  assert.deepEqual(restoreNormalBounds(normal, compact, workArea), {
    x: 700, y: 300, width: 520, height: 430,
  });
});

test("a normal window remains fully visible when compact mode was at the screen edge", () => {
  const normal = { x: 0, y: 0, width: 520, height: 430 };
  const compact = { x: 1450, y: 850, width: 520, height: 130 };
  const workArea = { x: 0, y: 0, width: 1600, height: 900 };
  assert.deepEqual(restoreNormalBounds(normal, compact, workArea), {
    x: 1080, y: 470, width: 520, height: 430,
  });
});

test("coordinates work on a monitor left of the primary display", () => {
  const normal = { x: 50, y: 50, width: 520, height: 430 };
  const compact = { x: -900, y: 80, width: 520, height: 130 };
  const workArea = { x: -1200, y: 0, width: 1200, height: 800 };
  assert.equal(restoreNormalBounds(normal, compact, workArea).x, -900);
});
