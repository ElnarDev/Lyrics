import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { PROTOCOL_VERSION, type BridgeClientMessage, type BridgeServerMessage, type LyricsResult, type LyricsStatus, type PlayerMessage } from "../../shared/protocol.js";
import { MAX_PLAYER_MESSAGE_BYTES, isAllowedPlayerOrigin, parsePlayerMessage } from "./player-message.js";
import { PlayerSources } from "./player-sources.js";
import { AUTH_TIMEOUT_MS, isValidBridgeAuth } from "./bridge-auth.js";
import { createLyricsSession } from "../lyrics/lyrics-session.js";
import type { SendPlaybackEvent } from "../../shared/overlay-api.js";

export { PROTOCOL_VERSION };

interface BridgeOptions {
  token: string;
  lookup: (player: PlayerMessage) => Promise<LyricsResult>;
  trackKey: (player: PlayerMessage) => string;
  send: SendPlaybackEvent;
  invalidate: (key: string) => void;
  errorStatus: (error: unknown) => LyricsStatus;
  port?: number;
  warn?: (error: unknown) => void;
  onSocketError?: (error: unknown) => void;
  onError?: (error: unknown) => void;
}

function payloadBytes(raw: RawData): Buffer {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof ArrayBuffer) return Buffer.from(raw);
  return Buffer.concat(raw);
}

function isHello(value: unknown): value is Extract<BridgeClientMessage, { type: "hello" }> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === 2 && "type" in value && value.type === "hello" &&
    "protocolVersion" in value && value.protocolVersion === PROTOCOL_VERSION;
}

export function startPlayerBridge({ token, lookup, trackKey, send, invalidate, errorStatus, port = 37421,
  warn = console.warn, onSocketError = warn, onError = console.error }: BridgeOptions) {
  const sources = new PlayerSources<WebSocket>();
  const session = createLyricsSession<WebSocket>({ lookup, trackKey, send, invalidate, errorStatus, warn });
  const { showSelectedPlayer } = session;
  const server = new WebSocketServer({
    host: "127.0.0.1",
    port,
    maxPayload: MAX_PLAYER_MESSAGE_BYTES,
    perMessageDeflate: false,
  });
  server.on("connection", (socket, request) => {
    socket.on("error", (error) => onSocketError(error));
    if (!isAllowedPlayerOrigin(request.headers.origin)) {
      socket.close(1008, "Unrecognized player origin");
      return;
    }
    let authenticated = false;
    let compatible = false;
    const authTimeout = setTimeout(() => socket.close(1008, "Authentication timeout"), AUTH_TIMEOUT_MS);
    socket.on("message", (raw: RawData, isBinary: boolean) => {
      const bytes = payloadBytes(raw);
      if (!authenticated) {
        if (!isValidBridgeAuth(bytes, isBinary, token)) {
          socket.close(1008, "Authentication failed");
          return;
        }
        authenticated = true;
        clearTimeout(authTimeout);
        socket.send(JSON.stringify({ type: "ready", protocolVersion: PROTOCOL_VERSION } satisfies BridgeServerMessage));
        return;
      }
      if (!compatible) {
        let hello: unknown;
        try { hello = JSON.parse(bytes.toString("utf8")); } catch { /* Reject malformed hello below. */ }
        if (isBinary || !isHello(hello)) {
          send("lyrics-update", { lines: [], status: "update-extension" });
          socket.close(4002, "Update Lyrics extension");
          return;
        }
        compatible = true;
        socket.send(JSON.stringify({ type: "compatible" } satisfies BridgeServerMessage));
        return;
      }
      const player = parsePlayerMessage(bytes, isBinary);
      if (!player) {
        socket.close(1008, "Invalid player message");
        return;
      }
      showSelectedPlayer(sources.update(socket, player), socket);
    });
    socket.on("close", () => {
      clearTimeout(authTimeout);
      if (compatible) showSelectedPlayer(sources.remove(socket));
    });
  });
  const staleCheck = setInterval(() => showSelectedPlayer(sources.select()), 2000);
  server.on("close", () => clearInterval(staleCheck));
  server.on("error", (error) => onError(error));
  return {
    server,
    retry() {
      const selected = sources.select();
      if (selected) showSelectedPlayer(selected, selected.source, true);
    },
    replay() {
      session.reset();
      const selected = sources.select();
      if (selected) showSelectedPlayer(selected, selected.source);
    },
    close() { server.close(); },
  };
}
