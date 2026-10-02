import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(root, "build");
if (output !== path.join(root, "build") || !output.startsWith(root + path.sep)) {
  throw new Error("Directorio de salida inválido");
}

await rm(output, { recursive: true, force: true });
await Promise.all([
  mkdir(path.join(output, "desktop"), { recursive: true }),
  mkdir(path.join(output, "extension"), { recursive: true }),
  mkdir(path.join(output, "assets"), { recursive: true }),
  mkdir(path.join(output, "node"), { recursive: true }),
]);

const entries = [
  ["src/desktop/main/main.ts", "desktop/main.js", "node", ["electron", "ws"]],
  ["src/desktop/lyrics/lyrics-cache.ts", "desktop/lyrics-cache.js", "node", []],
  ["src/desktop/lyrics/lyrics-errors.ts", "desktop/lyrics-errors.js", "node", []],
  ["src/desktop/lyrics/lyrics-provider.ts", "desktop/lyrics-provider.js", "node", []],
  ["src/desktop/lyrics/lyrics-parser.ts", "desktop/lyrics-parser.js", "node", []],
  ["src/desktop/lyrics/lyrics-matcher.ts", "desktop/lyrics-matcher.js", "node", []],
  ["src/desktop/lyrics/lyrics-session.ts", "desktop/lyrics-session.js", "node", []],
  ["src/desktop/bridge/bridge-auth.ts", "desktop/bridge-auth.js", "node", []],
  ["src/desktop/bridge/player-sources.ts", "desktop/player-sources.js", "node", []],
  ["src/desktop/bridge/player-message.ts", "desktop/player-message.js", "node", []],
  ["src/desktop/window/window-bounds.ts", "desktop/window-bounds.js", "node", []],
  ["src/desktop/window/window-state.ts", "desktop/window-state.js", "node", []],
  ["src/desktop/window/window-lifecycle.ts", "desktop/window-lifecycle.js", "node", []],
  ["src/desktop/window/overlay-window.ts", "desktop/overlay-window.js", "node", []],
  ["src/desktop/window/window-state-controller.ts", "desktop/window-state-controller.js", "node", []],
  ["src/desktop/diagnostics/diagnostics.ts", "desktop/diagnostics.js", "node", []],
  ["src/desktop/main/overlay-ipc.ts", "desktop/overlay-ipc.js", "node", []],
  ["src/desktop/main/desktop-controls.ts", "desktop/desktop-controls.js", "node", []],
  ["src/desktop/bridge/player-bridge.ts", "desktop/player-bridge.js", "node", ["ws"]],
  ["src/desktop/preload/preload.ts", "desktop/preload.js", "node", ["electron"]],
  ["src/desktop/renderer/preferences.ts", "desktop/preferences.js", "browser", []],
  ["src/desktop/renderer/preferences.ts", "node/preferences.js", "node", []],
  ["src/desktop/renderer/sync-state.ts", "node/sync-state.js", "node", []],
  ["src/desktop/renderer/window-gestures.ts", "node/window-gestures.js", "node", []],
  ["src/desktop/renderer/renderer.ts", "desktop/renderer.js", "browser", []],
  ["src/extension/content/content.ts", "extension/content.js", "browser", []],
  ["src/extension/popup/popup.ts", "extension/popup.js", "browser", []],
];

await Promise.all(entries.map(([entry, destination, platform, external]) => build({
  absWorkingDir: root,
  entryPoints: [entry],
  outfile: path.join(output, destination),
  bundle: true,
  platform,
  format: platform === "node" ? "cjs" : "iife",
  target: platform === "node" ? "node22" : "es2022",
  external,
  logLevel: "warning",
})));

await Promise.all([
  cp(path.join(root, "desktop/index.html"), path.join(output, "desktop/index.html")),
  cp(path.join(root, "desktop/styles.css"), path.join(output, "desktop/styles.css")),
  cp(path.join(root, "extension/manifest.json"), path.join(output, "extension/manifest.json")),
  cp(path.join(root, "extension/popup.html"), path.join(output, "extension/popup.html")),
  cp(path.join(root, "extension/icons"), path.join(output, "extension/icons"), { recursive: true }),
  cp(path.join(root, "assets/tray-icon.png"), path.join(output, "assets/tray-icon.png")),
]);

console.log("Salidas listas en build/desktop y build/extension");
