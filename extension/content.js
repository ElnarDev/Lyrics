(() => {
  let socket;
  let lastPayload = "";
  let bridgeToken = "";
  let authenticated = false;
  let incompatible = false;
  const protocolVersion = 1;
  let observedBar;
  let observedMedia;
  let observedTitle;
  let observedByline;
  let metadataTimer;
  let title = "";
  let byline = "";
  let album = "";
  const mediaEvents = ["play", "pause", "seeking", "seeked", "loadedmetadata", "durationchange", "emptied", "ended"];
  const metadataObserver = new MutationObserver(() => {
    clearTimeout(metadataTimer);
    metadataTimer = setTimeout(refreshMetadata, 50);
  });
  const barObserver = new MutationObserver(ensureMetadataTargets);
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
      if (message?.type === "ready") {
        if (message.protocolVersion !== protocolVersion) {
          incompatible = true;
          connection.close();
          return;
        }
        incompatible = false;
        connection.send(JSON.stringify({ type: "hello", protocolVersion }));
      } else if (message?.type === "compatible") {
        authenticated = true;
        lastPayload = "";
        update();
      }
    };
    connection.onclose = () => {
      if (socket === connection) {
        authenticated = false;
        setTimeout(connect, incompatible ? 30000 : 3000);
      }
    };
  }
  function refreshMetadata() {
    title = observedTitle?.textContent?.trim() || "";
    byline = observedByline?.textContent?.trim() || "";
    album = byline.split(/[•·]/)[1]?.trim() || "";
    update();
  }
  function ensureMetadataTargets() {
    const titleNode = document.querySelector("ytmusic-player-bar .title");
    const bylineNode = document.querySelector("ytmusic-player-bar .byline");
    if (titleNode === observedTitle && bylineNode === observedByline) return;
    metadataObserver.disconnect();
    observedTitle = titleNode;
    observedByline = bylineNode;
    if (titleNode) metadataObserver.observe(titleNode, { childList: true, subtree: true, characterData: true });
    if (bylineNode) metadataObserver.observe(bylineNode, { childList: true, subtree: true, characterData: true });
    refreshMetadata();
  }
  function ensureTargets() {
    const bar = document.querySelector("ytmusic-player-bar");
    if (bar !== observedBar) {
      barObserver.disconnect();
      observedBar = bar;
      if (bar) barObserver.observe(bar, { childList: true, subtree: true });
    }
    ensureMetadataTargets();
    const media = document.querySelector("video");
    if (media !== observedMedia) {
      for (const event of mediaEvents) observedMedia?.removeEventListener?.(event, update);
      observedMedia = media;
      for (const event of mediaEvents) media?.addEventListener?.(event, update);
      update();
    }
  }
  function update() {
    const media = observedMedia;
    const payload = {
      title,
      artist: byline,
      album,
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
    incompatible = false;
    socket?.close();
    connect();
  });
  ensureTargets();
  setInterval(update, 750);
  setInterval(ensureTargets, 2000);
})();
