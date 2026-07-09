/**
 * @debugcontext/core
 *
 * Zero-configuration debugging context SDK for Node.js.
 *
 * @example
 * ```ts
 * import DebugContext from '@debugcontext/core';
 *
 * DebugContext.init();
 *
 * try {
 *   throw new Error('something broke');
 * } catch (err) {
 *   const incident = DebugContext.capture(err);
 *   DebugContext.toConsole(incident);
 * }
 * ```
 */

// Named exports for tree-shaking
export { capture, getOptions, init, middleware, toConsole, toFile, toJSON } from "./debug-context.js";

// Default export for convenience
export { default } from "./debug-context.js";

// Types
export type {
  DebugContextOptions,
  ErrorContext,
  GitContext,
  Incident,
  RequestContext,
  RuntimeContext,
  SystemContext,
} from "./types.js";

// Collector exports — allow advanced users to compose their own pipelines
export { collectError } from "./collectors/error.js";
export { collectGit } from "./collectors/git.js";
export { collectRuntime } from "./collectors/runtime.js";
export { collectSystem } from "./collectors/system.js";

// Redaction utilities — useful when building custom adapters
export {
  DEFAULT_SENSITIVE_FIELDS,
  DEFAULT_SENSITIVE_HEADERS,
  redactBody,
  redactHeaders,
} from "./utils/redact.js";

// File output utility
export { toFile as writeIncidentToFile } from "./utils/to-file.js";
export type { ToFileOptions } from "./utils/to-file.js";
