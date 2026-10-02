import { installWindowGestures } from "./window-gestures.js";
import { createLyricsView } from "./lyrics-view.js";
import { createDisplayPreferencesControls } from "./display-preferences-controls.js";
import { createSyncControls } from "./sync-controls.js";
import type { LyricsStatus, SyncedLine } from "../../shared/protocol.js";
import type { OverlayApi } from "../../shared/overlay-api.js";
import type { PreferencesApi } from "./preferences.js";

declare global {
  interface Window {
    lyrics: OverlayApi;
    LyricsPreferences: PreferencesApi;
  }
}

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing overlay element: ${selector}`);
  return element;
}

let currentTime = 0;
let lines: SyncedLine[] = [];
let lyricStatus: LyricsStatus = "waiting";
let compactMode = false;
const lyricsEl = requiredElement<HTMLElement>("#lyrics");
const announcementEl = requiredElement<HTMLElement>("#lyrics-announcement");
const overlayEl = requiredElement<HTMLElement>("#overlay");
const titleEl = requiredElement<HTMLElement>("#title");
const artistEl = requiredElement<HTMLElement>("#artist");
const displayPreferences = createDisplayPreferencesControls({
  preferences: window.LyricsPreferences,
  storage: localStorage,
  onInput: () => {
    lyricsView.invalidate();
    render();
    lyricsView.updateCompactHeight(compactMode);
  },
  onReset: () => lyricsView.updateCompactHeight(compactMode),
});
const lyricsView = createLyricsView({
  lyricsElement: lyricsEl,
  announcementElement: announcementEl,
  overlayElement: overlayEl,
  getFontSize: displayPreferences.getFontSize,
  isCompact: () => compactMode,
  setCompactContentHeight: (height) => window.lyrics.setCompactContentHeight(height),
});
const syncControls = createSyncControls({
  host: window,
  preferences: window.LyricsPreferences,
  storage: localStorage,
  onOffsetChange: render,
});
function render() {
  lyricsView.render({ lines, status: lyricStatus, currentTime, syncOffset: syncControls.offset, compactMode });
}
window.lyrics.onCompactMode((enabled) => {
  compactMode = enabled;
  document.body.classList.toggle("compact-mode", enabled);
  render();
});
window.lyrics.onPlayerUpdate(({ title, artist, album, duration, currentTime: time }) => {
  const nextTitle = title || "Lyrics";
  const nextArtist = artist || "Esperando YouTube Music";
  if (titleEl.textContent !== nextTitle) titleEl.textContent = nextTitle;
  if (artistEl.textContent !== nextArtist) artistEl.textContent = nextArtist;
  syncControls.setTrack({ title, artist, album, duration });
  currentTime = Number(time) || 0;
  render();
});
window.lyrics.onLyricsUpdate(({ lines: nextLines, status }) => {
  lines = Array.isArray(nextLines) ? nextLines : [];
  lyricStatus = status;
  syncControls.setLyricsAvailable(status === "ready" && lines.length > 0);
  render();
});
window.lyrics.onResetAppearance(displayPreferences.reset);
window.addEventListener("resize", () => {
  lyricsView.invalidate();
  render();
});
requiredElement<HTMLButtonElement>("#hide").onclick = () => window.lyrics.hideOverlay();
installWindowGestures({
  host: window,
  api: window.lyrics,
  dragRegion: requiredElement<HTMLElement>("#drag-region"),
  lyricsElement: lyricsEl,
  resizeGrips: Array.from(document.querySelectorAll<HTMLElement>(".resize-grip")),
  isCompact: () => compactMode,
});
render();
