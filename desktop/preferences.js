(function (root) {
  const STORAGE_KEY = "lyrics.displayPreferences.v1";
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

  const api = { STORAGE_KEY, normalize, load, save };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LyricsPreferences = api;
})(globalThis);
