let currentTime = 0;
let lines = [];
let lyricStatus = "waiting";
let compactMode = false;
const lyricsEl = document.querySelector("#lyrics");
const overlayEl = document.querySelector("#overlay");
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
function activeIndex() { return lines.reduce((index, line, i) => (line.time <= currentTime ? i : index), 0); }
function updateCompactHeight() {
  if (!compactMode) return;
  requestAnimationFrame(() => {
    if (!compactMode) return;
    const style = getComputedStyle(overlayEl);
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    window.lyrics.setCompactContentHeight(Math.ceil(lyricsEl.scrollHeight + verticalPadding));
  });
}
function render() {
  if (!lines.length) {
    const message = document.createElement("div");
    message.className = "status-message";
    message.textContent = statusText[lyricStatus] || statusText.error;
    lyricsEl.replaceChildren(message);
    updateCompactHeight();
    return;
  }
  const active = activeIndex();
  const first = compactMode ? active : Math.max(0, active - 2);
  const last = Math.min(lines.length, active + (compactMode ? 2 : 3));
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
window.lyrics.onPlayerUpdate(({ title, artist, currentTime: time }) => {
  document.querySelector("#title").textContent = title || "Lyrics";
  document.querySelector("#artist").textContent = artist || "Esperando YouTube Music";
  currentTime = Number(time) || 0;
  render();
});
window.lyrics.onLyricsUpdate(({ lines: nextLines, status }) => {
  lines = Array.isArray(nextLines) ? nextLines : [];
  lyricStatus = status;
  render();
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
  if (compactMode) render();
}
applyPreferences(window.LyricsPreferences.load(localStorage));
for (const control of Object.values(preferenceControls)) control.addEventListener("input", savePreferences);
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
