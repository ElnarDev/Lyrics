const assert = require("node:assert/strict");
const test = require("node:test");
const { fitWindowBounds, restoreNormalBounds, resizeWindowBounds, keepWindowReachable } = require("../desktop/window-bounds");

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

test("entering compact mode stays inside the work area near its bottom edge", () => {
  const workArea = { x: 0, y: 0, width: 1600, height: 900 };
  assert.deepEqual(fitWindowBounds({ x: 100, y: 850, width: 520, height: 130 }, workArea), {
    x: 100, y: 770, width: 520, height: 130,
  });
});

test("leaving compact mode fits normal dimensions on a smaller monitor", () => {
  const normal = { x: 100, y: 100, width: 1200, height: 800 };
  const compact = { x: -1100, y: 650, width: 520, height: 130 };
  const workArea = { x: -1200, y: 0, width: 900, height: 700 };
  assert.deepEqual(restoreNormalBounds(normal, compact, workArea), {
    x: -1200, y: 0, width: 900, height: 700,
  });
});

test("dragging keeps the top and a grabbable strip on a display", () => {
  const primary = { x: 0, y: 0, width: 1600, height: 900 };
  const left = { x: -1200, y: 0, width: 1200, height: 800 };
  const bounds = { x: 2000, y: 1200, width: 520, height: 430 };
  assert.deepEqual(keepWindowReachable(bounds, [primary, left]), {
    x: 1520, y: 860, width: 520, height: 430,
  });
  assert.deepEqual(keepWindowReachable({ ...bounds, x: -2000, y: -100 }, [primary, left]), {
    x: -1640, y: 0, width: 520, height: 430,
  });
});

test("dragging freely between monitors preserves positions that remain reachable", () => {
  const primary = { x: 0, y: 0, width: 1000, height: 900 };
  const right = { x: 1200, y: 0, width: 1000, height: 900 };
  const bounds = { x: 950, y: 100, width: 520, height: 430 };
  assert.deepEqual(keepWindowReachable(bounds, [primary, right]), bounds);
});

test("fractional pointer coordinates become integers before Electron receives them", () => {
  const area = { x: 0, y: 0, width: 1600, height: 900 };
  const bounds = { x: 125.4, y: 300.7, width: 520, height: 430 };
  assert.deepEqual(keepWindowReachable(bounds, [area]), {
    x: 125, y: 301, width: 520, height: 430,
  });
});

test("right resize stays inside the current monitor even near its bottom edge", () => {
  const area = { x: 0, y: 0, width: 1600, height: 900 };
  const bounds = { x: 1200, y: 600, width: 520, height: 430 };
  assert.deepEqual(resizeWindowBounds(bounds, "right", 1000, 500, area, 260), {
    x: 80, y: 0, width: 1520, height: 900,
  });
});

test("left resize on a negative-coordinate monitor remains visible", () => {
  const area = { x: -1200, y: 0, width: 1200, height: 800 };
  const bounds = { x: -700, y: 100, width: 520, height: 430 };
  assert.deepEqual(resizeWindowBounds(bounds, "left", -1000, 0, area, 260), {
    x: -1200, y: 100, width: 1200, height: 430,
  });
});
