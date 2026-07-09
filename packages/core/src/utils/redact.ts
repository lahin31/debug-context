/**
 * @module redact
 * Utilities for scrubbing sensitive data from headers and request bodies
 * before they are included in an Incident.
 */

/** Header names that are always redacted (case-insensitive comparison). */
export const DEFAULT_SENSITIVE_HEADERS: readonly string[] = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "proxy-authorization",
  "www-authenticate",
];

/** Body / object field names that are always redacted (case-insensitive). */
export const DEFAULT_SENSITIVE_FIELDS: readonly string[] = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "creditcard",
  "credit_card",
  "cardnumber",
  "card_number",
  "cvv",
  "ssn",
  "privatekey",
  "private_key",
];

const REDACTED = "[REDACTED]";

/**
 * Returns a copy of `headers` where sensitive values are replaced with
 * `"[REDACTED]"`.
 *
 * @param headers       - Raw header map (values may be string or string[]).
 * @param extraFields   - Caller-supplied additional header names to redact.
 */
export function redactHeaders(
  headers: Record<string, string | string[] | undefined>,
  extraFields: string[] = []
): Record<string, string> {
  const sensitiveSet = new Set(
    [...DEFAULT_SENSITIVE_HEADERS, ...extraFields].map((h) => h.toLowerCase())
  );

  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const normalised = key.toLowerCase();
    const raw = Array.isArray(value) ? value.join(", ") : value;
    result[key] = sensitiveSet.has(normalised) ? REDACTED : raw;
  }

  return result;
}

/**
 * Deeply walks `body` (plain objects / arrays) and replaces the *values* of
 * sensitive keys with `"[REDACTED]"`.  Non-plain-object values are returned
 * as-is (e.g. strings, numbers, Buffers).
 *
 * @param body        - The request body to sanitise.
 * @param extraFields - Caller-supplied additional field names to redact.
 */
export function redactBody(
  body: unknown,
  extraFields: string[] = []
): unknown {
  const sensitiveSet = new Set(
    [...DEFAULT_SENSITIVE_FIELDS, ...extraFields].map((f) => f.toLowerCase())
  );

  return walk(body, sensitiveSet, 0);
}

const MAX_DEPTH = 10;

function walk(value: unknown, sensitive: Set<string>, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[MAX_DEPTH_EXCEEDED]";
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => walk(item, sensitive, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = sensitive.has(key.toLowerCase())
      ? REDACTED
      : walk(val, sensitive, depth + 1);
  }
  return result;
}
