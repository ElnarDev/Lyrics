import type { LyricsStatus, SyncedLine } from "../../shared/protocol.js";
import { activeLineIndex } from "./sync-state.js";

interface LyricsViewOptions {
  lyricsElement: HTMLElement;
  announcementElement: HTMLElement;
  overlayElement: HTMLElement;
  getFontSize: () => number;
  isCompact: () => boolean;
  setCompactContentHeight: (height: number) => void;
}

interface LyricsViewState {
  lines: SyncedLine[];
  status: LyricsStatus;
  currentTime: number;
  syncOffset: number;
  compactMode: boolean;
}

const statusText: Partial<Record<LyricsStatus, string>> = {
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

export function createLyricsView({ lyricsElement, announcementElement, overlayElement, getFontSize, isCompact,
  setCompactContentHeight }: LyricsViewOptions) {
  let renderedLines: SyncedLine[] | undefined;
  let renderedStatus: LyricsStatus | undefined;
  let renderedActive: number | undefined;
  let renderedCompactMode: boolean | undefined;

  const updateCompactHeight = (compactMode: boolean) => {
    if (!compactMode) return;
    requestAnimationFrame(() => {
      if (!isCompact()) return;
      const style = getComputedStyle(overlayElement);
      const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      setCompactContentHeight(Math.ceil(lyricsElement.scrollHeight + verticalPadding));
    });
  };

  const visibleLineCount = (compactMode: boolean) => {
    if (compactMode) return 3;
    const style = getComputedStyle(lyricsElement);
    const baseFontSize = getFontSize() || 27;
    const fontSize = Math.max(16, Math.min(48, baseFontSize + (window.innerWidth - 520) * .025));
    const gap = parseFloat(style.rowGap) || 16;
    const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const availableHeight = Math.max(0, lyricsElement.clientHeight - padding);
    return Math.max(1, Math.floor((availableHeight + gap) / (fontSize * 1.16 + gap)));
  };

  const render = ({ lines, status, currentTime, syncOffset, compactMode }: LyricsViewState) => {
    const active = lines.length ? activeLineIndex(lines, currentTime, syncOffset) : -1;
    if (renderedLines === lines && renderedStatus === status &&
      renderedActive === active && renderedCompactMode === compactMode) return;
    renderedLines = lines;
    renderedStatus = status;
    renderedActive = active;
    renderedCompactMode = compactMode;
    if (!lines.length) {
      const message = document.createElement("div");
      message.className = "status-message";
      message.textContent = statusText[status] || statusText.error || "";
      if (announcementElement.textContent !== message.textContent) announcementElement.textContent = message.textContent;
      lyricsElement.replaceChildren(message);
      updateCompactHeight(compactMode);
      return;
    }
    const count = visibleLineCount(compactMode);
    const first = compactMode ? active : Math.min(
      Math.max(0, active - Math.floor((count - 1) / 2)),
      Math.max(0, lines.length - count),
    );
    if (announcementElement.textContent !== lines[active].text) announcementElement.textContent = lines[active].text;
    const last = Math.min(lines.length, first + count);
    lyricsElement.replaceChildren(
      ...lines.slice(first, last).map((line, relativeIndex) => {
        const index = first + relativeIndex;
        const element = document.createElement("div");
        element.className = `line ${index === active ? "active" : ""}`;
        element.textContent = line.text;
        return element;
      }),
    );
    updateCompactHeight(compactMode);
  };

  return {
    render,
    updateCompactHeight,
    invalidate: () => { renderedCompactMode = undefined; },
  };
}
