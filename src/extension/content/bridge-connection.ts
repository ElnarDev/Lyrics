import { PROTOCOL_VERSION, type BridgeClientMessage, type PlayerMessage } from "../../shared/protocol.js";
import { parseServerHandshake } from "../../shared/bridge-server-message.js";

export interface BridgeStorage {
  local: {
    get(key: string, callback: (stored: { bridgeToken?: unknown }) => void): void;
  };
  onChanged: {
    addListener(callback: (changes: { bridgeToken?: { newValue?: unknown } }, area: string) => void): void;
  };
}

export function createBridgeConnection(storage: BridgeStorage, snapshot: () => PlayerMessage) {
  let socket: WebSocket | undefined;
  let lastPayload = "";
  let bridgeToken = "";
  let authenticated = false;
  let incompatible = false;
  let tokenRevision = 0;

  function connect(): void {
    if (!bridgeToken) return;
    const connection = new WebSocket("ws://127.0.0.1:37421");
    socket = connection;
    let helloSent = false;
    connection.onopen = () => {
      if (socket !== connection) return;
      connection.send(JSON.stringify({ type: "auth", token: bridgeToken } satisfies BridgeClientMessage));
    };
    connection.onmessage = (event) => {
      if (socket !== connection) return;
      let message;
      try { message = parseServerHandshake(JSON.parse(String(event.data))); } catch { return; }
      if (!message) return;
      if (message.type === "ready") {
        if (message.protocolVersion !== PROTOCOL_VERSION) {
          incompatible = true;
          connection.close();
          return;
        }
        incompatible = false;
        connection.send(JSON.stringify({ type: "hello", protocolVersion: PROTOCOL_VERSION } satisfies BridgeClientMessage));
        helloSent = true;
      } else if (message.type === "compatible" && helloSent) {
        authenticated = true;
        lastPayload = "";
        publish();
      }
    };
    connection.onclose = () => {
      if (socket === connection) {
        authenticated = false;
        const revision = tokenRevision;
        setTimeout(() => {
          if (revision === tokenRevision) connect();
        }, incompatible ? 30000 : 3000);
      }
    };
  }

  function publish(): void {
    const serialized = JSON.stringify(snapshot());
    if (authenticated && socket?.readyState === WebSocket.OPEN && serialized !== lastPayload) {
      socket.send(serialized);
      lastPayload = serialized;
    }
  }

  function start(): void {
    storage.local.get("bridgeToken", (stored) => {
      bridgeToken = typeof stored.bridgeToken === "string" ? stored.bridgeToken : "";
      connect();
    });
    storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes.bridgeToken) return;
      bridgeToken = typeof changes.bridgeToken.newValue === "string" ? changes.bridgeToken.newValue : "";
      tokenRevision += 1;
      authenticated = false;
      incompatible = false;
      const previous = socket;
      socket = undefined;
      previous?.close();
      connect();
    });
  }

  return { start, publish };
}
