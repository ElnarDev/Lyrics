(() => {
  let socket;
  let lastPayload = "";
  let bridgeToken = "";
  let authenticated = false;
  let observedBar;
  let observedMedia;
  let metadataTimer;
  const mediaEvents = ["play", "pause", "seeking", "seeked", "loadedmetadata", "durationchange", "emptied", "ended"];
  const barObserver = new MutationObserver(() => {
    clearTimeout(metadataTimer);
    metadataTimer = setTimeout(update, 50);
  });
  function connect() {
    if (!bridgeToken) return;
    const connection = new WebSocket("ws://127.0.0.1:37421");
    socket = connection;
    connection.onopen = () => {
      if (socket !== connection) return;
      connection.send(JSON.stringify({ type: "auth", token: bridgeToken }));
    };
    connection.onmessage = (event) => {
      if (socket !== connection) return;
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message?.type !== "ready") return;
      authenticated = true;
      lastPayload = "";
      update();
    };
    connection.onclose = () => {
      if (socket === connection) {
        authenticated = false;
        setTimeout(connect, 3000);
      }
    };
  }
  function text(selector) {
    return document.querySelector(selector)?.textContent?.trim() || "";
  }
  function player() {
    return document.querySelector("video");
  }
  function ensureTargets() {
    const bar = document.querySelector("ytmusic-player-bar");
    if (bar !== observedBar) {
      barObserver.disconnect();
      observedBar = bar;
      if (bar) barObserver.observe(bar, { childList: true, subtree: true, characterData: true });
      update();
    }
    const media = player();
    if (media !== observedMedia) {
      for (const event of mediaEvents) observedMedia?.removeEventListener?.(event, update);
      observedMedia = media;
      for (const event of mediaEvents) media?.addEventListener?.(event, update);
      update();
    }
  }
  function update() {
    const media = player();
    const byline = text("ytmusic-player-bar .byline");
    const details = byline.split(/[•·]/).map((part) => part.trim());
    const payload = {
      title: text("ytmusic-player-bar .title"),
      artist: byline,
      album: details[1] || "",
      duration: Number.isFinite(media?.duration) && media.duration > 0 ? Math.round(media.duration) : 0,
      currentTime: media?.currentTime || 0,
      paused: media?.paused ?? true,
    };
    const serialized = JSON.stringify(payload);
    if (authenticated && socket?.readyState === WebSocket.OPEN && serialized !== lastPayload) {
      socket.send(serialized);
      lastPayload = serialized;
    }
  }
  chrome.storage.local.get("bridgeToken", (stored) => {
    bridgeToken = stored.bridgeToken || "";
    connect();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.bridgeToken) return;
    bridgeToken = changes.bridgeToken.newValue || "";
    authenticated = false;
    socket?.close();
    connect();
  });
  ensureTargets();
  setInterval(update, 750);
  setInterval(ensureTargets, 2000);
})();
