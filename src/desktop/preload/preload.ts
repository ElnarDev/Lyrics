import { contextBridge, ipcRenderer } from "electron";
import type { OverlayApi, OverlayCommandArgs, OverlayEventArgs } from "../../shared/overlay-api.js";

function sendCommand<Channel extends keyof OverlayCommandArgs>(channel: Channel,
  ...args: OverlayCommandArgs[Channel]): void {
  ipcRenderer.send(channel, ...args);
}

const lyricsApi: OverlayApi = {
  onPlayerUpdate: (callback) => onEvent("player-update", callback),
  onLyricsUpdate: (callback) => onEvent("lyrics-update", callback),
  onCompactMode: (callback) => onEvent("compact-mode", callback),
  onResetAppearance: (callback) => onEvent("reset-appearance", callback),
  setCompactContentHeight: (height) => sendCommand("compact-content-height", height),
  resizeOverlay: (side, dx, dy) => sendCommand("resize-overlay", { side, dx, dy }),
  moveOverlay: (dx, dy) => sendCommand("move-overlay", { dx, dy }),
  hideOverlay: () => sendCommand("hide-overlay"),
  exitCompactMode: () => sendCommand("exit-compact-mode"),
};

function onEvent<Channel extends keyof OverlayEventArgs>(channel: Channel,
  callback: (...args: OverlayEventArgs[Channel]) => void): void {
  ipcRenderer.on(channel, (_event, ...args: OverlayEventArgs[Channel]) => callback(...args));
}

contextBridge.exposeInMainWorld("lyrics", lyricsApi);
