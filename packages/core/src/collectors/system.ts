/**
 * @module collectors/system
 * Collects OS / process resource usage.
 */
import os from "node:os";
import type { SystemContext } from "../types.js";

/**
 * Captures a snapshot of current system resource usage.
 */
export function collectSystem(): SystemContext {
  const mem = process.memoryUsage();
  const heapUsagePercent =
    mem.heapTotal > 0
      ? Math.round((mem.heapUsed / mem.heapTotal) * 100 * 10) / 10
      : 0;

  const [one, five, fifteen] = os.loadavg() as [number, number, number];

  return {
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
    },
    heapUsagePercent,
    cpuLoadAvg: [one, five, fifteen],
    platform: os.platform(),
    arch: os.arch(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
  };
}
