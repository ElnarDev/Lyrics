import type { BrowserWindow, Rectangle } from "electron";
import type { Bounds } from "./window-bounds.js";
import { isUsableWindow } from "./window-lifecycle.js";

interface OverlayWindowOptions {
  BrowserWindow: typeof BrowserWindow;
  bounds?: Bounds;
  compactMode: boolean;
  iconPath: string;
  preloadPath: string;
}

export function roundedWindowShape(width: number, height: number, radius = 20): Rectangle[] {
  const rows: Rectangle[] = [];
  for (let y = 0; y < radius; y += 1) {
    const inset = Math.ceil(radius - Math.sqrt(radius * radius - (radius - y - 1) ** 2));
    rows.push({ x: inset, y, width: width - inset * 2, height: 1 });
    rows.push({ x: inset, y: height - y - 1, width: width - inset * 2, height: 1 });
  }
  rows.push({ x: 0, y: radius, width, height: height - radius * 2 });
  return rows;
}

export function createOverlayWindow({ BrowserWindow, bounds, compactMode, iconPath, preloadPath }: OverlayWindowOptions): BrowserWindow {
  const window = new BrowserWindow({
    width: bounds?.width || 520,
    height: bounds?.height || 430,
    ...(bounds ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: 360,
    minHeight: compactMode ? 80 : 260,
    frame: false,
    title: "",
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    backgroundMaterial: "none",
    icon: iconPath,
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.setBackgroundColor("#00000000");
  window.on("page-title-updated", (event) => event.preventDefault());

  const hideSystemTitle = () => {
    if (isUsableWindow(window)) window.setTitle("");
  };
  const refreshShape = () => {
    if (isUsableWindow(window) && typeof window.setShape === "function") {
      const { width, height } = window.getBounds();
      window.setShape(roundedWindowShape(width, height));
    }
  };
  refreshShape();
  window.on("resize", refreshShape);
  window.webContents.on("did-finish-load", hideSystemTitle);
  window.on("focus", hideSystemTitle);
  hideSystemTitle();
  window.setAlwaysOnTop(true, "screen-saver");
  return window;
}
