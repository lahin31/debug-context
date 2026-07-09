/**
 * Lightweight UUID v4 generator that relies only on Node's built-in
 * `crypto.randomUUID()` (Node ≥ 14.17) — no external dependencies.
 */
import { randomUUID } from "node:crypto";

/** Returns a new UUID v4 string. */
export function generateId(): string {
  return randomUUID();
}
