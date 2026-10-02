import type { PlayerState } from "../../shared/protocol.js";

export const MAX_PLAYER_MESSAGE_BYTES = 4096;

export function isAllowedPlayerOrigin(origin: string | undefined): boolean {
  return origin === "https://music.youtube.com" ||
    /^chrome-extension:\/\/[a-p]{32}$/.test(origin || "");
}

export function parsePlayerMessage(raw: Buffer, isBinary = false): PlayerState | null {
  if (isBinary || raw.length > MAX_PLAYER_MESSAGE_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    return null;
  }
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const player = value as Record<string, unknown>;
  const keys = Object.keys(player);
  const required = ["title", "artist", "currentTime", "paused"];
  const allowed = [...required, "album", "duration"];
  if (!required.every((key) => keys.includes(key)) || keys.some((key) => !allowed.includes(key))) return null;
  if (typeof player.title !== "string" || player.title.length > 300) return null;
  if (typeof player.artist !== "string" || player.artist.length > 500) return null;
  if (typeof player.currentTime !== "number" || !Number.isFinite(player.currentTime) || player.currentTime < 0 || player.currentTime > 86400) return null;
  if (typeof player.paused !== "boolean") return null;
  if (player.album !== undefined && (typeof player.album !== "string" || player.album.length > 300)) return null;
  if (player.duration !== undefined && (typeof player.duration !== "number" || !Number.isFinite(player.duration) || player.duration < 0 || player.duration > 86400)) return null;
  return {
    title: player.title.trim(),
    artist: player.artist.trim(),
    currentTime: player.currentTime,
    paused: player.paused,
    album: typeof player.album === "string" ? player.album.trim() : "",
    duration: typeof player.duration === "number" ? player.duration : 0,
  };
}
