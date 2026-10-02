import type { LyricsResult, LyricsStatus, PlayerMessage } from "../../shared/protocol.js";
import type { SendPlaybackEvent } from "../../shared/overlay-api.js";

const resultStatus: Record<LyricsResult["mode"], LyricsStatus> = {
  synced: "ready",
  plain: "not-synced",
  missing: "not-found",
  "unsynced-only": "not-synced",
  ambiguous: "ambiguous",
};

interface SelectedPlayer<Source> {
  source: Source;
  player: PlayerMessage;
}

interface SessionOptions {
  lookup: (player: PlayerMessage) => Promise<LyricsResult>;
  trackKey: (player: PlayerMessage) => string;
  send: SendPlaybackEvent;
  invalidate: (key: string) => void;
  errorStatus: (error: unknown) => LyricsStatus;
  warn: (error: unknown) => void;
}

export function createLyricsSession<Source extends object = object>(
  { lookup, trackKey, send, invalidate, errorStatus, warn }: SessionOptions,
) {
  let displayedSource: Source | null = null;
  let activeTrackKey = "";
  let revision = 0;

  function showSelectedPlayer(selected: SelectedPlayer<Source> | null, updatedSource: Source | null = null,
    forceLookup = false): void {
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
          lines: result.mode === "plain" ? [] : result.lines,
          status: resultStatus[result.mode],
          mode: result.mode,
        });
      }
    }).catch((error: unknown) => {
      warn(error);
      if (activeTrackKey === key && revision === lookupRevision) {
        send("lyrics-update", { lines: [], status: errorStatus(error) });
      }
    });
  }

  function reset(): void {
    activeTrackKey = "";
    displayedSource = null;
    revision += 1;
  }

  return { showSelectedPlayer, reset };
}
