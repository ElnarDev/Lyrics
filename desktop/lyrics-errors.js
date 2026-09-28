function lyricsErrorStatus(error) {
  if (error?.name === "TimeoutError") return "timeout";
  if (error?.name === "SyntaxError" || error?.name === "InvalidLyricsResponse") return "invalid-response";
  if (error instanceof TypeError) return "offline";
  return "error";
}

module.exports = { lyricsErrorStatus };
