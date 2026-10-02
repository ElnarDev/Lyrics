import { readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Bounds } from "./window-bounds.js";

const FILE_NAME = "window-state.json";

export interface WindowState {
  version: 1;
  compactMode: boolean;
  bounds: Bounds;
  normalBounds: Bounds;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validBounds(value: unknown, minHeight: number): value is Bounds {
  if (!isRecord(value)) return false;
  const { x, y, width, height } = value;
  return [x, y, width, height].every((part) => typeof part === "number" && Number.isInteger(part)) &&
    typeof x === "number" && typeof y === "number" &&
    typeof width === "number" && typeof height === "number" &&
    Math.abs(x) <= 100000 && Math.abs(y) <= 100000 &&
    width >= 360 && width <= 8192 && height >= minHeight && height <= 8192;
}

export function normalizeWindowState(value: unknown): WindowState | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.compactMode !== "boolean" ||
    !validBounds(value.bounds, value.compactMode ? 80 : 260) ||
    !validBounds(value.normalBounds, 260)) return null;
  return {
    version: 1,
    compactMode: value.compactMode,
    bounds: { x: value.bounds.x, y: value.bounds.y, width: value.bounds.width, height: value.bounds.height },
    normalBounds: { x: value.normalBounds.x, y: value.normalBounds.y,
      width: value.normalBounds.width, height: value.normalBounds.height },
  };
}

function intersectionArea(a: Bounds, b: Bounds): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

function fitBounds(bounds: Bounds, area: Bounds, minHeight: number): Bounds {
  const width = Math.min(Math.max(360, bounds.width), area.width);
  const height = Math.min(Math.max(minHeight, bounds.height), area.height);
  return {
    x: Math.min(Math.max(bounds.x, area.x), area.x + area.width - width),
    y: Math.min(Math.max(bounds.y, area.y), area.y + area.height - height),
    width,
    height,
  };
}

export function restoreWindowState(saved: unknown, workAreas: Bounds[], primaryWorkArea: Bounds | undefined):
  { compactMode: boolean; bounds: Bounds; normalBounds: Bounds } | null {
  const state = normalizeWindowState(saved);
  if (!state || !primaryWorkArea) return null;
  let area = primaryWorkArea;
  let bestOverlap = 0;
  for (const candidate of workAreas) {
    const overlap = intersectionArea(state.bounds, candidate);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      area = candidate;
    }
  }
  const bounds = fitBounds(state.bounds, area, state.compactMode ? 80 : 260);
  const normalBounds = state.compactMode
    ? fitBounds({ ...state.normalBounds, x: bounds.x, y: bounds.y }, area, 260)
    : bounds;
  return { compactMode: state.compactMode, bounds, normalBounds };
}

export function loadWindowState(userDataPath: string): WindowState | null {
  try {
    return normalizeWindowState(JSON.parse(readFileSync(path.join(userDataPath, FILE_NAME), "utf8")));
  } catch {
    return null;
  }
}

export function saveWindowState(userDataPath: string, input: unknown): boolean {
  const state = normalizeWindowState({ ...(isRecord(input) ? input : {}), version: 1 });
  if (!state) return false;
  const destination = path.join(userDataPath, FILE_NAME);
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
    renameSync(temporary, destination);
    return true;
  } catch {
    try { unlinkSync(temporary); } catch { /* Nothing to clean up. */ }
    return false;
  }
}
