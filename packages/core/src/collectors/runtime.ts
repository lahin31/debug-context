/**
 * @module collectors/runtime
 * Collects Node.js runtime information.
 */
import os from "node:os";
import type { RuntimeContext } from "../types.js";

/**
 * Captures a snapshot of the current Node.js runtime environment.
 */
export function collectRuntime(): RuntimeContext {
  return {
    timestamp: new Date().toISOString(),
    environment: process.env["NODE_ENV"] ?? "development",
    nodeVersion: process.version,
    pid: process.pid,
    hostname: os.hostname(),
    uptimeSeconds: process.uptime(),
    workingDirectory: process.cwd(),
  };
}
