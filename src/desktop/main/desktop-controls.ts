interface MenuItem {
  label: string;
  enabled?: boolean;
  click?: () => void;
}

interface TrayHandle {
  setToolTip(text: string): void;
  setContextMenu(menu: unknown): void;
  on(event: "click", callback: () => void): void;
}

interface ControlsEnvironment {
  app: { getVersion(): string };
  Tray: new (icon: NativeImage | string) => TrayHandle;
  Menu: { buildFromTemplate(items: MenuItem[]): unknown };
  nativeImage: { createFromPath(file: string): NativeImage };
  globalShortcut: { register(accelerator: string, callback: () => void): boolean };
  clipboard: { writeText(text: string): void };
}

interface DesktopControlsOptions {
  iconPath: string;
  showLyrics: () => void;
  toggleCompactMode: () => void;
  retryLyrics: () => void;
  resetAppearance: () => void;
  toggleWindow: () => void;
  quit: () => void;
  getToken: () => string;
  getDiagnosticsReport: () => string;
  onShortcutUnavailable: (code: string) => void;
}

export function setupDesktopControls(environment: ControlsEnvironment, options: DesktopControlsOptions): TrayHandle {
  const { app, Tray, Menu, nativeImage, globalShortcut, clipboard } = environment;
  const compactShortcutAvailable = globalShortcut.register("CommandOrControl+Alt+C", options.toggleCompactMode);
  if (!compactShortcutAvailable) options.onShortcutUnavailable("compact-shortcut-unavailable");
  const retryShortcutAvailable = globalShortcut.register("CommandOrControl+Alt+X", options.retryLyrics);
  if (!retryShortcutAvailable) options.onShortcutUnavailable("retry-shortcut-unavailable");

  const icon = nativeImage.createFromPath(options.iconPath);
  const tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Lyrics");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Mostrar Lyrics", click: options.showLyrics },
    { label: "Copiar clave de vinculación", click: () => clipboard.writeText(options.getToken()) },
    { label: compactShortcutAvailable ? "Modo compacto (Ctrl+Alt+C)" : "Modo compacto", click: options.toggleCompactMode },
    { label: retryShortcutAvailable ? "Reintentar letras (Ctrl+Alt+X)" : "Reintentar letras", click: options.retryLyrics },
    { label: "Restablecer apariencia", click: options.resetAppearance },
    { label: `Versión ${app.getVersion()}`, enabled: false },
    { label: "Copiar diagnóstico", click: () => clipboard.writeText(options.getDiagnosticsReport()) },
    { label: "Salir", click: options.quit },
  ]));
  tray.on("click", options.toggleWindow);
  return tray;
}
import type { NativeImage } from "electron";
