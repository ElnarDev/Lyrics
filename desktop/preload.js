const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("lyrics", {
  onPlayerUpdate: (callback) =>
    ipcRenderer.on("player-update", (_event, data) => callback(data)),
  onLyricsUpdate: (callback) =>
    ipcRenderer.on("lyrics-update", (_event, data) => callback(data)),
  onCompactMode: (callback) =>
    ipcRenderer.on("compact-mode", (_event, enabled) => callback(enabled)),
  onResetAppearance: (callback) =>
    ipcRenderer.on("reset-appearance", () => callback()),
  setCompactContentHeight: (height) => ipcRenderer.send("compact-content-height", height),
  resizeOverlay: (side, dx, dy) => ipcRenderer.send("resize-overlay", { side, dx, dy }),
  moveOverlay: (dx, dy) => ipcRenderer.send("move-overlay", { dx, dy }),
  hideOverlay: () => ipcRenderer.send("hide-overlay"),
  exitCompactMode: () => ipcRenderer.send("exit-compact-mode"),
});
