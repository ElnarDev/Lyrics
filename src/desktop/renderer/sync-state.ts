import type { PlayerMessage, SyncedLine } from "../../shared/protocol.js";

export function trackIdentity({ title, artist, album, duration }:
  Pick<PlayerMessage, "title" | "artist" | "album" | "duration">): string {
  return title ? JSON.stringify([
    title.trim().toLowerCase(), artist?.trim().toLowerCase() || "",
    album?.trim().toLowerCase() || "", duration || 0,
  ]) : "";
}

export function activeLineIndex(lines: readonly SyncedLine[], currentTime: number, offset: number): number {
  return lines.reduce((index, line, i) => line.time <= currentTime + offset ? i : index, 0);
}

export function adjustedOffset(current: number, delta: number): number {
  return Math.max(-10, Math.min(10, Math.round((current + delta) * 2) / 2));
}
