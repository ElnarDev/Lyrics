const assert = require("node:assert/strict");
const test = require("node:test");
const { parseSyncedLyrics, resultFromEntry } = require("../build/desktop/lyrics-parser");

test("LRC admite varias marcas por línea y ordena por tiempo", () => {
  assert.deepEqual(parseSyncedLyrics("[00:03.50][00:01.00] Hola\n[00:02.00] Mundo\n[00:04.00]"), [
    { time: 1, text: "Hola" },
    { time: 2, text: "Mundo" },
    { time: 3.5, text: "Hola" },
  ]);
});

test("una respuesta malformada conserva el error reconocido por la interfaz", () => {
  for (const entry of [[], "lyrics", { syncedLyrics: 4 }, { plainLyrics: {} }]) {
    assert.throws(() => resultFromEntry(entry), { name: "InvalidLyricsResponse" });
  }
  assert.equal(resultFromEntry(null), null);
  assert.deepEqual(resultFromEntry({ plainLyrics: " One \n\n Two " }), {
    mode: "plain", lines: ["One", "Two"],
  });
});

test("LRC conserva tiempos válidos en cero, minutos largos y el límite de 24 horas", () => {
  assert.deepEqual(parseSyncedLyrics("[00:00.00] Inicio\n[123:59.999] Larga\n[1440:00] Límite"), [
    { time: 0, text: "Inicio" }, { time: 7439.999, text: "Larga" }, { time: 86400, text: "Límite" },
  ]);
});

test("LRC rechaza tiempos no finitos y marcas fuera de rango antes del renderer", () => {
  for (const source of ["[00:60] Inválida", "[1440:00.01] Fuera de rango",
    `[${"9".repeat(400)}:00] No finita`, "[00:01][00:99] Mezcla", "[00:99]"]) {
    assert.throws(() => parseSyncedLyrics(source), { name: "InvalidLyricsResponse" });
    assert.throws(() => resultFromEntry({ syncedLyrics: source, plainLyrics: "Alternativa sin tiempos" }),
      { name: "InvalidLyricsResponse" });
  }
});
