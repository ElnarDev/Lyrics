const form = document.getElementById("pair-form");
const input = document.getElementById("bridge-token");
const status = document.getElementById("status");
const heading = document.getElementById("heading");
const instructions = document.getElementById("instructions");
const changeKey = document.getElementById("change-key");
let savedToken = "";
let socket;
let retryTimer;
let editing = false;
const protocolVersion = 1;

function showState(state) {
  const needsKey = state === "unpaired" || state === "editing";
  heading.textContent = needsKey ? "Vincular Lyrics" : state === "connected" ? "Lyrics conectado" : "Lyrics vinculado";
  instructions.hidden = !needsKey;
  form.hidden = !needsKey;
  changeKey.hidden = needsKey;
  status.textContent = {
    unpaired: "Aún no hay una clave guardada.",
    editing: "Pega una nueva clave para cambiar la vinculación.",
    checking: "Clave guardada; comprobando conexión local…",
    connected: "Lyrics está abierto y aceptó la clave. Reproduce música en YouTube Music para ver las letras.",
    disconnected: "Clave guardada; esperando a que Lyrics esté abierta.",
    invalid: "No se pudo verificar la clave. Usa «Cambiar vinculación» si la clave cambió.",
    "update-app": "Esta versión de Lyrics para Windows no es compatible. Actualiza la aplicación.",
    "update-extension": "La aplicación requiere una versión más reciente de la extensión. Actualízala en Chrome.",
  }[state];
}

function stopProbe() {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  if (socket) {
    const oldSocket = socket;
    socket = undefined;
    oldSocket.close();
  }
}

function probeConnection() {
  if (!savedToken || editing) return;
  showState("checking");
  const connection = new WebSocket("ws://127.0.0.1:37421");
  socket = connection;
  connection.onopen = () => {
    if (socket === connection) connection.send(JSON.stringify({ type: "auth", token: savedToken }));
  };
  connection.onmessage = (event) => {
    if (socket !== connection) return;
    try {
      const message = JSON.parse(event.data);
      if (message?.type === "ready") {
        if (message.protocolVersion !== protocolVersion) {
          showState(message.protocolVersion > protocolVersion ? "update-extension" : "update-app");
          socket = undefined;
          connection.close();
          return;
        }
        connection.send(JSON.stringify({ type: "hello", protocolVersion }));
      } else if (message?.type === "compatible") showState("connected");
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
  savedToken = bridgeToken || "";
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
