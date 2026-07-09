/**
 * @module types
 * Core type definitions for DebugContext incidents.
 */

// ---------------------------------------------------------------------------
// Sub-contexts
// ---------------------------------------------------------------------------

/** HTTP request context captured at the time of the error. */
export interface RequestContext {
  /** HTTP method (GET, POST, …) */
  method: string;
  /** Full request URL including query string */
  url: string;
  /** Express-style named route params, e.g. { id: "42" } */
  params: Record<string, string>;
  /** Parsed query-string parameters */
  query: Record<string, string | string[]>;
  /** Request body — sensitive fields are redacted */
  body: unknown;
  /** Selected headers — auth / cookie values are redacted */
  headers: Record<string, string>;
  /** Client IP address */
  ip: string;
  /** User-Agent string */
  userAgent: string;
}

/** Node.js runtime context at the time of the error. */
export interface RuntimeContext {
  /** ISO-8601 timestamp */
  timestamp: string;
  /** NODE_ENV value, defaults to "development" */
  environment: string;
  /** process.version */
  nodeVersion: string;
  /** process.pid */
  pid: number;
  /** os.hostname() */
  hostname: string;
  /** process.uptime() in seconds */
  uptimeSeconds: number;
  /** process.cwd() */
  workingDirectory: string;
}

/** Operating-system / process memory context. */
export interface SystemContext {
  /** process.memoryUsage() */
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  /** Heap usage as a percentage 0-100 */
  heapUsagePercent: number;
  /** os.loadavg() — [1m, 5m, 15m] */
  cpuLoadAvg: [number, number, number];
  /** os.platform() */
  platform: string;
  /** os.arch() */
  arch: string;
  /** Total system memory in bytes */
  totalMemory: number;
  /** Free system memory in bytes */
  freeMemory: number;
}

/** Git / package metadata resolved at startup. */
export interface GitContext {
  /** Short (8-char) commit hash, or "unknown" */
  commitHash: string;
  /** Current branch name, or "unknown" */
  branch: string;
  /** version field from the nearest package.json */
  packageVersion: string;
}

/** Serialisable error context. */
export interface ErrorContext {
  /** Error constructor name */
  name: string;
  /** Error message */
  message: string;
  /** Full stack trace */
  stack: string | undefined;
  /** Serialised error.cause if present */
  cause: unknown;
}

// ---------------------------------------------------------------------------
// Top-level Incident
// ---------------------------------------------------------------------------

/**
 * A fully structured debugging snapshot produced whenever an unhandled error
 * or a caught framework error occurs.
 */
export interface Incident {
  /** Unique ID for this incident (UUID v4) */
  incidentId: string;
  /** ISO-8601 timestamp — duplicated here for quick top-level access */
  timestamp: string;
  /** HTTP request that was in-flight when the error occurred (may be null) */
  request: RequestContext | null;
  /** Node.js runtime snapshot */
  runtime: RuntimeContext;
  /** System resource snapshot */
  system: SystemContext;
  /** Git / package metadata */
  git: GitContext;
  /** Serialised error */
  error: ErrorContext;
}

// ---------------------------------------------------------------------------
// SDK configuration
// ---------------------------------------------------------------------------

/**
 * Options accepted by `DebugContext.init()`.
 * Everything is optional — the SDK works with zero configuration.
 */
export interface DebugContextOptions {
  /**
   * Additional header names whose values should be redacted.
   * Merged with the built-in sensitive header list.
   */
  sensitiveHeaders?: string[];

  /**
   * Additional body field names whose values should be redacted.
   * Merged with the built-in sensitive field list.
   */
  sensitiveFields?: string[];

  /**
   * Called after each incident is captured.
   * Use this hook to ship incidents to your own storage / alerting.
   *
   * @example
   * DebugContext.init({
   *   onIncident: (incident) => myStorage.save(incident),
   * });
   */
  onIncident?: (incident: Incident) => void | Promise<void>;

  /**
   * When true, DebugContext attaches a global `uncaughtException` +
   * `unhandledRejection` listener.  Defaults to `true`.
   */
  captureGlobalErrors?: boolean;
}
