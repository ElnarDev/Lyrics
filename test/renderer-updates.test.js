const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const preferences = require("../build/node/preferences");

test("clock updates avoid repeated DOM changes and the tray restores appearance", () => {
  const callbacks = {};
  const timers = [];
  const animationFrames = [];
  const compactHeights = [];
  const styles = new Map();
  const lyricRenders = [];
  const stored = new Map([[preferences.STORAGE_KEY,
    JSON.stringify({ windowOpacity: 0, lyricsOpacity: 15, fontSize: 16 })]]);
  let titleWrites = 0;
  let artistWrites = 0;
  let announcementWrites = 0;
  const announcement = {
    value: "",
    get textContent() { return this.value; },
    set textContent(value) { announcementWrites += 1; this.value = value; },
  };
  const title = {
    value: "",
    get textContent() { return this.value; },
    set textContent(value) { titleWrites += 1; this.value = value; },
  };
  const artist = {
    value: "",
    get textContent() { return this.value; },
    set textContent(value) { artistWrites += 1; this.value = value; },
  };
  const controls = Object.fromEntries(["window-opacity", "lyrics-opacity", "font-size"]
    .map((id) => [id, { value: "", addEventListener(name, callback) { this[name] = callback; } }]));
  const elements = {
    "#lyrics": { clientHeight: 160, scrollHeight: 100, replaceChildren(...children) { lyricRenders.push(children); }, addEventListener() {} },
    "#lyrics-announcement": announcement,
    "#overlay": {},
    "#title": title,
    "#artist": artist,
    "#font-size-value": { value: "" },
    "#sync-control": { hidden: true },
    "#sync-reset": { textContent: "0 s" },
    "#sync-later": {},
    "#sync-earlier": {},
    "#sync-toast": { hidden: true, textContent: "" },
    "#compact-sync-offset": { textContent: "0 s" },
    "#hide": {},
    "#drag-region": { addEventListener() {} },
    ...Object.fromEntries(Object.entries(controls).map(([id, control]) => [`#${id}`, control])),
  };
  const context = {
    document: {
      querySelector(selector) { return elements[selector]; },
      querySelectorAll() { return []; },
      createElement() { return { className: "", textContent: "" }; },
      documentElement: { style: { setProperty(name, value) { styles.set(name, value); } } },
      body: { classList: { toggle() {} } },
    },
    window: {
      innerWidth: 520,
      lyrics: {
        onCompactMode(callback) { callbacks.compact = callback; },
        onPlayerUpdate(callback) { callbacks.player = callback; },
        onLyricsUpdate(callback) { callbacks.lyrics = callback; },
        onResetAppearance(callback) { callbacks.resetAppearance = callback; },
        setCompactContentHeight(height) { compactHeights.push(height); },
      },
      LyricsPreferences: preferences,
      addEventListener(name, callback) { callbacks[name] = callback; },
    },
    getComputedStyle() { return { rowGap: "16px", paddingTop: "20px", paddingBottom: "20px" }; },
    requestAnimationFrame(callback) { animationFrames.push(callback); },
    setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    clearTimeout() {},
    localStorage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
    },
  };
  vm.runInNewContext(readFileSync(path.join(__dirname, "..", "build", "desktop", "renderer.js"), "utf8"), context);
  assert.equal(controls["window-opacity"].value, "0");
  assert.equal(lyricRenders.length, 1);
  callbacks.lyrics({ status: "ready", lines: [{ time: 0, text: "First" }, { time: 10, text: "Second" }] });
  assert.equal(lyricRenders.length, 2);
  assert.equal(announcement.textContent, "First");
  const writesBeforeClock = announcementWrites;
  for (const time of [1, 3, 5, 9]) callbacks.player({ title: "Song", artist: "Artist", currentTime: time });
  assert.equal(lyricRenders.length, 2);
  assert.equal(announcementWrites, writesBeforeClock);
  assert.equal(titleWrites, 1);
  assert.equal(artistWrites, 1);
  callbacks.player({ title: "Song", artist: "Artist", currentTime: 10 });
  assert.equal(lyricRenders.length, 3);
  assert.equal(lyricRenders.at(-1).find((line) => line.className.includes("active")).textContent, "Second");
  assert.equal(announcement.textContent, "Second");
  callbacks.player({ title: "Song", artist: "Artist", album: "Album", duration: 20, currentTime: 9.75 });
  elements["#sync-earlier"].onclick();
  assert.equal(announcement.textContent, "Second");
  assert.equal(elements["#sync-reset"].textContent, "+0.5 s");
  elements["#sync-reset"].onclick();
  assert.equal(announcement.textContent, "First");
  const keyEvent = (key, target = null) => ({ key, target, preventDefault() {} });
  callbacks.keydown(keyEvent("ArrowUp"));
  assert.equal(elements["#sync-toast"].textContent, "+0.5 s");
  assert.equal(elements["#sync-toast"].hidden, false);
  assert.equal(elements["#compact-sync-offset"].textContent, "+0.5 s");
  assert.equal(timers.at(-1).delay, 500);
  timers.at(-1).callback();
  assert.equal(elements["#sync-toast"].hidden, true);
  callbacks.keydown(keyEvent("ArrowDown"));
  assert.equal(elements["#sync-toast"].textContent, "-0.5 s");
  assert.equal(elements["#compact-sync-offset"].textContent, "0 s");
  callbacks.keydown(keyEvent("ArrowUp", { closest: (selector) => selector === "input[type=range]" ? {} : null }));
  assert.equal(elements["#compact-sync-offset"].textContent, "0 s");
  callbacks.keydown(keyEvent("ArrowUp", { closest: () => null }));
  assert.equal(elements["#compact-sync-offset"].textContent, "+0.5 s");
  elements["#lyrics"].clientHeight = 500;
  callbacks.lyrics({ status: "ready", lines: Array.from({ length: 12 }, (_, i) => ({ time: i * 10, text: `Line ${i}` })) });
  assert.ok(lyricRenders.at(-1).length > 5);
  elements["#lyrics"].clientHeight = 100;
  callbacks.resize();
  assert.ok(lyricRenders.at(-1).length < 5);
  callbacks.lyrics({ status: "offline", lines: [] });
  assert.equal(lyricRenders.length, 12);
  assert.match(lyricRenders.at(-1)[0].textContent, /LRCLIB/);
  assert.match(announcement.textContent, /LRCLIB/);
  callbacks.resetAppearance();
  assert.equal(controls["window-opacity"].value, "92");
  assert.equal(controls["lyrics-opacity"].value, "100");
  assert.equal(controls["font-size"].value, "27");
  assert.deepEqual(JSON.parse(stored.get(preferences.STORAGE_KEY)), {
    windowOpacity: 92, lyricsOpacity: 100, fontSize: 27,
  });
  controls["font-size"].value = "32";
  controls["font-size"].input();
  assert.equal(styles.get("--font-size"), "32px");
  assert.equal(JSON.parse(stored.get(preferences.STORAGE_KEY)).fontSize, 32);
  callbacks.lyrics({ status: "ready", lines: [{ time: 0, text: "First" }] });
  callbacks.keydown(keyEvent("ArrowUp"));
  assert.equal(elements["#sync-toast"].hidden, false);
  callbacks.player({ title: "Another song", artist: "Artist", currentTime: 0 });
  assert.equal(elements["#sync-toast"].hidden, true);
  assert.equal(elements["#compact-sync-offset"].textContent, "0 s");
  callbacks.compact(true);
  callbacks.compact(false);
  animationFrames.shift()();
  assert.deepEqual(compactHeights, []);
  callbacks.compact(true);
  animationFrames.shift()();
  assert.deepEqual(compactHeights, [140]);
});
