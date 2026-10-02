import type { OverlayEvent, SendPlaybackEvent } from "../../src/shared/overlay-api.js";

declare const send: (...event: OverlayEvent) => void;
declare const forward: SendPlaybackEvent;

send("player-update", { title: "Song", artist: "Artist", currentTime: 0, paused: true });
send("lyrics-update", { lines: [{ time: 1, text: "Line" }], status: "ready" });
send("compact-mode", true);
send("reset-appearance");

// @ts-expect-error Canal inexistente.
send("unknown", true);
// @ts-expect-error El canal de letras requiere LyricsUpdate, no PlayerMessage.
send("lyrics-update", { title: "Song", artist: "Artist", currentTime: 0, paused: true });
// @ts-expect-error compact-mode requiere booleano.
send("compact-mode", "true");
// @ts-expect-error Las letras deben incluir tiempos.
send("lyrics-update", { lines: ["Untimed"], status: "ready" });
// @ts-expect-error reset-appearance no recibe argumentos.
send("reset-appearance", false);
// @ts-expect-error player-update requiere un estado completo.
send("player-update", { title: "Song" });
// @ts-expect-error La sesión solo emite reproducción y letras.
forward("compact-mode", true);

declare const channel: "player-update" | "lyrics-update";
// @ts-expect-error Un canal unión no garantiza que su payload sea de letras.
send(channel, { lines: [], status: "waiting" });
