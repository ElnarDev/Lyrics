let currentTime = 0;
let lines = [];
let lyricStatus = "waiting";
let compactMode = false;
let trackKey = "";
let syncOffset = 0;
let syncToastTimer;
let renderedLines;
let renderedStatus;
let renderedActive;
let renderedCompactMode;
const lyricsEl = document.querySelector("#lyrics");
const announcementEl = document.querySelector("#lyrics-announcement");
const overlayEl = document.querySelector("#overlay");
const titleEl = document.querySelector("#title");
const artistEl = document.querySelector("#artist");
const syncControl = document.querySelector("#sync-control");
const syncReset = document.querySelector("#sync-reset");
const syncToast = document.querySelector("#sync-toast");
const compactSyncOffset = document.querySelector("#compact-sync-offset");
const statusText = {
  waiting: "Esperando YouTube Music…",
  loading: "Buscando letras sincronizadas…",
  "not-found": "No se encontraron letras para esta canción.",
  "not-synced": "Hay letra, pero no una versión sincronizada disponible.",
  ambiguous: "Hay varias versiones posibles. No se mostrará una letra que pueda ser incorrecta.",
  timeout: "La búsqueda tardó demasiado. Reintenta desde el icono de Lyrics.",
  offline: "No se pudo conectar con LRCLIB. Reintenta desde el icono de Lyrics.",
  "invalid-response": "LRCLIB devolvió una respuesta inválida. Reintenta desde el icono de Lyrics.",
  error: "No se pudieron cargar las letras. Reintenta desde el icono de Lyrics.",
  "update-extension": "La extensión de Lyrics no es compatible. Actualízala en Chrome.",
};
function activeIndex() { return lines.reduce((index, line, i) => (line.time <= currentTime + syncOffset ? i : index), 0); }
function updateSyncLabel() {
  const label = `${syncOffset > 0 ? "+" : ""}${syncOffset} s`;
  syncReset.textContent = label;
  compactSyncOffset.textContent = label;
}
function showSyncToast(delta) {
  syncToast.textContent = `${delta > 0 ? "+" : ""}${delta} s`;
  syncToast.hidden = false;
  clearTimeout(syncToastTimer);
  syncToastTimer = setTimeout(() => { syncToast.hidden = true; }, 500);
}
function updateCompactHeight() {
  if (!compactMode) return;
  requestAnimationFrame(() => {
    if (!compactMode) return;
    const style = getComputedStyle(overlayEl);
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    window.lyrics.setCompactContentHeight(Math.ceil(lyricsEl.scrollHeight + verticalPadding));
  });
}
function visibleLineCount() {
  if (compactMode) return 3;
  const style = getComputedStyle(lyricsEl);
  const baseFontSize = Number(preferenceControls.fontSize.value) || 27;
  const fontSize = Math.max(16, Math.min(48, baseFontSize + (window.innerWidth - 520) * .025));
  const gap = parseFloat(style.rowGap) || 16;
  const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const availableHeight = Math.max(0, lyricsEl.clientHeight - padding);
  return Math.max(1, Math.floor((availableHeight + gap) / (fontSize * 1.16 + gap)));
}
function render() {
  const active = lines.length ? activeIndex() : -1;
  if (renderedLines === lines && renderedStatus === lyricStatus &&
    renderedActive === active && renderedCompactMode === compactMode) return;
  renderedLines = lines;
  renderedStatus = lyricStatus;
  renderedActive = active;
  renderedCompactMode = compactMode;
  if (!lines.length) {
    const message = document.createElement("div");
    message.className = "status-message";
    message.textContent = statusText[lyricStatus] || statusText.error;
    if (announcementEl.textContent !== message.textContent) announcementEl.textContent = message.textContent;
    lyricsEl.replaceChildren(message);
    updateCompactHeight();
    return;
  }
  const count = visibleLineCount();
  const first = compactMode ? active : Math.min(
    Math.max(0, active - Math.floor((count - 1) / 2)),
    Math.max(0, lines.length - count),
  );
  if (announcementEl.textContent !== lines[active].text) announcementEl.textContent = lines[active].text;
  const last = Math.min(lines.length, first + count);
  lyricsEl.replaceChildren(
    ...lines.slice(first, last).map((line, relativeIndex) => {
      const index = first + relativeIndex;
      const el = document.createElement("div");
      el.className = `line ${index === active ? "active" : ""}`;
      el.textContent = line.text;
      return el;
    }),
  );
  updateCompactHeight();
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
  const nextKey = title ? JSON.stringify([title.trim().toLowerCase(), artist?.trim().toLowerCase() || "", album?.trim().toLowerCase() || "", duration || 0]) : "";
  if (trackKey !== nextKey) {
    trackKey = nextKey;
    syncOffset = window.LyricsPreferences.loadOffset(localStorage, trackKey);
    updateSyncLabel();
    clearTimeout(syncToastTimer);
    syncToast.hidden = true;
  }
  currentTime = Number(time) || 0;
  render();
});
window.lyrics.onLyricsUpdate(({ lines: nextLines, status }) => {
  lines = Array.isArray(nextLines) ? nextLines : [];
  lyricStatus = status;
  syncControl.hidden = status !== "ready" || !lines.length;
  if (syncControl.hidden) {
    clearTimeout(syncToastTimer);
    syncToast.hidden = true;
  }
  render();
});
function changeSyncOffset(delta) {
  if (!trackKey || syncControl.hidden) return 0;
  const previous = syncOffset;
  syncOffset = Math.max(-10, Math.min(10, Math.round((syncOffset + delta) * 2) / 2));
  if (syncOffset === previous) return 0;
  window.LyricsPreferences.saveOffset(localStorage, trackKey, syncOffset);
  updateSyncLabel();
  render();
  return syncOffset - previous;
}
document.querySelector("#sync-later").onclick = () => changeSyncOffset(-.5);
document.querySelector("#sync-earlier").onclick = () => changeSyncOffset(.5);
syncReset.onclick = () => changeSyncOffset(-syncOffset);
window.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target?.closest?.("input[type=range]")) return;
  if (syncControl.hidden) return;
  event.preventDefault();
  const delta = changeSyncOffset(event.key === "ArrowUp" ? .5 : -.5);
  if (delta) showSyncToast(delta);
});
const preferenceControls = {
  windowOpacity: document.querySelector("#window-opacity"),
  lyricsOpacity: document.querySelector("#lyrics-opacity"),
  fontSize: document.querySelector("#font-size"),
};
function applyPreferences(preferences) {
  preferenceControls.windowOpacity.value = preferences.windowOpacity;
  preferenceControls.lyricsOpacity.value = preferences.lyricsOpacity;
  preferenceControls.fontSize.value = preferences.fontSize;
  document.documentElement.style.setProperty("--panel-opacity", preferences.windowOpacity / 100);
  document.documentElement.style.setProperty("--lyrics-opacity", preferences.lyricsOpacity / 100);
  document.documentElement.style.setProperty("--font-size", `${preferences.fontSize}px`);
  document.querySelector("#font-size-value").value = `${preferences.fontSize} px`;
}
function savePreferences() {
  const values = Object.fromEntries(Object.entries(preferenceControls).map(([name, control]) => [name, control.value]));
  const preferences = window.LyricsPreferences.normalize(values);
  applyPreferences(preferences);
  window.LyricsPreferences.save(localStorage, preferences);
  renderedCompactMode = undefined;
  render();
  updateCompactHeight();
}
window.lyrics.onResetAppearance(() => {
  const defaults = window.LyricsPreferences.normalize(null);
  applyPreferences(defaults);
  window.LyricsPreferences.save(localStorage, defaults);
  updateCompactHeight();
});
applyPreferences(window.LyricsPreferences.load(localStorage));
for (const control of Object.values(preferenceControls)) control.addEventListener("input", savePreferences);
window.addEventListener("resize", () => {
  renderedCompactMode = undefined;
  render();
});
document.querySelector("#hide").onclick = () => window.lyrics.hideOverlay();
function startDrag(event) {
  if (event.target.closest("button")) return;
  if (event.currentTarget === lyricsEl && !compactMode) return;
  let lastX = event.screenX;
  let lastY = event.screenY;
  const move = (next) => {
    window.lyrics.moveOverlay(next.screenX - lastX, next.screenY - lastY);
    lastX = next.screenX;
    lastY = next.screenY;
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
}
document.querySelector("#drag-region").addEventListener("pointerdown", startDrag);
lyricsEl.addEventListener("pointerdown", startDrag);
lyricsEl.addEventListener("dblclick", () => {
  if (compactMode) window.lyrics.exitCompactMode();
});
for (const grip of document.querySelectorAll(".resize-grip")) {
  grip.addEventListener("pointerdown", (event) => {
    const side = grip.classList.contains("left") ? "left" : "right";
    let lastX = event.screenX;
    let lastY = event.screenY;
    grip.setPointerCapture(event.pointerId);
    const move = (next) => {
      window.lyrics.resizeOverlay(side, next.screenX - lastX, next.screenY - lastY);
      lastX = next.screenX;
      lastY = next.screenY;
    };
    const end = () => { grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", end); };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", end);
  });
}
render();
