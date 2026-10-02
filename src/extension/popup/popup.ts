import { PROTOCOL_VERSION, type BridgeClientMessage } from "../../shared/protocol.js";
import { parseServerHandshake } from "../../shared/bridge-server-message.js";

declare const chrome: {
  storage: { local: {
    get(key: string, callback: (result: { bridgeToken?: unknown }) => void): void;
    set(value: { bridgeToken: string }, callback: () => void): void;
  } };
  runtime: { lastError?: unknown };
};

type PopupState = "unpaired" | "editing" | "checking" | "connected" | "disconnected" |
  "invalid" | "update-app" | "update-extension";

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id) as T | null;
  if (!element) throw new Error(`Missing popup element: ${id}`);
  return element;
}

const form = requiredElement<HTMLFormElement>("pair-form");
const input = requiredElement<HTMLInputElement>("bridge-token");
const status = requiredElement<HTMLElement>("status");
const heading = requiredElement<HTMLElement>("heading");
const instructions = requiredElement<HTMLElement>("instructions");
const changeKey = requiredElement<HTMLButtonElement>("change-key");
let savedToken = "";
let socket: WebSocket | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let editing = false;

function showState(state: PopupState): void {
  const needsKey = state === "unpaired" || state === "editing";
  heading.textContent = needsKey ? "Vincular Lyrics" : state === "connected" ? "Lyrics conectado" : "Lyrics vinculado";
  instructions.hidden = !needsKey;
  form.hidden = !needsKey;
  changeKey.hidden = needsKey;
  const messages: Record<PopupState, string> = {
    unpaired: "Aún no hay una clave guardada.",
    editing: "Pega una nueva clave para cambiar la vinculación.",
    checking: "Clave guardada; comprobando conexión local…",
    connected: "Lyrics está abierto y aceptó la clave. Reproduce música en YouTube Music para ver las letras.",
    disconnected: "Clave guardada; esperando a que Lyrics esté abierta.",
    invalid: "No se pudo verificar la clave. Usa «Cambiar vinculación» si la clave cambió.",
    "update-app": "Esta versión de Lyrics para Windows no es compatible. Actualiza la aplicación.",
    "update-extension": "La aplicación requiere una versión más reciente de la extensión. Actualízala en Chrome.",
  };
  status.textContent = messages[state];
}

function stopProbe(): void {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  if (socket) {
    const oldSocket = socket;
    socket = undefined;
    oldSocket.close();
  }
}

function probeConnection(): void {
  if (!savedToken || editing) return;
  showState("checking");
  const connection = new WebSocket("ws://127.0.0.1:37421");
  socket = connection;
  let helloSent = false;
  connection.onopen = () => {
    if (socket === connection) connection.send(JSON.stringify({ type: "auth", token: savedToken } satisfies BridgeClientMessage));
  };
  connection.onmessage = (event) => {
    if (socket !== connection) return;
    try {
      const message = parseServerHandshake(JSON.parse(String(event.data)));
      if (!message) return;
      if (message.type === "ready") {
        const version = message.protocolVersion;
        if (version !== PROTOCOL_VERSION) {
          showState(typeof version === "number" && version > PROTOCOL_VERSION ? "update-extension" : "update-app");
          socket = undefined;
          connection.close();
          return;
        }
        connection.send(JSON.stringify({ type: "hello", protocolVersion: PROTOCOL_VERSION } satisfies BridgeClientMessage));
        helloSent = true;
      } else if (message.type === "compatible" && helloSent) showState("connected");
    } catch { /* Ignore unexpected bridge messages. */ }
  };
  connection.onclose = (event) => {
    if (socket !== connection) return;
    socket = undefined;
    if (event.code === 4002) {
      showState("update-extension");
      return;
    }
    if (event.code === 1008) {
      showState("invalid");
      return;
    }
    showState("disconnected");
    retryTimer = setTimeout(probeConnection, 3000);
  };
}

chrome.storage.local.get("bridgeToken", ({ bridgeToken }) => {
  savedToken = typeof bridgeToken === "string" ? bridgeToken : "";
  if (/^[a-f0-9]{64}$/.test(savedToken)) probeConnection();
  else showState("unpaired");
});

changeKey.addEventListener("click", () => {
  stopProbe();
  editing = true;
  showState("editing");
  input.focus();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const bridgeToken = input.value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(bridgeToken)) {
    status.textContent = "La clave debe tener 64 caracteres hexadecimales.";
    return;
  }
  chrome.storage.local.set({ bridgeToken }, () => {
    if (chrome.runtime.lastError) {
      status.textContent = "No se pudo guardar la clave. Inténtalo de nuevo.";
      return;
    }
    input.value = "";
    savedToken = bridgeToken;
    editing = false;
    stopProbe();
    probeConnection();
  });
});

window.addEventListener("unload", stopProbe);
