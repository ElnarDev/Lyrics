const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("lyrics", {
  onPlayerUpdate: (callback) =>
    ipcRenderer.on("player-update", (_event, data) => callback(data)),
  onLyricsUpdate: (callback) =>
    ipcRenderer.on("lyrics-update", (_event, data) => callback(data)),
  setOpacity: (value) => ipcRenderer.send("set-opacity", value),
  resizeOverlay: (side, dx, dy) => ipcRenderer.send("resize-overlay", { side, dx, dy }),
});
