const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, screen, clipboard } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const { WebSocketServer } = require("ws");
const { MAX_PLAYER_MESSAGE_BYTES, isAllowedPlayerOrigin, parsePlayerMessage } = require("./player-message");
const { PlayerSources } = require("./player-sources");
const { lyricsErrorStatus } = require("./lyrics-errors");
const { findLyrics: requestLyrics } = require("./lyrics-provider");
const { LyricsCache } = require("./lyrics-cache");
const { restoreNormalBounds } = require("./window-bounds");
const { isUsableWindow, sendToWindow, showOrCreateWindow, toggleOrCreateWindow } = require("./window-lifecycle");
const { AUTH_TIMEOUT_MS, loadOrCreateBridgeToken, isValidBridgeAuth } = require("./bridge-auth");
let mainWindow;
let tray;
let isQuitting = false;
const lyricCache = new LyricsCache();
let activeTrackKey = "";
let activeLookupRevision = 0;
let compactMode = false;
let normalBounds;
let retryCurrentLyrics = () => {};
let replayCurrentPlayer = () => {};
let bridgeToken;
const overlayUrl = pathToFileURL(path.join(__dirname, "index.html")).href;

function isTrustedOverlayEvent(event) {
  return Boolean(isUsableWindow(mainWindow) &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame &&
    event.senderFrame?.url === overlayUrl);
}

function isSmallFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1000;
}

function trackKey(track) {
  return `${track.title.trim().toLowerCase()}\u0000${track.artist.split(/[•·]/)[0].trim().toLowerCase()}\u0000${track.album?.trim().toLowerCase() || ""}\u0000${track.duration || 0}`;
}

function roundedWindowShape(width, height, radius = 20) {
  const rows = [];
  for (let y = 0; y < radius; y += 1) {
    const inset = Math.ceil(radius - Math.sqrt(radius * radius - (radius - y - 1) ** 2));
    rows.push({ x: inset, y, width: width - inset * 2, height: 1 });
    rows.push({ x: inset, y: height - y - 1, width: width - inset * 2, height: 1 });
  }
  rows.push({ x: 0, y: radius, width, height: height - radius * 2 });
  return rows;
}

