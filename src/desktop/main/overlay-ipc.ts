import { keepWindowReachable, resizeWindowBounds, type Bounds } from "../window/window-bounds.js";
import { isUsableWindow, type WindowHandle } from "../window/window-lifecycle.js";
import type { OverlayCommandArgs, OverlayMovement, OverlayResize } from "../../shared/overlay-api.js";

interface OverlayWindow extends WindowHandle {
  getBounds(): Bounds;
  setBounds(bounds: Bounds): void;
  setPosition(x: number, y: number): void;
  webContents: WindowHandle["webContents"] & { mainFrame: object };
}

interface IpcEvent {
  sender: unknown;
  senderFrame: { url: string } | null;
}

interface IpcBus {
  on(channel: keyof OverlayCommandArgs, listener: (event: IpcEvent, ...args: unknown[]) => void): unknown;
}

interface ScreenAccess {
  getDisplayMatching(bounds: Bounds): { workArea: Bounds };
  getAllDisplays(): { workArea: Bounds }[];
}

interface OverlayIpcOptions {
  ipcMain: IpcBus;
  screen: ScreenAccess;
  overlayUrl: string;
  getWindow: () => OverlayWindow | undefined;
  getCompactMode: () => boolean;
  setCompactMode: (enabled: boolean) => void;
}

function isSmallFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMovement(value: unknown): value is OverlayMovement {
  return isRecord(value) && Object.keys(value).length === 2 &&
    isSmallFiniteNumber(value.dx) && isSmallFiniteNumber(value.dy);
}

function isResize(value: unknown): value is OverlayResize {
  return isRecord(value) && Object.keys(value).length === 3 &&
    (value.side === "left" || value.side === "right") &&
    isSmallFiniteNumber(value.dx) && isSmallFiniteNumber(value.dy);
}

function trustedWindow(event: IpcEvent, getWindow: OverlayIpcOptions["getWindow"], overlayUrl: string): OverlayWindow | null {
  const window = getWindow();
  return isUsableWindow(window) &&
    event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame?.url === overlayUrl ? window : null;
}

export function registerOverlayIpc({ ipcMain, screen, overlayUrl, getWindow, getCompactMode,
  setCompactMode }: OverlayIpcOptions): void {
  ipcMain.on("compact-content-height", (event, requestedHeight, ...extra) => {
    const window = trustedWindow(event, getWindow, overlayUrl);
    if (!window || extra.length || !getCompactMode() || !isSmallFiniteNumber(requestedHeight)) return;
    const bounds = window.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const height = Math.min(Math.max(80, Math.ceil(requestedHeight)), display.workArea.height);
    if (height !== bounds.height) window.setBounds({ ...bounds, height });
  });
  ipcMain.on("resize-overlay", (event, dimensions, ...extra) => {
    const window = trustedWindow(event, getWindow, overlayUrl);
    if (!window || extra.length || !isResize(dimensions)) return;
    const bounds = window.getBounds();
    const display = screen.getDisplayMatching(bounds);
    window.setBounds(resizeWindowBounds(
      bounds, dimensions.side, dimensions.dx, dimensions.dy, display.workArea, getCompactMode() ? 80 : 260,
    ));
  });
  ipcMain.on("move-overlay", (event, movement, ...extra) => {
    const window = trustedWindow(event, getWindow, overlayUrl);
    if (!window || extra.length || !isMovement(movement)) return;
    const bounds = window.getBounds();
    const reachable = keepWindowReachable(
      { ...bounds, x: bounds.x + movement.dx, y: bounds.y + movement.dy },
      screen.getAllDisplays().map((display) => display.workArea),
    );
    window.setPosition(reachable.x, reachable.y);
  });
  ipcMain.on("hide-overlay", (event, ...args) => {
    const window = trustedWindow(event, getWindow, overlayUrl);
    if (window && args.length === 0) window.hide();
  });
  ipcMain.on("exit-compact-mode", (event, ...args) => {
    if (args.length === 0 && trustedWindow(event, getWindow, overlayUrl) && getCompactMode()) setCompactMode(false);
  });
}
