import type { DisplayPreferences } from "../../shared/protocol.js";

export type { DisplayPreferences } from "../../shared/protocol.js";

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PreferencesApi {
  STORAGE_KEY: string;
  OFFSETS_KEY: string;
  normalize(input: unknown): DisplayPreferences;
  load(storage: PreferenceStorage): DisplayPreferences;
  save(storage: PreferenceStorage, input: unknown): boolean;
  loadOffset(storage: PreferenceStorage, trackKey: string): number;
  saveOffset(storage: PreferenceStorage, trackKey: string, offset: number): boolean;
}

const STORAGE_KEY = "lyrics.displayPreferences.v1";
const OFFSETS_KEY = "lyrics.syncOffsets.v1";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function boundedValue(value: unknown, defaultValue: number, min: number, max: number): number {
  const numeric = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numeric) && value !== ""
    ? Math.min(max, Math.max(min, Math.round(numeric))) : defaultValue;
}

function normalize(input: unknown): DisplayPreferences {
  const values = asRecord(input);
  return {
    windowOpacity: boundedValue(values.windowOpacity, 92, 0, 100),
    lyricsOpacity: boundedValue(values.lyricsOpacity, 100, 15, 100),
    fontSize: boundedValue(values.fontSize, 27, 16, 48),
  };
}

function load(storage: PreferenceStorage): DisplayPreferences {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return normalize(stored ? JSON.parse(stored) as unknown : null);
  } catch {
    return normalize(null);
  }
}

function save(storage: PreferenceStorage, input: unknown): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalize(input)));
    return true;
  } catch {
    return false;
  }
}

function loadOffset(storage: PreferenceStorage, trackKey: string): number {
  if (!trackKey) return 0;
  try {
    const value = asRecord(JSON.parse(storage.getItem(OFFSETS_KEY) || "{}") as unknown)[trackKey];
    return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 10 ? value : 0;
  } catch { return 0; }
}

function validOffsetEntries(input: unknown): Record<string, number> {
  return Object.fromEntries(Object.entries(asRecord(input)).filter((entry): entry is [string, number] => {
    const [key, value] = entry;
    return Boolean(key) && typeof value === "number" && Number.isFinite(value) && value !== 0 && Math.abs(value) <= 10;
  }));
}

function saveOffset(storage: PreferenceStorage, trackKey: string, offset: number): boolean {
  if (!trackKey || !Number.isFinite(offset) || Math.abs(offset) > 10) return false;
  try {
    let entries = validOffsetEntries(JSON.parse(storage.getItem(OFFSETS_KEY) || "{}") as unknown);
    delete entries[trackKey];
    if (offset !== 0) entries = { ...entries, [trackKey]: offset };
    while (Object.keys(entries).length > 100) delete entries[Object.keys(entries)[0]];
    storage.setItem(OFFSETS_KEY, JSON.stringify(entries));
    return true;
  } catch { return false; }
}

const api: PreferencesApi = { STORAGE_KEY, OFFSETS_KEY, normalize, load, save, loadOffset, saveOffset };
(globalThis as typeof globalThis & { LyricsPreferences: PreferencesApi }).LyricsPreferences = api;

export { STORAGE_KEY, OFFSETS_KEY, normalize, load, save, loadOffset, saveOffset };
