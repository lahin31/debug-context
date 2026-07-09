/**
 * @module utils/to-file
 * Writes incidents to a newline-delimited JSON (NDJSON) file.
 *
 * NDJSON is the standard format for append-only incident logs — one JSON
 * object per line, easy to stream, grep, and parse with any tool.
 *
 * @example
 * ```ts
 * import DebugContext from '@debugcontext/core';
 *
 * DebugContext.init({
 *   onIncident: (incident) => DebugContext.toFile(incident),
 * });
 * ```
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Incident } from "../types.js";

export interface ToFileOptions {
  /**
   * Path to the output file.
   * @default "incidents.ndjson"  (relative to process.cwd())
   */
  path?: string;
  /**
   * When `true`, creates parent directories if they don't exist.
   * @default true
   */
  mkdirp?: boolean;
}

/**
 * Appends an incident as a single JSON line to an NDJSON file.
 *
 * - Safe to call from multiple processes (append is atomic on most OSes).
 * - Synchronous by design so it can be called inside `onIncident` without
 *   worrying about buffering or unhandled promise rejections.
 *
 * @param incident - The incident to write.
 * @param options  - Output options.
 *
 * @example
 * ```ts
 * // Write to the default path (incidents.ndjson)
 * DebugContext.toFile(incident);
 *
 * // Write to a custom path
 * DebugContext.toFile(incident, { path: 'logs/incidents.ndjson' });
 * ```
 */
export function toFile(
  incident: Incident,
  options: ToFileOptions = {}
): void {
  const filePath = resolve(process.cwd(), options.path ?? "incidents.ndjson");
  const mkdirp = options.mkdirp ?? true;

  if (mkdirp) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  const line = JSON.stringify(incident) + "\n";
  appendFileSync(filePath, line, "utf8");
}
