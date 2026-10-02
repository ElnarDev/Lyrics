import * as electron from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { LyricsResult, PlayerMessage } from "../../shared/protocol.js";
import { lyricsErrorStatus } from "../lyrics/lyrics-errors.js";
import { findLyrics as requestLyrics } from "../lyrics/lyrics-provider.js";
import { LyricsCache } from "../lyrics/lyrics-cache.js";
import { startPlayerBridge } from "../bridge/player-bridge.js";
import { isUsableWindow, sendToWindow, showOrCreateWindow, toggleOrCreateWindow } from "../window/window-lifecycle.js";
import { createOverlayWindow } from "../window/overlay-window.js";
import { createWindowStateController } from "../window/window-state-controller.js";
import { loadOrCreateBridgeToken } from "../bridge/bridge-auth.js";
import { createDiagnostics } from "../diagnostics/diagnostics.js";
import { registerOverlayIpc } from "./overlay-ipc.js";
import { setupDesktopControls } from "./desktop-controls.js";
const { app, BrowserWindow, ipcMain, globalShortcut, screen } = electron;
let mainWindow: electron.BrowserWindow | undefined;
// Conserva la referencia de la bandeja durante toda la vida de la app.
let tray: ReturnType<typeof setupDesktopControls> | undefined;
let isQuitting = false;
const lyricCache = new LyricsCache<LyricsResult>();
const diagnostics = createDiagnostics();
let retryCurrentLyrics = () => {};
let replayCurrentPlayer = () => {};
let bridgeToken = "";
let resetAppearanceOnLoad = false;
const overlayUrl = pathToFileURL(path.join(__dirname, "index.html")).href;
const windowState = createWindowStateController({
  screen,
  userDataPath: () => app.getPath("userData"),
  getWindow: () => mainWindow,
  onSaveError: () => diagnostics.record("window-state-save-failed"),
});

function trackKey(track: PlayerMessage): string {
  return `${track.title.trim().toLowerCase()}\u0000${track.artist.split(/[•·]/)[0].trim().toLowerCase()}\u0000${track.album?.trim().toLowerCase() || ""}\u0000${track.duration || 0}`;
}

async function findLyrics(track: PlayerMessage): Promise<LyricsResult> {
  const key = trackKey(track);
  return lyricCache.get(key, () => requestLyrics(track));
}
function createWindow(): void {
  const restored = windowState.restore();
  const window = mainWindow = createOverlayWindow({
    BrowserWindow,
    bounds: restored?.bounds,
    compactMode: windowState.compactMode,
    iconPath: path.join(__dirname, "..", "assets", "tray-icon.png"),
    preloadPath: path.join(__dirname, "preload.js"),
  });
  windowState.attach(window);
  window.loadFile(path.join(__dirname, "index.html"));
  window.webContents.on("did-finish-load", () => {
    if (windowState.compactMode) sendToWindow(window, "compact-mode", true);
    if (resetAppearanceOnLoad) {
      resetAppearanceOnLoad = false;
      sendToWindow(window, "reset-appearance");
    }
    replayCurrentPlayer();
  });
  window.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      if (isUsableWindow(window)) window.hide();
    }
  });
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = undefined;
  });
}
function showLyrics(): void {
  if (isQuitting) return;
  showOrCreateWindow(mainWindow, createWindow);
}
function resetAppearance(): void {
  if (isUsableWindow(mainWindow) && !mainWindow.webContents.isLoading()) {
    sendToWindow(mainWindow, "reset-appearance");
  } else {
    resetAppearanceOnLoad = true;
  }
  showLyrics();
}
function startBridge(): void {
  const bridge = startPlayerBridge({
    token: bridgeToken,
    lookup: findLyrics,
    trackKey,
    send: (...event) => sendToWindow(mainWindow, ...event),
    invalidate: (key) => lyricCache.delete(key),
    errorStatus: lyricsErrorStatus,
    warn: (error) => diagnostics.record(`lyrics-${lyricsErrorStatus(error)}`),
    onSocketError: () => diagnostics.record("bridge-socket-error"),
    onError: () => diagnostics.record("bridge-unavailable"),
  });
  retryCurrentLyrics = bridge.retry;
  replayCurrentPlayer = bridge.replay;
}
function startApp(): void {
  try {
    bridgeToken = loadOrCreateBridgeToken(app.getPath("userData"));
  } catch {
    diagnostics.record("bridge-auth-init-failed");
    app.quit();
    return;
  }
  createWindow();
  tray = setupDesktopControls(electron, {
    iconPath: path.join(__dirname, "..", "assets", "tray-icon.png"),
    showLyrics,
    toggleCompactMode: () => windowState.setCompactMode(!windowState.compactMode),
    retryLyrics: () => retryCurrentLyrics(),
    resetAppearance,
    toggleWindow: () => {
      if (!isQuitting) toggleOrCreateWindow(mainWindow, createWindow);
    },
    quit: () => {
      isQuitting = true;
      app.quit();
    },
    getToken: () => bridgeToken,
    getDiagnosticsReport: () => diagnostics.report(app.getVersion()),
    onShortcutUnavailable: (code) => diagnostics.record(code),
  });
  startBridge();
  const recoverWindowAfterDisplayChange = () => {
    setImmediate(() => {
      windowState.recoverAfterDisplayChange();
    });
  };
  screen.on("display-removed", recoverWindowAfterDisplayChange);
  screen.on("display-metrics-changed", recoverWindowAfterDisplayChange);
  registerOverlayIpc({
    ipcMain, screen, overlayUrl,
    getWindow: () => mainWindow,
    getCompactMode: () => windowState.compactMode,
    setCompactMode: windowState.setCompactMode,
  });
}

if (app.requestSingleInstanceLock()) {
  app.on("second-instance", () => {
    showLyrics();
  });
  app.whenReady().then(startApp);
} else {
  app.quit();
}
// Registrar este evento evita que Electron cierre la app al ocultar todas las ventanas.
app.on("window-all-closed", () => {});
app.on("will-quit", () => globalShortcut.unregisterAll());
