import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const TOKEN_BYTES = 32;
export const AUTH_TIMEOUT_MS = 5000;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export function loadOrCreateBridgeToken(userDataPath: string): string {
  const file = path.join(userDataPath, "bridge-token");
  try {
    const token = readFileSync(file, "utf8").trim();
    if (TOKEN_PATTERN.test(token)) return token;
    throw new Error("Invalid local bridge token");
  } catch (error: unknown) {
    if (!hasCode(error, "ENOENT")) throw error;
  }
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  try {
    writeFileSync(file, token, { flag: "wx", mode: 0o600 });
    return token;
  } catch (error: unknown) {
    if (hasCode(error, "EEXIST")) return loadOrCreateBridgeToken(userDataPath);
    throw error;
  }
}

export function isValidBridgeAuth(raw: Buffer, isBinary: boolean, expectedToken: string): boolean {
  if (isBinary || raw.length > 256 || !TOKEN_PATTERN.test(expectedToken)) return false;
  let value: unknown;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    return false;
  }
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (Object.keys(message).length !== 2 || message.type !== "auth" ||
    typeof message.token !== "string" || !TOKEN_PATTERN.test(message.token)) return false;
  return timingSafeEqual(Buffer.from(message.token, "hex"), Buffer.from(expectedToken, "hex"));
}
