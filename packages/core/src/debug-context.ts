/**
 * @module debug-context
 * Core DebugContext singleton — orchestrates collectors and exposes the
 * public SDK API.
 */
import { collectError } from "./collectors/error.js";
import { collectGit } from "./collectors/git.js";
import { collectRuntime } from "./collectors/runtime.js";
import { collectSystem } from "./collectors/system.js";
import type {
  DebugContextOptions,
  Incident,
  RequestContext,
} from "./types.js";
import { generateId } from "./utils/id.js";
import { toFile as toFileUtil, type ToFileOptions } from "./utils/to-file.js";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let options: Required<DebugContextOptions> = buildDefaultOptions();
let lastIncident: Incident | null = null;
let globalHandlersAttached = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialises DebugContext with optional configuration.
 *
 * Call once at application startup — before your Express app starts
 * accepting requests.
 *
 * @example
 * ```ts
 * import DebugContext from '@debugcontext/core';
 *
 * DebugContext.init({ onIncident: (i) => console.log(i) });
 * ```
 */
function init(userOptions: DebugContextOptions = {}): void {
  options = {
    ...buildDefaultOptions(),
    ...userOptions,
    sensitiveHeaders: [
      ...(userOptions.sensitiveHeaders ?? []),
    ],
    sensitiveFields: [
      ...(userOptions.sensitiveFields ?? []),
    ],
  };

  // Warm up the Git cache on init so the first incident is fast
  collectGit();

  if (options.captureGlobalErrors && !globalHandlersAttached) {
    attachGlobalHandlers();
    globalHandlersAttached = true;
  }
}

/**
 * Captures an error (and an optional request context provided by a framework
 * adapter) into a structured Incident.
 *
 * @param error   - The thrown value.
 * @param request - Optional request context from a framework adapter.
 * @returns The captured Incident.
 *
 * @example
 * ```ts
 * try {
 *   riskyOperation();
 * } catch (err) {
 *   const incident = DebugContext.capture(err);
 *   DebugContext.toConsole(incident);
 * }
 * ```
 */
function capture(error: unknown, request: RequestContext | null = null): Incident {
  const incident: Incident = {
    incidentId: generateId(),
    timestamp: new Date().toISOString(),
    request,
    runtime: collectRuntime(),
    system: collectSystem(),
    git: collectGit(),
    error: collectError(error),
  };

  lastIncident = incident;

  // Fire the user-supplied hook (non-blocking)
  if (options.onIncident) {
    Promise.resolve(options.onIncident(incident)).catch((hookErr: unknown) => {
      console.error("[DebugContext] onIncident hook threw:", hookErr);
    });
  }

  return incident;
}

/**
 * Returns the most recently captured Incident as a JSON string.
 *
 * @param incident - Incident to serialise.  Defaults to the last captured one.
 * @returns Pretty-printed JSON string, or `null` if no incident has been captured.
 */
function toJSON(incident?: Incident): string | null {
  const target = incident ?? lastIncident;
  if (!target) return null;
  return JSON.stringify(target, null, 2);
}

/**
 * Prints the incident to the console in a human-readable format.
 *
 * @param incident - Incident to print.  Defaults to the last captured one.
 */
function toConsole(incident?: Incident): void {
  const target = incident ?? lastIncident;
  if (!target) {
    console.warn("[DebugContext] No incident to display.");
    return;
  }

  const hr = "─".repeat(60);

  console.error(`
${hr}
🐛  DebugContext Incident  ${target.incidentId}
${hr}

  Error      : ${target.error.name}: ${target.error.message}
  Timestamp  : ${target.timestamp}
  Environment: ${target.runtime.environment}
  Node       : ${target.runtime.nodeVersion}
  PID        : ${target.runtime.pid}
  Hostname   : ${target.runtime.hostname}
  Uptime     : ${target.runtime.uptimeSeconds.toFixed(1)}s
  Commit     : ${target.git.commitHash} (${target.git.branch})
  Version    : ${target.git.packageVersion}

  Heap       : ${target.system.heapUsagePercent}% used
  RSS        : ${formatBytes(target.system.memory.rss)}

${target.request ? formatRequest(target.request) : "  No request context."}

  Stack:
${indentStack(target.error.stack ?? "(no stack)")}
${hr}
`);
}

/**
 * Appends the incident to a newline-delimited JSON (NDJSON) file.
 * Creates the file and parent directories if they don't exist.
 *
 * @param incident - Incident to write. Defaults to the last captured one.
 * @param options  - `{ path?: string }` — defaults to `"incidents.ndjson"`.
 *
 * @example
 * ```ts
 * DebugContext.init({
 *   onIncident: (i) => DebugContext.toFile(i, { path: 'logs/incidents.ndjson' }),
 * });
 * ```
 */
function toFile(incident?: Incident, options?: ToFileOptions): void {
  const target = incident ?? lastIncident;
  if (!target) {
    console.warn("[DebugContext] No incident to write.");
    return;
  }
  toFileUtil(target, options);
}

/**
 * Returns a framework-agnostic capture function pre-bound to the current
 * options. Useful when building custom adapters.
 *
 * For Express, use `@debugcontext/express` instead.
 *
 * @example
 * ```ts
 * // In a custom adapter:
 * const mw = DebugContext.middleware();
 * app.use((err, req, res, next) => {
 *   const requestCtx = buildRequestCtx(req);
 *   mw(err, requestCtx);
 *   next(err);
 * });
 * ```
 */
function middleware(): (error: unknown, request?: RequestContext | null) => Incident {
  return (error: unknown, request: RequestContext | null = null): Incident => {
    return capture(error, request);
  };
}

/**
 * Returns the current SDK options (useful for adapters).
 * @internal
 */
function getOptions(): Required<DebugContextOptions> {
  return options;
}

// ---------------------------------------------------------------------------
// Global error handlers
// ---------------------------------------------------------------------------

function attachGlobalHandlers(): void {
  process.on("uncaughtException", (err: Error) => {
    const incident = capture(err, null);
    toConsole(incident);
    // Re-throw so Node's default behaviour (exit) still fires
    process.exitCode = 1;
  });

  process.on("unhandledRejection", (reason: unknown) => {
    capture(reason, null);
  });
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatRequest(req: RequestContext): string {
  return [
    `  Request:`,
    `    ${req.method} ${req.url}`,
    `    IP        : ${req.ip}`,
    `    User-Agent: ${req.userAgent}`,
  ].join("\n");
}

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

function indentStack(stack: string): string {
  return stack
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Default options factory
// ---------------------------------------------------------------------------

function buildDefaultOptions(): Required<DebugContextOptions> {
  return {
    sensitiveHeaders: [],
    sensitiveFields: [],
    onIncident: () => undefined,
    captureGlobalErrors: true,
  };
}

// ---------------------------------------------------------------------------
// Named export object (tree-shakable)
// ---------------------------------------------------------------------------

/**
 * The DebugContext SDK.
 *
 * @example
 * ```ts
 * import DebugContext from '@debugcontext/core';
 *
 * DebugContext.init();
 * ```
 */
const DebugContext = {
  init,
  capture,
  toJSON,
  toConsole,
  toFile,
  middleware,
  /** @internal used by framework adapters */
  getOptions,
} as const;

export default DebugContext;
export { init, capture, toJSON, toConsole, toFile, middleware, getOptions };
