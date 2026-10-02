const assert = require("node:assert/strict");
const test = require("node:test");
const { setupDesktopControls } = require("../build/desktop/desktop-controls");

function fixture(retryShortcutAvailable = true) {
  const shortcuts = new Map();
  const copied = [];
  const actions = [];
  const warnings = [];
  class FakeTray {
    constructor(icon) { this.icon = icon; }
    setToolTip(value) { this.tooltip = value; }
    setContextMenu(value) { this.menu = value; }
    on(_event, callback) { this.onClick = callback; }
  }
  const environment = {
    app: { getVersion: () => "0.1.0" },
    Tray: FakeTray,
    Menu: { buildFromTemplate: (items) => items },
    nativeImage: { createFromPath: () => ({ resize: () => "icon" }) },
    globalShortcut: { register: (key, callback) => {
      shortcuts.set(key, callback);
      return key.endsWith("+X") ? retryShortcutAvailable : true;
    } },
    clipboard: { writeText: (value) => copied.push(value) },
  };
  let token = "first-token";
  const tray = setupDesktopControls(environment, {
    iconPath: "icon.png",
    showLyrics: () => actions.push("show"),
    toggleCompactMode: () => actions.push("compact"),
    retryLyrics: () => actions.push("retry"),
    resetAppearance: () => actions.push("reset"),
    toggleWindow: () => actions.push("toggle"),
    quit: () => actions.push("quit"),
    getToken: () => token,
    getDiagnosticsReport: () => "diagnostic-report",
    onShortcutUnavailable: (code) => warnings.push(code),
  });
  return { tray, shortcuts, copied, actions, warnings, setToken: (value) => { token = value; } };
}

test("la bandeja conserva atajos y acciones con el estado actual", () => {
  const app = fixture();
  assert.equal(app.tray.tooltip, "Lyrics");
  assert.equal(app.tray.menu.find((item) => item.label.startsWith("Versión")).enabled, false);
  app.shortcuts.get("CommandOrControl+Alt+C")();
  app.shortcuts.get("CommandOrControl+Alt+X")();
  app.tray.onClick();
  app.setToken("second-token");
  app.tray.menu.find((item) => item.label.startsWith("Copiar clave")).click();
  app.tray.menu.find((item) => item.label === "Copiar diagnóstico").click();
  app.tray.menu.find((item) => item.label === "Salir").click();
  assert.deepEqual(app.actions, ["compact", "retry", "toggle", "quit"]);
  assert.deepEqual(app.copied, ["second-token", "diagnostic-report"]);
});

test("el menú indica cuando el atajo de reintento no se registró", () => {
  const app = fixture(false);
  assert.deepEqual(app.warnings, ["retry-shortcut-unavailable"]);
  const retry = app.tray.menu.find((item) => item.label === "Reintentar letras");
  retry.click();
  assert.deepEqual(app.actions, ["retry"]);
});
