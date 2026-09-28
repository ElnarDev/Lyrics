const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TOKEN_BYTES = 32;
const AUTH_TIMEOUT_MS = 5000;

function loadOrCreateBridgeToken(userDataPath) {
  const file = path.join(userDataPath, "bridge-token");
  try {
    const token = fs.readFileSync(file, "utf8").trim();
    if (/^[a-f0-9]{64}$/.test(token)) return token;
    throw new Error("Invalid local bridge token");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  try {
    fs.writeFileSync(file, token, { flag: "wx", mode: 0o600 });
    return token;
  } catch (error) {
    if (error.code === "EEXIST") return loadOrCreateBridgeToken(userDataPath);
    throw error;
  }
}

function isValidBridgeAuth(raw, isBinary, expectedToken) {
  if (isBinary || raw.length > 256 || !/^[a-f0-9]{64}$/.test(expectedToken)) return false;
  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    return false;
  }
  if (!value || Array.isArray(value) || typeof value !== "object" ||
    Object.keys(value).length !== 2 || value.type !== "auth" ||
    typeof value.token !== "string" || !/^[a-f0-9]{64}$/.test(value.token)) return false;
  return crypto.timingSafeEqual(Buffer.from(value.token, "hex"), Buffer.from(expectedToken, "hex"));
}

module.exports = { AUTH_TIMEOUT_MS, loadOrCreateBridgeToken, isValidBridgeAuth };
