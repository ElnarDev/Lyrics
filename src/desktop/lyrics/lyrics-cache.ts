const DEFAULT_MAX_ENTRIES = 200;
const SYNCED_TTL_MS = 60 * 60 * 1000;
const MISSING_TTL_MS = 5 * 60 * 1000;
const AMBIGUOUS_TTL_MS = 2 * 60 * 1000;

type CacheValue = { mode?: string } | null | undefined;
type CacheEntry<T> = { expiresAt: number; promise: Promise<T> };

export class LyricsCache<T extends CacheValue = CacheValue> {
  readonly maxEntries: number;
  readonly now: () => number;
  readonly entries = new Map<string, CacheEntry<T>>();

  constructor({ maxEntries = DEFAULT_MAX_ENTRIES, now = Date.now }: {
    maxEntries?: number;
    now?: () => number;
  } = {}) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new RangeError("Invalid cache size");
    this.maxEntries = maxEntries;
    this.now = now;
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  get(key: string, load: () => T | Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > this.now()) {
      this.entries.delete(key);
      this.entries.set(key, existing);
      return existing.promise;
    }
    this.entries.delete(key);
    const entry: CacheEntry<T> = {
      expiresAt: Infinity,
      promise: Promise.resolve().then(load).then((result) => {
        const ttl = result?.mode === "synced" ? SYNCED_TTL_MS :
          result?.mode === "ambiguous" ? AMBIGUOUS_TTL_MS : MISSING_TTL_MS;
        entry.expiresAt = this.now() + ttl;
        return result;
      }, (error: unknown) => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
        throw error;
      }),
    };
    this.entries.set(key, entry);
    for (const [storedKey, storedEntry] of this.entries) {
      if (storedEntry.expiresAt <= this.now()) this.entries.delete(storedKey);
    }
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
    return entry.promise;
  }
}
