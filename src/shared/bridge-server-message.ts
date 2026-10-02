import type { ServerHandshakeMessage } from "./protocol.js";

export type { ServerHandshakeMessage } from "./protocol.js";

/** Admite ready sin versión para reconocer aplicaciones anteriores. */
export function parseServerHandshake(value: unknown): ServerHandshakeMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (record.type === "compatible") return keys.length === 1 ? { type: "compatible" } : null;
  if (record.type !== "ready" || keys.some((key) => key !== "type" && key !== "protocolVersion")) return null;
  const version = record.protocolVersion;
  if (version === undefined) return { type: "ready" };
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) return null;
  return { type: "ready", protocolVersion: version };
}
