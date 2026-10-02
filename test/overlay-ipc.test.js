const assert = require("node:assert/strict");
const test = require("node:test");
const { registerOverlayIpc } = require("../build/desktop/overlay-ipc");

function fixture() {
  const handlers = new Map();
  const area = { x: 0, y: 0, width: 1600, height: 900 };
  let bounds = { x: 100, y: 120, width: 520, height: 430 };
  let hidden = false;
  let compactMode = false;
  const mainFrame = { url: "file:///lyrics/index.html" };
  const webContents = { mainFrame, isDestroyed: () => false };
  const window = {
    webContents,
    isDestroyed: () => false,
    getBounds: () => bounds,
    setBounds: (value) => { bounds = value; },
    setPosition: (x, y) => { bounds = { ...bounds, x, y }; },
    hide: () => { hidden = true; },
  };
  registerOverlayIpc({
    ipcMain: { on: (channel, listener) => handlers.set(channel, listener) },
    screen: { getDisplayMatching: () => ({ workArea: area }), getAllDisplays: () => [{ workArea: area }] },
    overlayUrl: mainFrame.url,
    getWindow: () => window,
    getCompactMode: () => compactMode,
    setCompactMode: (value) => { compactMode = value; },
  });
  return {
    send: (channel, event, ...args) => handlers.get(channel)(event, ...args),
    trusted: { sender: webContents, senderFrame: mainFrame },
    get bounds() { return bounds; },
    get hidden() { return hidden; },
    set compactMode(value) { compactMode = value; },
    get compactMode() { return compactMode; },
  };
}

test("IPC de otra ventana o frame no modifica el overlay", () => {
  const app = fixture();
  app.send("move-overlay", { sender: {}, senderFrame: app.trusted.senderFrame }, { dx: 50, dy: 50 });
  app.send("hide-overlay", { sender: app.trusted.sender, senderFrame: { url: app.trusted.senderFrame.url } });
  assert.deepEqual(app.bounds, { x: 100, y: 120, width: 520, height: 430 });
  assert.equal(app.hidden, false);
});

test("IPC rechaza campos y argumentos inesperados sin modificar la ventana", () => {
  const app = fixture();
  const original = { ...app.bounds };
  for (const payload of [null, [], { dx: 10 }, { dx: "10", dy: 0 },
    { dx: NaN, dy: 0 }, { dx: 1001, dy: 0 }, { dx: 10, dy: 0, extra: true }]) {
    app.send("move-overlay", app.trusted, payload);
  }
  for (const payload of [{ side: "top", dx: 10, dy: 0 },
    { side: "left", dx: 10, dy: 0, extra: true }, { side: "right", dx: 0, dy: Infinity }]) {
    app.send("resize-overlay", app.trusted, payload);
  }
  app.send("move-overlay", app.trusted, { dx: 10, dy: 0 }, "extra");
  app.send("resize-overlay", app.trusted, { side: "left", dx: 10, dy: 0 }, "extra");
  app.send("hide-overlay", app.trusted, {});
  app.compactMode = true;
  app.send("compact-content-height", app.trusted, 120, "extra");
  app.send("exit-compact-mode", app.trusted, false);
  assert.deepEqual(app.bounds, original);
  assert.equal(app.hidden, false);
  assert.equal(app.compactMode, true);
});

test("IPC validado mueve, redimensiona y limita la altura compacta", () => {
  const app = fixture();
  app.send("move-overlay", app.trusted, { dx: 20.4, dy: 10.6 });
  assert.equal(app.bounds.x, 120);
  assert.equal(app.bounds.y, 131);
  app.send("resize-overlay", app.trusted, { side: "right", dx: 40, dy: 20 });
  assert.equal(app.bounds.width, 560);
  app.send("resize-overlay", app.trusted, { side: "right", dx: Infinity, dy: 0 });
  assert.equal(app.bounds.width, 560);
  app.compactMode = true;
  app.send("compact-content-height", app.trusted, 110.2);
  assert.equal(app.bounds.height, 111);
  app.send("exit-compact-mode", app.trusted);
  assert.equal(app.compactMode, false);
});
