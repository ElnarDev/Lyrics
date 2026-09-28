function createLyricsSession({ lookup, trackKey, send, invalidate, errorStatus, warn }) {
  let displayedSource = null;
  let activeTrackKey = "";
  let revision = 0;

  function showSelectedPlayer(selected, updatedSource = null, forceLookup = false) {
    const source = selected?.source ?? null;
    if (source === displayedSource && source !== updatedSource) return;
    displayedSource = source;
    if (!selected) {
      activeTrackKey = "";
      revision += 1;
      send("player-update", { title: "", artist: "", currentTime: 0, paused: true });
      send("lyrics-update", { lines: [], status: "waiting" });
      return;
    }

    const player = selected.player;
    send("player-update", player);
    const key = trackKey(player);
    if (forceLookup) invalidate(key);
    if (key === activeTrackKey && !forceLookup) return;
    activeTrackKey = key;
    const lookupRevision = ++revision;
    send("lyrics-update", { lines: [], status: "loading" });
    lookup(player).then((result) => {
      if (activeTrackKey === key && revision === lookupRevision) {
        send("lyrics-update", {
          lines: result.lines,
          status: result.mode === "missing" ? "not-found" : result.mode === "unsynced-only" ? "not-synced" : result.mode === "ambiguous" ? "ambiguous" : "ready",
          mode: result.mode,
        });
      }
    }).catch((error) => {
      warn(error);
      if (activeTrackKey === key && revision === lookupRevision) {
        send("lyrics-update", { lines: [], status: errorStatus(error) });
      }
    });
  }

  function reset() {
    activeTrackKey = "";
    displayedSource = null;
    revision += 1;
  }

  return { showSelectedPlayer, reset };
}

module.exports = { createLyricsSession };
