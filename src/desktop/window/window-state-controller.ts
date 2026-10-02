import type { BrowserWindow, Screen } from "electron";
import { fitWindowBounds, restoreNormalBounds, type Bounds } from "./window-bounds.js";
import { isUsableWindow, sendToWindow } from "./window-lifecycle.js";
import { loadWindowState, restoreWindowState, saveWindowState } from "./window-state.js";

interface WindowStateControllerOptions {
  screen: Pick<Screen, "getAllDisplays" | "getPrimaryDisplay" | "getDisplayMatching">;
  userDataPath: () => string;
  getWindow: () => BrowserWindow | undefined;
  onSaveError: () => void;
}

export function createWindowStateController({ screen, userDataPath, getWindow, onSaveError }: WindowStateControllerOptions) {
  let compactMode = false;
  let normalBounds: Bounds | undefined;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  const restore = () => {
    const restored = restoreWindowState(
      loadWindowState(userDataPath()),
      screen.getAllDisplays().map((display) => display.workArea),
      screen.getPrimaryDisplay().workArea,
    );
    compactMode = restored?.compactMode || false;
    normalBounds = restored?.normalBounds;
    return restored;
  };

  const persist = (window: BrowserWindow) => {
    if (!isUsableWindow(window)) return;
    const bounds = window.getBounds();
    if (!saveWindowState(userDataPath(), {
      compactMode,
      bounds,
      normalBounds: compactMode ? normalBounds : bounds,
    })) onSaveError();
  };

  const attach = (window: BrowserWindow) => {
    const scheduleSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => persist(window), 300);
    };
    window.on("resize", scheduleSave);
    window.on("move", scheduleSave);
    window.on("close", () => {
      clearTimeout(saveTimer);
      persist(window);
    });
    window.on("closed", () => clearTimeout(saveTimer));
  };

  const setCompactMode = (enabled: boolean) => {
    const window = getWindow();
    if (!isUsableWindow(window) || compactMode === enabled) return;
    compactMode = enabled;
    if (enabled) {
      normalBounds = window.getBounds();
      window.setMinimumSize(360, 80);
      const display = screen.getDisplayMatching(normalBounds);
      window.setBounds(fitWindowBounds({ ...normalBounds, height: 130 }, display.workArea));
    } else if (normalBounds) {
      const compactBounds = window.getBounds();
      const display = screen.getDisplayMatching(compactBounds);
      window.setBounds(restoreNormalBounds(normalBounds, compactBounds, display.workArea));
      window.setMinimumSize(360, 260);
      normalBounds = window.getBounds();
    }
    saveWindowState(userDataPath(), {
      compactMode,
      bounds: window.getBounds(),
      normalBounds: compactMode ? normalBounds : window.getBounds(),
    });
    sendToWindow(window, "compact-mode", compactMode);
  };

  const recoverAfterDisplayChange = () => {
    const window = getWindow();
    if (!isUsableWindow(window)) return;
    const bounds = window.getBounds();
    const restored = restoreWindowState(
      { version: 1, compactMode, bounds, normalBounds: compactMode ? normalBounds : bounds },
      screen.getAllDisplays().map((display) => display.workArea),
      screen.getPrimaryDisplay().workArea,
    );
    if (!restored) return;
    normalBounds = restored.normalBounds;
    if ((["x", "y", "width", "height"] as const).some((key) => bounds[key] !== restored.bounds[key])) {
      window.setBounds(restored.bounds);
    }
  };

  return {
    restore,
    attach,
    setCompactMode,
    recoverAfterDisplayChange,
    get compactMode() { return compactMode; },
  };
}
