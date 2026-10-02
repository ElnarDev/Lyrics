import type { LyricsStatus } from "../../shared/protocol.js";

export function lyricsErrorStatus(error: unknown): LyricsStatus {
  const name = typeof error === "object" && error !== null && "name" in error
    ? error.name : undefined;
  if (name === "TimeoutError") return "timeout";
  if (name === "SyntaxError" || name === "InvalidLyricsResponse") return "invalid-response";
  if (error instanceof TypeError) return "offline";
  return "error";
}
