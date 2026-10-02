const assert = require("node:assert/strict");
const test = require("node:test");
const { matchesTrack, chooseResult, primaryArtist } = require("../build/desktop/lyrics-matcher");

const collaborationTrack = { title: "Lo Que No Sabes Tú (con El Potro Álvarez)",
  artist: "Chino & Nacho y Baroni · Mi Niña Bonita (International Version) · 2010",
  album: "Mi Niña Bonita (International Version)", duration: 234 };
function collaborationEntry(artistName, duration, text, extra = {}) {
  return { trackName: "Lo Que No Sabes Tú", artistName, albumName: collaborationTrack.album,
    duration, syncedLyrics: `[00:01.00] ${text}`, ...extra };
}

test("conserva el dúo y no acepta al artista truncado ni un nombre parecido", () => {
  assert.equal(primaryArtist(collaborationTrack.artist), "Chino & Nacho");
  for (const artistName of ["Chino", "Chino & Nacho Junior", "Otro & Nacho"]) {
    assert.equal(matchesTrack(collaborationEntry(artistName, 234, "Incorrecta"),
      collaborationTrack.title, collaborationTrack.artist), false);
  }
});

test("los colaboradores distinguen la grabación cercana con álbum compatible", () => {
  const entries = [collaborationEntry("Chino & Nacho", 234, "Sin colaboradores"),
    collaborationEntry("Chino", 234, "Artista truncado", { trackName: "Lo Que No Sabes Tú (feat. El Potro Álvarez)" }),
    collaborationEntry("Chino & Nacho/Baroni/El Potro Alvarez", 232, "Colaboración")];
  for (const candidates of [entries, [...entries].reverse()]) {
    assert.deepEqual(chooseResult(candidates, collaborationTrack).lines, [{ time: 1, text: "Colaboración" }]);
  }
});

test("créditos equivalentes mantienen empates reales sin depender del orden", () => {
  const entries = [collaborationEntry("Chino & Nacho feat. Baroni & El Potro Álvarez", 232, "A"),
    collaborationEntry("El Potro Alvarez / Baroni / Nacho y Chino", 232, "B")];
  assert.deepEqual(chooseResult(entries, collaborationTrack), { mode: "ambiguous", lines: [] });
});

test("el invitado del título complementa el crédito del dúo y Baroni", () => {
  const entries = [collaborationEntry("Chino & Nacho", 234, "Sin colaboradores"),
    collaborationEntry("Chino & Nacho/Baroni/El Potro Alvarez", 232, "Cercana"),
    collaborationEntry("Chino, Nacho, Baroni", 234, "Completa", {
      trackName: "Lo Que No Sabes Tú (feat. El Potro Álvarez)" })];
  assert.deepEqual(chooseResult(entries, collaborationTrack).lines, [{ time: 1, text: "Completa" }]);
});

test("los colaboradores no superan límites de duración ni cambian versiones live", () => {
  const base = collaborationEntry("Chino & Nacho", 234, "Base");
  for (const extra of [{ duration: 240 }, { trackName: "Lo Que No Sabes Tú (Live)" },
    { albumName: "Otro álbum" }]) {
    const guest = collaborationEntry("Chino & Nacho/Baroni/El Potro Alvarez", 232, "Otra", extra);
    assert.deepEqual(chooseResult([guest, base], collaborationTrack).lines, [{ time: 1, text: "Base" }]);
  }
});

test("la selección descarta entradas sin identidad válida", () => {
  const track = { title: "Rebelión", artist: "Joe Arroyo", duration: 376 };
  assert.equal(matchesTrack(null, track.title, track.artist), false);
  assert.equal(matchesTrack({ trackName: "Rebelión", artistName: 7 }, track.title, track.artist), false);
  assert.deepEqual(chooseResult([null, "texto", { trackName: "Rebelión", artistName: 7 }], track), {
    mode: "missing", lines: [],
  });
});

test("una versión lejana no gana frente a la duración de la pista", () => {
  const track = { title: "Rebelión", artist: "Joe Arroyo", duration: 376 };
  assert.deepEqual(chooseResult([
    { trackName: "Rebelión", artistName: "Joe Arroyo", duration: 250,
      syncedLyrics: "[01:00.00] Versión incorrecta" },
    { trackName: "Rebelión", artistName: "Joe Arroyo", duration: 375,
      syncedLyrics: "[01:00.00] Versión cercana" },
  ], track), { mode: "synced", lines: [{ time: 60, text: "Versión cercana" }] });
});

test("metadatos malformados no se convierten en evidencia de una coincidencia", () => {
  const track = { title: "Song", artist: "Artist", album: "Album", duration: 200 };
  const entry = { trackName: "Song", artistName: "Artist", albumName: "Album", duration: 200,
    syncedLyrics: "[00:01.00] Incorrecta" };
  const valid = { ...entry, syncedLyrics: "[00:02.00] Válida" };
  for (const duration of ["200", [200], true, {}, NaN, Infinity, -1, 86401]) {
    const malformed = { ...entry, duration };
    assert.equal(matchesTrack(malformed, track.title, track.artist), false);
    assert.deepEqual(chooseResult([malformed, valid], track).lines, [{ time: 2, text: "Válida" }]);
  }
  for (const albumName of [123, [], {}]) {
    assert.equal(matchesTrack({ ...entry, albumName }, track.title, track.artist), false);
  }
});

test("duraciones desconocidas y numéricas válidas conservan su comportamiento", () => {
  const track = { title: "Song", artist: "Artist" };
  for (const duration of [undefined, null, 0, 200.125, 86400]) {
    const entry = { trackName: "Song", artistName: "Artist", duration,
      syncedLyrics: "[00:01.00] Válida" };
    assert.equal(chooseResult([entry], track).mode, "synced");
  }
});

test("la identidad LRCLIB respeta límites de longitud y campos opcionales", () => {
  const track = { title: "Song", artist: "Artist" };
  const entry = { trackName: track.title, artistName: track.artist, syncedLyrics: "[00:01.00] Válida" };
  for (const extra of [{ trackName: "Song" + " ".repeat(300) }, { name: "x".repeat(301) },
    { artistName: "Artist" + " ".repeat(500) }, { albumName: "x".repeat(301) },
    { trackName: " " }, { artistName: " " }, { name: 123 }]) {
    assert.equal(chooseResult([{ ...entry, ...extra }], track).mode, "missing");
  }
  const boundary = { ...entry, trackName: "Song" + " ".repeat(296),
    artistName: "Artist" + " ".repeat(494), albumName: "x".repeat(300) };
  assert.equal(chooseResult([boundary], track).mode, "synced");
  assert.equal(chooseResult([{ ...entry, albumName: null, duration: null }], track).mode, "synced");
});
