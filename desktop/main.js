const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require("electron");
const path = require("path");
const { WebSocketServer } = require("ws");
let mainWindow;
let tray;
let isQuitting = false;
const lyricCache = new Map();

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

function parseSyncedLyrics(source) {
  return source.split(/\r?\n/).flatMap((line) => {
    const matches = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, "").trim();
    return text ? matches.map((match) => ({ time: Number(match[1]) * 60 + Number(match[2]), text })) : [];
  }).sort((a, b) => a.time - b.time);
}

async function findLyrics(title, artist) {
  const primaryArtist = artist.split(/[•·]/)[0].trim();
  const key = `${title}\u0000${primaryArtist}`;
  if (lyricCache.has(key)) return lyricCache.get(key);
  const params = new URLSearchParams({ track_name: title, artist_name: primaryArtist });
  const response = await fetch(`https://lrclib.net/api/search?${params}`, { headers: { "User-Agent": "LyricsOverlay/0.1 (local desktop prototype)" } });
  if (!response.ok) throw new Error(`Lyrics provider returned ${response.status}`);
  const entries = await response.json();
  const entry = entries.find((item) => item.syncedLyrics) || entries[0];
  const result = entry?.syncedLyrics ? parseSyncedLyrics(entry.syncedLyrics) : [];
  lyricCache.set(key, result);
  return result;
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 430,
    minWidth: 360,
    minHeight: 260,
    frame: false,
    title: "",
    transparent: false,
    backgroundColor: "#100d1b",
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    backgroundMaterial: "none",
    icon: path.join(__dirname, "..", "assets", "tray-icon.png"),
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  mainWindow.setBackgroundColor("#100d1b");
  const refreshShape = () => {
    if (typeof mainWindow.setShape === "function") {
      const { width, height } = mainWindow.getBounds();
      mainWindow.setShape(roundedWindowShape(width, height));
    }
  };
  refreshShape();
  mainWindow.on("resize", refreshShape);
  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.webContents.on("console-message", (_event, _level, message) =>
    console.log("Overlay:", message),
  );
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "..", "assets", "tray-icon.png"));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Lyrics");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Mostrar Lyrics", click: () => mainWindow.show() },
      {
        label: "Salir",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", () => mainWindow.show());
}
function startBridge() {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 37421 });
  server.on("connection", (socket) =>
    socket.on("message", (raw) => {
      try {
        const player = JSON.parse(raw.toString());
        mainWindow?.webContents.send("player-update", player);
        if (player.title && player.artist) {
          findLyrics(player.title, player.artist).then((lines) => mainWindow?.webContents.send("lyrics-update", { lines, source: "LRCLIB" })).catch((error) => {
            console.warn("Lyrics lookup failed:", error.message);
            mainWindow?.webContents.send("lyrics-update", { lines: [], source: "No se encontraron letras sincronizadas" });
          });
        }
      } catch {
        /* Ignore malformed local messages. */
      }
    }),
  );
  server.on("error", (error) =>
    console.error("Local bridge unavailable:", error.message),
  );
}
app.whenReady().then(() => {
  createWindow();
  createTray();
  startBridge();
  ipcMain.on("set-opacity", (_event, value) =>
    mainWindow?.setOpacity(Math.max(0.35, Math.min(1, Number(value) || 1))),
  );
  ipcMain.on("resize-overlay", (_event, { side, dx, dy }) => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    const width = Math.max(360, bounds.width + (side === "left" ? -dx : dx));
    const height = Math.max(260, bounds.height + dy);
    const x = side === "left" ? bounds.x + bounds.width - width : bounds.x;
    mainWindow.setBounds({ x, y: bounds.y, width, height });
  });
});
app.on("window-all-closed", (event) => event.preventDefault());
