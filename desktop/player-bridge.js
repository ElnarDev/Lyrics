const { WebSocketServer } = require("ws");
const { MAX_PLAYER_MESSAGE_BYTES, isAllowedPlayerOrigin, parsePlayerMessage } = require("./player-message");
const { PlayerSources } = require("./player-sources");
const { AUTH_TIMEOUT_MS, isValidBridgeAuth } = require("./bridge-auth");
const { createLyricsSession } = require("./lyrics-session");
const PROTOCOL_VERSION = 1;

function startPlayerBridge({ token, lookup, trackKey, send, invalidate, errorStatus, port = 37421, warn = console.warn, onSocketError = warn, onError = console.error }) {
  const sources = new PlayerSources();
  const session = createLyricsSession({ lookup, trackKey, send, invalidate, errorStatus, warn });
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
    socket.on("message", (raw, isBinary) => {
      if (!authenticated) {
        if (!isValidBridgeAuth(raw, isBinary, token)) {
          socket.close(1008, "Authentication failed");
          return;
        }
        authenticated = true;
        clearTimeout(authTimeout);
        socket.send(JSON.stringify({ type: "ready", protocolVersion: PROTOCOL_VERSION }));
        return;
      }
      if (!compatible) {
        let hello;
        try { hello = JSON.parse(raw.toString("utf8")); } catch { /* Reject malformed hello below. */ }
        if (isBinary || !hello || Array.isArray(hello) || Object.keys(hello).length !== 2 ||
          hello.type !== "hello" || hello.protocolVersion !== PROTOCOL_VERSION) {
          send("lyrics-update", { lines: [], status: "update-extension" });
          socket.close(4002, "Update Lyrics extension");
          return;
        }
        compatible = true;
        socket.send(JSON.stringify({ type: "compatible" }));
        return;
      }
      const player = parsePlayerMessage(raw, isBinary);
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

module.exports = { PROTOCOL_VERSION, startPlayerBridge };
