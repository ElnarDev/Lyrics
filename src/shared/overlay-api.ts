import type { LyricsUpdate, PlayerMessage } from "./protocol.js";

/** Datos internos enviados por main a la ventana aislada. */
export interface OverlayEventArgs {
  "player-update": [player: PlayerMessage];
  "lyrics-update": [update: LyricsUpdate];
  "compact-mode": [enabled: boolean];
  "reset-appearance": [];
}

/** Unión de tuplas: mantiene unidos canal y argumentos incluso al reenviarlos. */
export type OverlayEvent<Channel extends keyof OverlayEventArgs = keyof OverlayEventArgs> = {
  [Key in Channel]: [channel: Key, ...args: OverlayEventArgs[Key]];
}[Channel];

export type SendPlaybackEvent = (...event: OverlayEvent<"player-update" | "lyrics-update">) => void;

export interface OverlayMovement {
  dx: number;
  dy: number;
}

export interface OverlayResize extends OverlayMovement {
  side: "left" | "right";
}

/** Argumentos enviados por preload; main recibe unknown y los valida en ejecución. */
export interface OverlayCommandArgs {
  "compact-content-height": [height: number];
  "resize-overlay": [dimensions: OverlayResize];
  "move-overlay": [movement: OverlayMovement];
  "hide-overlay": [];
  "exit-compact-mode": [];
}

/** Única API disponible para la ventana aislada de Lyrics. */
export interface OverlayApi {
  onPlayerUpdate(callback: (...args: OverlayEventArgs["player-update"]) => void): void;
  onLyricsUpdate(callback: (...args: OverlayEventArgs["lyrics-update"]) => void): void;
  onCompactMode(callback: (...args: OverlayEventArgs["compact-mode"]) => void): void;
  onResetAppearance(callback: (...args: OverlayEventArgs["reset-appearance"]) => void): void;
  setCompactContentHeight(height: number): void;
  resizeOverlay(side: OverlayResize["side"], dx: number, dy: number): void;
  moveOverlay(dx: number, dy: number): void;
  hideOverlay(): void;
  exitCompactMode(): void;
}
