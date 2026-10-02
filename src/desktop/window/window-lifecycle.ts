import type { OverlayEvent } from "../../shared/overlay-api.js";

export interface WindowHandle {
  isDestroyed(): boolean;
  isVisible(): boolean;
  show(): void;
  hide(): void;
  webContents: {
    isDestroyed(): boolean;
    send(channel: string, payload?: unknown): void;
  };
}

export function isUsableWindow(window: WindowHandle | null | undefined): window is WindowHandle {
  try {
    return Boolean(window && !window.isDestroyed() && window.webContents &&
      !window.webContents.isDestroyed());
  } catch {
    return false;
  }
}

export function sendToWindow(window: WindowHandle | null | undefined, ...event: OverlayEvent): boolean {
  if (!isUsableWindow(window)) return false;
  try {
    const [channel, payload] = event;
    window.webContents.send(channel, payload);
    return true;
  } catch {
    return false;
  }
}

export function showOrCreateWindow(window: WindowHandle | null | undefined, createWindow: () => unknown): "shown" | "created" {
  if (isUsableWindow(window)) {
    try {
      window.show();
      return "shown";
    } catch {
      // The window can be destroyed between the check and show().
    }
  }
  createWindow();
  return "created";
}

export function toggleOrCreateWindow(window: WindowHandle | null | undefined, createWindow: () => unknown):
  "hidden" | "shown" | "created" {
  if (isUsableWindow(window)) {
    try {
      if (window.isVisible()) {
        window.hide();
        return "hidden";
      }
      window.show();
      return "shown";
    } catch {
      // The window can be destroyed between the check and the visibility change.
    }
  }
  createWindow();
  return "created";
}
