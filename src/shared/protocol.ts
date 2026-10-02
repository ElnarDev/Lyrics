export const PROTOCOL_VERSION = 1 as const;

/** Identidad de pista compartida por reproducción y búsqueda de letras. */
export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}

/** Forma esperada del mensaje; el JSON externo se recibe como unknown. */
export interface PlayerMessage extends TrackMetadata {
  currentTime: number;
  paused: boolean;
}

/** Estado normalizado después de validar un mensaje del reproductor. */
export interface PlayerState extends PlayerMessage {
  album: string;
  duration: number;
}

export interface SyncedLine {
  time: number;
  text: string;
}

export type LyricsResult =
  | { mode: "synced"; lines: SyncedLine[] }
  | { mode: "plain"; lines: string[] }
  | { mode: "missing" | "unsynced-only" | "ambiguous"; lines: [] };

/** Preferencias normalizadas; su lectura externa requiere validación. */
export interface DisplayPreferences {
  windowOpacity: number;
  lyricsOpacity: number;
  fontSize: number;
}

export type LyricsStatus =
  | "waiting"
  | "loading"
  | "ready"
  | "not-found"
  | "not-synced"
  | "ambiguous"
  | "timeout"
  | "offline"
  | "invalid-response"
  | "error"
  | "update-extension";

export interface LyricsUpdate {
  lines: SyncedLine[];
  status: LyricsStatus;
  mode?: LyricsResult["mode"];
}

export type BridgeClientMessage =
  | { type: "auth"; token: string }
  | { type: "hello"; protocolVersion: typeof PROTOCOL_VERSION }
  | PlayerMessage;

export type BridgeServerMessage =
  | { type: "ready"; protocolVersion: typeof PROTOCOL_VERSION }
  | { type: "compatible" };

/** Respuesta validada de una app local, incluida una versión anterior o incompatible. */
export type ServerHandshakeMessage =
  | { type: "ready"; protocolVersion?: number }
  | Extract<BridgeServerMessage, { type: "compatible" }>;
