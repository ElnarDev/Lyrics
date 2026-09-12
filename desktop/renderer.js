let currentTime = 0;
let fontSize = 27;
let syncOffset = 0;
let lines = window.demoLyrics || [];
const lyricsEl = document.querySelector("#lyrics");
function activeIndex() {
  return lines.reduce(
    (index, line, i) => (line.time + syncOffset <= currentTime ? i : index),
    0,
  );
}
function render() {
  const active = activeIndex();
  const first = Math.max(0, active - 2);
  const last = Math.min(lines.length, active + 3);
  lyricsEl.replaceChildren(
    ...lines.slice(first, last).map((line, relativeIndex) => {
      const index = first + relativeIndex;
      const el = document.createElement("div");
      el.className = `line ${index === active ? "active" : ""}`;
      el.textContent = line.text;
      return el;
    }),
  );
}
window.lyrics.onPlayerUpdate(({ title, artist, currentTime: time }) => {
  document.querySelector("#title").textContent = title || "Canción desconocida";
  document.querySelector("#artist").textContent = artist || "YouTube Music";
  currentTime = Number(time) || 0;
  render();
});
window.lyrics.onLyricsUpdate(({ lines: nextLines, source }) => {
  if (nextLines.length) lines = nextLines;
  document.querySelector("#source").textContent = nextLines.length
    ? `Letras sincronizadas: ${source}`
    : source;
  render();
});
document.querySelector("#opacity").oninput = (e) =>
  window.lyrics.setOpacity(e.target.value / 100);
document.querySelector("#smaller").onclick = () => {
  fontSize = Math.max(16, fontSize - 2);
  document.documentElement.style.setProperty("--font-size", `${fontSize}px`);
};
document.querySelector("#larger").onclick = () => {
  fontSize = Math.min(52, fontSize + 2);
  document.documentElement.style.setProperty("--font-size", `${fontSize}px`);
};
function changeSync(by) {
  syncOffset += by;
  document.querySelector("#sync").textContent = `${syncOffset.toFixed(1)} s`;
  render();
}
document.querySelector("#sync-back").onclick = () => changeSync(-0.5);
document.querySelector("#sync-forward").onclick = () => changeSync(0.5);
document.querySelector("#hide").onclick = () => window.close();
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
