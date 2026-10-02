import type { DisplayPreferences, LyricsResult, PlayerMessage, TrackMetadata } from "../../src/shared/protocol.js";
import type { TrackQuery } from "../../src/desktop/lyrics/lyrics-matcher.js";
import type { ParsedLyrics } from "../../src/desktop/lyrics/lyrics-parser.js";
import type { DisplayPreferences as RendererPreferences } from "../../src/desktop/renderer/preferences.js";

type Same<Left, Right> = [Left, Right] extends [Right, Left] ? true : false;
type Assert<Value extends true> = Value;

export type SharedContractChecks = [
  Assert<Same<TrackQuery, TrackMetadata>>,
  Assert<Same<Pick<PlayerMessage, keyof TrackMetadata>, TrackMetadata>>,
  Assert<Same<ParsedLyrics, Extract<LyricsResult, { mode: "synced" | "plain" }>>>,
  Assert<Same<RendererPreferences, DisplayPreferences>>,
];

declare function acceptParsed(value: ParsedLyrics): void;
declare function acceptTrack(value: TrackQuery): void;
declare function acceptPreferences(value: DisplayPreferences): void;

acceptParsed({ mode: "synced", lines: [{ time: 1, text: "Line" }] });
acceptParsed({ mode: "plain", lines: ["Line"] });
acceptTrack({ title: "Song", artist: "Artist" });
acceptPreferences({ windowOpacity: 92, lyricsOpacity: 100, fontSize: 27 });

// @ts-expect-error Una letra sincronizada requiere marcas de tiempo.
acceptParsed({ mode: "synced", lines: ["Untimed"] });
// @ts-expect-error Los estados de búsqueda no son resultados del parser.
acceptParsed({ mode: "missing", lines: [] });
// @ts-expect-error La duración normalizada no acepta texto.
acceptTrack({ title: "Song", artist: "Artist", duration: "200" });
// @ts-expect-error Las preferencias normalizadas contienen números.
acceptPreferences({ windowOpacity: "92", lyricsOpacity: 100, fontSize: 27 });
