/**
 * @module middleware
 * Express error-handling and request-tagging middleware for DebugContext.
 */
import DebugContext, { type Incident } from "@lahin31/debugcontext-core";
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { extractRequest } from "./extract-request.js";

// Augment Express Request to carry the incident (useful for custom handlers)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by DebugContext when an error is captured for this request. */
      debugContextIncident?: Incident;
    }
  }
}

// ---------------------------------------------------------------------------
// Request-tagging middleware
// ---------------------------------------------------------------------------

/**
 * Request middleware that stashes route params on the request object before
 * Express can clear them during error propagation.
 *
 * Express resets `req.params = {}` while propagating errors through the
 * router stack, but `req.route.path` and `req.path` remain intact.
 * This middleware snaps params as soon as they are set in the route handler.
 *
 * Mount **before** your routes:
 * ```ts
 * app.use(DebugContextExpress.requestMiddleware());
 * ```
 */
export function requestMiddleware(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Snapshot on request start (usually empty at this point)
    req._debugContextParams = {};
    next();
  };
}

// ---------------------------------------------------------------------------
// Error-handling middleware
// ---------------------------------------------------------------------------

/**
 * Express 4-argument error middleware that captures every route error as a
 * DebugContext `Incident`.
 *
 * Mount **after** all routes:
 * ```ts
 * app.use(DebugContextExpress.errorMiddleware());
 * ```
 *
 * @param options.rethrow    - When `true`, calls `next(err)` after capturing so
 *                             your own error handler can still run.
 *                             Defaults to `true`.
 * @param options.toConsole  - When `true`, prints the incident to the console.
 *                             Defaults to `true` in non-production environments.
 */
export function errorMiddleware(
  options: ErrorMiddlewareOptions = {}
): ErrorRequestHandler {
  const {
    rethrow = true,
    toConsole = process.env["NODE_ENV"] !== "production",
  } = options;

  // Express identifies error middleware by its 4-argument signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    const requestCtx = extractRequest(req);
    const incident = DebugContext.capture(err, requestCtx);

    // Attach to the request for downstream handlers
    req.debugContextIncident = incident;

    if (toConsole) {
      DebugContext.toConsole(incident);
    }

    if (rethrow) {
      next(err);
    }
  };
}

export interface ErrorMiddlewareOptions {
  /**
   * When `true`, the error is passed to the next error handler via `next(err)`
   * after the incident is captured.
   * @default true
   */
  rethrow?: boolean;
  /**
   * When `true`, the incident is printed to the console.
   * Defaults to `true` in non-production environments.
   */
  toConsole?: boolean;
}
