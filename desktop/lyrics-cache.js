const DEFAULT_MAX_ENTRIES = 200;
const SYNCED_TTL_MS = 60 * 60 * 1000;
const MISSING_TTL_MS = 5 * 60 * 1000;
const AMBIGUOUS_TTL_MS = 2 * 60 * 1000;

class LyricsCache {
  constructor({ maxEntries = DEFAULT_MAX_ENTRIES, now = Date.now } = {}) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new RangeError("Invalid cache size");
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map();
  }

  delete(key) {
    this.entries.delete(key);
  }

  get(key, load) {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > this.now()) {
      this.entries.delete(key);
      this.entries.set(key, existing);
      return existing.promise;
    }
    this.entries.delete(key);
    const entry = { expiresAt: Infinity, promise: null };
    entry.promise = Promise.resolve().then(load).then((result) => {
      const ttl = result?.mode === "synced" ? SYNCED_TTL_MS :
        result?.mode === "ambiguous" ? AMBIGUOUS_TTL_MS : MISSING_TTL_MS;
      entry.expiresAt = this.now() + ttl;
      return result;
    }, (error) => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, entry);
    for (const [storedKey, storedEntry] of this.entries) {
      if (storedEntry.expiresAt <= this.now()) this.entries.delete(storedKey);
    }
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
    return entry.promise;
  }
}

module.exports = { LyricsCache };
