(function (root) {
  const STORAGE_KEY = "lyrics.displayPreferences.v1";
  const OFFSETS_KEY = "lyrics.syncOffsets.v1";
  const fields = {
    windowOpacity: { defaultValue: 92, min: 0, max: 100 },
    lyricsOpacity: { defaultValue: 100, min: 15, max: 100 },
    fontSize: { defaultValue: 27, min: 16, max: 48 },
  };

  function normalize(input) {
    const result = {};
    for (const [name, rule] of Object.entries(fields)) {
      const value = input?.[name];
      const numeric = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
      result[name] = Number.isFinite(numeric) && value !== ""
        ? Math.min(rule.max, Math.max(rule.min, Math.round(numeric)))
        : rule.defaultValue;
    }
    return result;
  }

  function load(storage) {
    try {
      const stored = storage.getItem(STORAGE_KEY);
      return normalize(stored ? JSON.parse(stored) : null);
    } catch {
      return normalize(null);
    }
  }

  function save(storage, input) {
    const preferences = normalize(input);
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      return true;
    } catch {
      return false;
    }
  }

  function loadOffset(storage, trackKey) {
    if (!trackKey) return 0;
    try {
      const value = JSON.parse(storage.getItem(OFFSETS_KEY) || "{}")[trackKey];
      return Number.isFinite(value) && Math.abs(value) <= 10 ? value : 0;
    } catch { return 0; }
  }

  function saveOffset(storage, trackKey, offset) {
    if (!trackKey || !Number.isFinite(offset) || Math.abs(offset) > 10) return false;
    try {
      const stored = JSON.parse(storage.getItem(OFFSETS_KEY) || "{}");
      const entries = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
      delete entries[trackKey];
      if (offset !== 0) entries[trackKey] = offset;
      while (Object.keys(entries).length > 100) delete entries[Object.keys(entries)[0]];
      storage.setItem(OFFSETS_KEY, JSON.stringify(entries));
      return true;
    } catch { return false; }
  }

  const api = { STORAGE_KEY, OFFSETS_KEY, normalize, load, save, loadOffset, saveOffset };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LyricsPreferences = api;
})(globalThis);
