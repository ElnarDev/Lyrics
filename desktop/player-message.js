const MAX_PLAYER_MESSAGE_BYTES = 4096;

function isAllowedPlayerOrigin(origin) {
  return origin === "https://music.youtube.com" ||
    /^chrome-extension:\/\/[a-p]{32}$/.test(origin || "");
}

function parsePlayerMessage(raw, isBinary = false) {
  if (isBinary || raw.length > MAX_PLAYER_MESSAGE_BYTES) return null;
  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    return null;
  }
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const keys = Object.keys(value);
  const required = ["title", "artist", "currentTime", "paused"];
  const allowed = [...required, "album", "duration"];
  if (!required.every((key) => keys.includes(key)) || keys.some((key) => !allowed.includes(key))) return null;
  if (typeof value.title !== "string" || value.title.length > 300) return null;
  if (typeof value.artist !== "string" || value.artist.length > 500) return null;
  if (typeof value.currentTime !== "number" || !Number.isFinite(value.currentTime) || value.currentTime < 0 || value.currentTime > 86400) return null;
  if (typeof value.paused !== "boolean") return null;
  if (value.album !== undefined && (typeof value.album !== "string" || value.album.length > 300)) return null;
  if (value.duration !== undefined && (typeof value.duration !== "number" || !Number.isFinite(value.duration) || value.duration < 0 || value.duration > 86400)) return null;
  return {
    title: value.title.trim(),
    artist: value.artist.trim(),
    currentTime: value.currentTime,
    paused: value.paused,
    album: value.album?.trim() || "",
    duration: value.duration || 0,
  };
}

module.exports = { MAX_PLAYER_MESSAGE_BYTES, isAllowedPlayerOrigin, parsePlayerMessage };
