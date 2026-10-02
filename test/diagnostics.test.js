const assert = require("node:assert/strict");
const test = require("node:test");
const { createDiagnostics } = require("../build/desktop/diagnostics");

test("diagnostic report accepts only known codes and excludes supplied private text", () => {
  const diagnostics = createDiagnostics({ now: () => new Date("2026-09-28T12:00:00Z") });
  const privateText = "Song title, lyrics and bridge-token";
  assert.equal(diagnostics.record(`lyrics-error: ${privateText}`), false);
  assert.equal(diagnostics.record({ code: "lyrics-error", token: privateText }), false);
  assert.equal(diagnostics.record("lyrics-offline"), true);
  const report = diagnostics.report("0.1.0", "win32");
  assert.deepEqual(JSON.parse(report).events, [
    { at: "2026-09-28T12:00:00.000Z", code: "lyrics-offline" },
  ]);
  assert.equal(report.includes(privateText), false);
});

test("diagnostics retain only recent events in memory", () => {
  const diagnostics = createDiagnostics({ maxEntries: 2 });
  diagnostics.record("lyrics-timeout");
  diagnostics.record("lyrics-offline");
  diagnostics.record("bridge-unavailable");
  assert.deepEqual(JSON.parse(diagnostics.report("0.1.0")).events.map(({ code }) => code), [
    "lyrics-offline", "bridge-unavailable",
  ]);
});
