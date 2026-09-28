const fs = require("fs");
const path = require("path");

const FILE_NAME = "window-state.json";

function validBounds(bounds, minHeight) {
  return bounds && [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isInteger) &&
    Math.abs(bounds.x) <= 100000 && Math.abs(bounds.y) <= 100000 &&
    bounds.width >= 360 && bounds.width <= 8192 &&
    bounds.height >= minHeight && bounds.height <= 8192;
}

function normalizeWindowState(value) {
  if (!value || value.version !== 1 || typeof value.compactMode !== "boolean" ||
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

function intersectionArea(a, b) {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

function fitBounds(bounds, area, minHeight) {
  const width = Math.min(Math.max(360, bounds.width), area.width);
  const height = Math.min(Math.max(minHeight, bounds.height), area.height);
  return {
    x: Math.min(Math.max(bounds.x, area.x), area.x + area.width - width),
    y: Math.min(Math.max(bounds.y, area.y), area.y + area.height - height),
    width,
    height,
  };
}

function restoreWindowState(saved, workAreas, primaryWorkArea) {
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

function loadWindowState(userDataPath) {
  try {
    return normalizeWindowState(JSON.parse(fs.readFileSync(path.join(userDataPath, FILE_NAME), "utf8")));
  } catch {
    return null;
  }
}

function saveWindowState(userDataPath, input) {
  const state = normalizeWindowState({ ...input, version: 1 });
  if (!state) return false;
  const destination = path.join(userDataPath, FILE_NAME);
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
    fs.renameSync(temporary, destination);
    return true;
  } catch {
    try { fs.unlinkSync(temporary); } catch { /* Nothing to clean up. */ }
    return false;
  }
}

module.exports = { normalizeWindowState, restoreWindowState, loadWindowState, saveWindowState };
