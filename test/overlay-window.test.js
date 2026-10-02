const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const { createOverlayWindow } = require("../build/desktop/overlay-window.js");

class FakeBrowserWindow extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.bounds = { x: options.x ?? 0, y: options.y ?? 0, width: options.width, height: options.height };
    this.webContents = new EventEmitter();
    this.webContents.isDestroyed = () => false;
    this.webContents.setWindowOpenHandler = (handler) => { this.openHandler = handler; };
    this.webContents.session = {
      setPermissionRequestHandler: (handler) => { this.permissionHandler = handler; },
      setPermissionCheckHandler: (handler) => { this.permissionCheckHandler = handler; },
    };
  }
  isDestroyed() { return false; }
  getBounds() { return this.bounds; }
  setShape(shape) { this.shape = shape; }
  setBackgroundColor(color) { this.backgroundColor = color; }
  setTitle(title) { this.title = title; }
  setAlwaysOnTop(value, level) { this.alwaysOnTop = { value, level }; }
}

test("la ventana conserva aislamiento, permisos denegados y restricciones de navegación", () => {
  const window = createOverlayWindow({
    BrowserWindow: FakeBrowserWindow,
    compactMode: false,
    iconPath: "icon.png",
    preloadPath: "preload.js",
  });
  assert.equal(window.options.minHeight, 260);
  assert.equal(window.options.focusable, true);
  assert.deepEqual(window.options.webPreferences, {
    preload: "preload.js",
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
  });
  let prevented = 0;
  window.webContents.emit("will-navigate", { preventDefault: () => prevented++ });
  window.emit("page-title-updated", { preventDefault: () => prevented++ });
  assert.equal(prevented, 2);
  assert.deepEqual(window.openHandler(), { action: "deny" });
  for (const permission of ["media", "notifications", "clipboard-read", "geolocation", "unknown"]) {
    let permissionGranted;
    window.permissionHandler(null, permission, (granted) => { permissionGranted = granted; });
    assert.equal(permissionGranted, false);
    assert.equal(window.permissionCheckHandler(window.webContents, permission, "file://", {}), false);
    assert.equal(window.permissionCheckHandler(null, permission, "https://example.com", {}), false);
  }
  assert.deepEqual(window.alwaysOnTop, { value: true, level: "screen-saver" });
  assert.equal(window.title, "");
});

test("restaura posición y adapta la forma redondeada al tamaño compacto", () => {
  const window = createOverlayWindow({
    BrowserWindow: FakeBrowserWindow,
    bounds: { x: -700, y: 50, width: 400, height: 130 },
    compactMode: true,
    iconPath: "icon.png",
    preloadPath: "preload.js",
  });
  assert.equal(window.options.x, -700);
  assert.equal(window.options.minHeight, 80);
  assert.equal(window.shape.at(-1).width, 400);
  window.bounds.width = 500;
  window.emit("resize");
  assert.equal(window.shape.at(-1).width, 500);
});
