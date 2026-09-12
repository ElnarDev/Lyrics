(() => {
  let socket;
  let lastPayload = "";
  function connect() {
    socket = new WebSocket("ws://127.0.0.1:37421");
    socket.onclose = () => setTimeout(connect, 3000);
  }
  function text(selector) {
    return document.querySelector(selector)?.textContent?.trim() || "";
  }
  function player() {
    return document.querySelector("video");
  }
  function update() {
    const media = player();
    const payload = {
      title: text("ytmusic-player-bar .title"),
      artist: text("ytmusic-player-bar .byline"),
      currentTime: media?.currentTime || 0,
      paused: media?.paused ?? true,
    };
    const serialized = JSON.stringify(payload);
    if (socket?.readyState === WebSocket.OPEN && serialized !== lastPayload) {
      socket.send(serialized);
      lastPayload = serialized;
    }
  }
  connect();
  setInterval(update, 300);
  new MutationObserver(update).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
