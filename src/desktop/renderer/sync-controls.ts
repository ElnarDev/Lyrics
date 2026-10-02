import type { PlayerMessage } from "../../shared/protocol.js";
import type { PreferencesApi } from "./preferences.js";
import { adjustedOffset, trackIdentity } from "./sync-state.js";

interface SyncControlsOptions {
  host: Window;
  preferences: PreferencesApi;
  storage: Storage;
  onOffsetChange: () => void;
}

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing overlay element: ${selector}`);
  return element;
}

export function createSyncControls({ host, preferences, storage, onOffsetChange }: SyncControlsOptions) {
  const control = requiredElement<HTMLElement>("#sync-control");
  const reset = requiredElement<HTMLButtonElement>("#sync-reset");
  const toast = requiredElement<HTMLElement>("#sync-toast");
  const compactOffset = requiredElement<HTMLElement>("#compact-sync-offset");
  const later = requiredElement<HTMLButtonElement>("#sync-later");
  const earlier = requiredElement<HTMLButtonElement>("#sync-earlier");
  let trackKey = "";
  let offset = 0;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const updateLabel = () => {
    const label = `${offset > 0 ? "+" : ""}${offset} s`;
    reset.textContent = label;
    compactOffset.textContent = label;
  };
  const hideToast = () => {
    clearTimeout(toastTimer);
    toast.hidden = true;
  };
  const showToast = (delta: number) => {
    toast.textContent = `${delta > 0 ? "+" : ""}${delta} s`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 500);
  };
  const changeOffset = (delta: number): number => {
    if (!trackKey || control.hidden) return 0;
    const previous = offset;
    offset = adjustedOffset(offset, delta);
    if (offset === previous) return 0;
    preferences.saveOffset(storage, trackKey, offset);
    updateLabel();
    onOffsetChange();
    return offset - previous;
  };

  later.onclick = () => changeOffset(-.5);
  earlier.onclick = () => changeOffset(.5);
  reset.onclick = () => changeOffset(-offset);
  host.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      (event.target as Element | null)?.closest?.("input[type=range]")) return;
    if (control.hidden) return;
    event.preventDefault();
    const delta = changeOffset(event.key === "ArrowUp" ? .5 : -.5);
    if (delta) showToast(delta);
  });

  return {
    setTrack(track: Pick<PlayerMessage, "title" | "artist" | "album" | "duration">) {
      const nextKey = trackIdentity(track);
      if (trackKey === nextKey) return;
      trackKey = nextKey;
      offset = preferences.loadOffset(storage, trackKey);
      updateLabel();
      hideToast();
    },
    setLyricsAvailable(available: boolean) {
      control.hidden = !available;
      if (!available) hideToast();
    },
    get offset() { return offset; },
  };
}
