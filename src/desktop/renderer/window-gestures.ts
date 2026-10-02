import type { OverlayApi } from "../../shared/overlay-api.js";

interface GestureOptions {
  host: Pick<Window, "addEventListener" | "removeEventListener">;
  api: Pick<OverlayApi, "moveOverlay" | "resizeOverlay" | "exitCompactMode">;
  dragRegion: HTMLElement;
  lyricsElement: HTMLElement;
  resizeGrips: readonly HTMLElement[];
  isCompact: () => boolean;
}

export function installWindowGestures({ host, api, dragRegion, lyricsElement, resizeGrips, isCompact }:
  GestureOptions): void {
  function startDrag(event: PointerEvent): void {
    if ((event.target as Element | null)?.closest("button")) return;
    if (event.currentTarget === lyricsElement && !isCompact()) return;
    let lastX = event.screenX;
    let lastY = event.screenY;
    const move = (next: PointerEvent) => {
      api.moveOverlay(next.screenX - lastX, next.screenY - lastY);
      lastX = next.screenX;
      lastY = next.screenY;
    };
    const end = () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", end);
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", end);
  }

  dragRegion.addEventListener("pointerdown", startDrag);
  lyricsElement.addEventListener("pointerdown", startDrag);
  lyricsElement.addEventListener("dblclick", () => {
    if (isCompact()) api.exitCompactMode();
  });

  for (const grip of resizeGrips) {
    grip.addEventListener("pointerdown", (event: PointerEvent) => {
      const side = grip.classList.contains("left") ? "left" : "right";
      let lastX = event.screenX;
      let lastY = event.screenY;
      grip.setPointerCapture(event.pointerId);
      const move = (next: PointerEvent) => {
        api.resizeOverlay(side, next.screenX - lastX, next.screenY - lastY);
        lastX = next.screenX;
        lastY = next.screenY;
      };
      const end = () => {
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", end);
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", end);
    });
  }
}
