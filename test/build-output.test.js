const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const output = path.join(root, "build");
const read = (relative) => fs.readFileSync(path.join(output, relative), "utf8");

test("la salida de Electron contiene las entradas y recursos que carga main", () => {
  const pkg = require(path.join(root, "package.json"));
  assert.equal(pkg.main, "build/desktop/main.js");
  for (const relative of [
    "desktop/main.js", "desktop/preload.js", "desktop/index.html",
    "desktop/styles.css", "desktop/preferences.js", "desktop/renderer.js",
    "assets/tray-icon.png",
  ]) {
    assert.ok(fs.statSync(path.join(output, relative)).isFile(), relative);
  }
  assert.match(read("desktop/index.html"), /src="preferences\.js"/);
  assert.match(read("desktop/index.html"), /src="renderer\.js"/);
  assert.doesNotMatch(read("desktop/main.js"), /require\(["']\.\.\/src\/desktop\/lyrics\/lyrics-cache\.ts["']\)/);
  assert.ok(fs.statSync(path.join(output, "desktop/lyrics-cache.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/lyrics-errors.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/lyrics-parser.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/lyrics-matcher.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/lyrics-provider.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/bridge-auth.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/player-bridge.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/player-sources.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/player-message.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/window-bounds.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/window-state.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/diagnostics.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/window-lifecycle.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/overlay-ipc.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/desktop-controls.js")).isFile());
  assert.ok(fs.statSync(path.join(output, "desktop/lyrics-session.js")).isFile());
});

test("la extensión generada resuelve cada archivo declarado en el manifiesto", () => {
  const extension = path.join(output, "extension");
  const manifest = JSON.parse(read("extension/manifest.json"));
  const referenced = [
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
    ...manifest.content_scripts.flatMap((entry) => entry.js),
    "popup.js",
  ];
  for (const relative of referenced) {
    assert.ok(fs.statSync(path.join(extension, relative)).isFile(), relative);
  }
  assert.match(read("extension/popup.html"), /src="popup\.js"/);
});