async function findLyrics(track) {
  const key = trackKey(track);
  return lyricCache.get(key, () => requestLyrics(track));
}
function createWindow() {
  compactMode = false;
  normalBounds = undefined;
  const window = mainWindow = new BrowserWindow({
    width: 520,
    height: 430,
    minWidth: 360,
    minHeight: 260,
    frame: false,
    title: "",
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    backgroundMaterial: "none",
    icon: path.join(__dirname, "..", "assets", "tray-icon.png"),
    alwaysOnTop: true,
    focusable: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.setBackgroundColor("#00000000");
  window.on("page-title-updated", (event) => event.preventDefault());
  const hideSystemTitle = () => {
    if (isUsableWindow(window)) window.setTitle("");
  };
  const refreshShape = () => {
    if (isUsableWindow(window) && typeof window.setShape === "function") {
      const { width, height } = window.getBounds();
      window.setShape(roundedWindowShape(width, height));
    }
  };
  refreshShape();
  window.on("resize", refreshShape);
  window.setAlwaysOnTop(true, "screen-saver");
  window.loadFile(path.join(__dirname, "index.html"));
  window.webContents.on("did-finish-load", () => {
    hideSystemTitle();
    replayCurrentPlayer();
  });
  window.on("focus", hideSystemTitle);
  hideSystemTitle();
  window.webContents.on("console-message", (_event, _level, message) =>
    console.log("Overlay:", message),
  );
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
function showLyrics() {
  if (isQuitting) return;
  showOrCreateWindow(mainWindow, createWindow);
}
function setCompactMode(enabled) {
  if (!isUsableWindow(mainWindow) || compactMode === enabled) return;
  compactMode = enabled;
  if (enabled) {
    normalBounds = mainWindow.getBounds();
    mainWindow.setMinimumSize(360, 80);
    mainWindow.setBounds({ ...normalBounds, height: 130 });
  } else if (normalBounds) {
    const compactBounds = mainWindow.getBounds();
    const display = screen.getDisplayNearestPoint({ x: compactBounds.x, y: compactBounds.y });
    mainWindow.setBounds(restoreNormalBounds(normalBounds, compactBounds, display.workArea));
    mainWindow.setMinimumSize(360, 260);
  }
  sendToWindow(mainWindow, "compact-mode", compactMode);
}
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "..", "assets", "tray-icon.png"));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Lyrics");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Mostrar Lyrics", click: showLyrics },
      { label: "Copiar clave de vinculación", click: () => clipboard.writeText(bridgeToken) },
      { label: "Modo compacto (Ctrl+Alt+C)", click: () => setCompactMode(!compactMode) },
      { label: "Reintentar letras", click: () => retryCurrentLyrics() },
      {
        label: "Salir",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", () => {
    if (!isQuitting) toggleOrCreateWindow(mainWindow, createWindow);
  });
}
function startBridge() {
  const sources = new PlayerSources();
  let displayedSource = null;
  const showSelectedPlayer = (selected, updatedSource = null, forceLookup = false) => {
    const source = selected?.source ?? null;
    if (source === displayedSource && source !== updatedSource) return;
    displayedSource = source;
    if (!selected) {
      activeTrackKey = "";
      activeLookupRevision += 1;
      sendToWindow(mainWindow, "player-update", { title: "", artist: "", currentTime: 0, paused: true });
      sendToWindow(mainWindow, "lyrics-update", { lines: [], status: "waiting" });
      return;
    }
    const player = selected.player;
    sendToWindow(mainWindow, "player-update", player);
    const key = trackKey(player);
    if (forceLookup) lyricCache.delete(key);
    if (key === activeTrackKey && !forceLookup) return;
    activeTrackKey = key;
    const revision = ++activeLookupRevision;
    sendToWindow(mainWindow, "lyrics-update", { lines: [], status: "loading" });
    findLyrics(player).then((result) => {
      if (activeTrackKey === key && activeLookupRevision === revision) {
        sendToWindow(mainWindow, "lyrics-update", {
          lines: result.lines,
          status: result.mode === "missing" ? "not-found" : result.mode === "unsynced-only" ? "not-synced" : result.mode === "ambiguous" ? "ambiguous" : "ready",
          mode: result.mode,
        });
      }
    }).catch((error) => {
      console.warn("Lyrics lookup failed:", error.message);
      if (activeTrackKey === key && activeLookupRevision === revision) {
        sendToWindow(mainWindow, "lyrics-update", { lines: [], status: lyricsErrorStatus(error) });
      }
    });
  };
  retryCurrentLyrics = () => {
    const selected = sources.select();
    if (selected) showSelectedPlayer(selected, selected.source, true);
  };
  replayCurrentPlayer = () => {
    activeTrackKey = "";
    displayedSource = null;
    const selected = sources.select();
    if (selected) showSelectedPlayer(selected, selected.source);
  };
  const server = new WebSocketServer({
    host: "127.0.0.1",
    port: 37421,
    maxPayload: MAX_PLAYER_MESSAGE_BYTES,
    perMessageDeflate: false,
  });
  server.on("connection", (socket, request) => {
    socket.on("error", (error) => console.warn("Local player connection failed:", error.message));
    if (!isAllowedPlayerOrigin(request.headers.origin)) {
      socket.close(1008, "Unrecognized player origin");
      return;
    }
    let authenticated = false;
    const authTimeout = setTimeout(() => socket.close(1008, "Authentication timeout"), AUTH_TIMEOUT_MS);
    socket.on("message", (raw, isBinary) => {
      if (!authenticated) {
        if (!isValidBridgeAuth(raw, isBinary, bridgeToken)) {
          socket.close(1008, "Authentication failed");
          return;
        }
        authenticated = true;
        clearTimeout(authTimeout);
        socket.send(JSON.stringify({ type: "ready" }));
        return;
      }
      const player = parsePlayerMessage(raw, isBinary);
      if (!player) {
        socket.close(1008, "Invalid player message");
        return;
      }
      showSelectedPlayer(sources.update(socket, player), socket);
    });
    socket.on("close", () => {
      clearTimeout(authTimeout);
      if (authenticated) showSelectedPlayer(sources.remove(socket));
    });
  });
  const staleCheck = setInterval(() => showSelectedPlayer(sources.select()), 2000);
  server.on("close", () => clearInterval(staleCheck));
  server.on("error", (error) =>
    console.error("Local bridge unavailable:", error.message),
  );
}
function startApp() {
  try {
    bridgeToken = loadOrCreateBridgeToken(app.getPath("userData"));
  } catch (error) {
    console.error("Cannot initialize local bridge authentication:", error.message);
    app.quit();
    return;
  }
  createWindow();
  createTray();
  startBridge();
  if (!globalShortcut.register("CommandOrControl+Alt+C", () => setCompactMode(!compactMode))) {
    console.warn("Compact mode shortcut unavailable");
  }
  ipcMain.on("compact-content-height", (event, requestedHeight) => {
    if (!isTrustedOverlayEvent(event) || !compactMode || !isSmallFiniteNumber(requestedHeight)) return;
    const bounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const height = Math.min(Math.max(80, Math.ceil(requestedHeight)), display.workArea.height);
    if (height !== bounds.height) mainWindow.setBounds({ ...bounds, height });
  });
  ipcMain.on("resize-overlay", (event, dimensions) => {
    if (!isTrustedOverlayEvent(event) || !dimensions || !["left", "right"].includes(dimensions.side) ||
      !isSmallFiniteNumber(dimensions.dx) || !isSmallFiniteNumber(dimensions.dy)) return;
    const { side, dx, dy } = dimensions;
    const bounds = mainWindow.getBounds();
    const width = Math.max(360, bounds.width + (side === "left" ? -dx : dx));
    const height = Math.max(compactMode ? 80 : 260, bounds.height + dy);
    const x = side === "left" ? bounds.x + bounds.width - width : bounds.x;
    mainWindow.setBounds({ x, y: bounds.y, width, height });
  });
  ipcMain.on("move-overlay", (event, movement) => {
    if (!isTrustedOverlayEvent(event) || !movement ||
      !isSmallFiniteNumber(movement.dx) || !isSmallFiniteNumber(movement.dy)) return;
    const { dx, dy } = movement;
    const bounds = mainWindow.getBounds();
    mainWindow.setPosition(bounds.x + dx, bounds.y + dy);
  });
  ipcMain.on("hide-overlay", (event) => {
    if (isTrustedOverlayEvent(event)) mainWindow.hide();
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
app.on("window-all-closed", (event) => event.preventDefault());
app.on("will-quit", () => globalShortcut.unregisterAll());
