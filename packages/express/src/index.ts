/**
 * @lahin31/debugcontext-express
 *
 * Express.js adapter for DebugContext.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import DebugContext from '@lahin31/debugcontext-core';
 * import DebugContextExpress from '@lahin31/debugcontext-express';
 *
 * const app = express();
 *
 * // 1. Initialise the SDK once
 * DebugContext.init();
 *
 * app.use(express.json());
 *
 * // 2. (Optional) tag all requests
 * app.use(DebugContextExpress.requestMiddleware());
 *
 * // ... your routes ...
 *
 * // 3. Mount the error middleware LAST
 * app.use(DebugContextExpress.errorMiddleware());
 * ```
 */

export { errorMiddleware, requestMiddleware } from "./middleware.js";
export type { ErrorMiddlewareOptions } from "./middleware.js";
export { extractRequest } from "./extract-request.js";

// Convenience default export
import { errorMiddleware, requestMiddleware } from "./middleware.js";

const DebugContextExpress = {
  /** Captures and structures every Express route error as an Incident. */
  errorMiddleware,
  /**
   * Optional request-tagging middleware.
   * Mount before your routes for maximum compatibility.
   */
  requestMiddleware,
} as const;

export default DebugContextExpress;
