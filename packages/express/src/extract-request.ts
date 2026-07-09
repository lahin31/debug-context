/**
 * @module extract-request
 * Extracts and sanitises request context from an Express Request object.
 */
import {
  getOptions,
  redactBody,
  redactHeaders,
  type RequestContext,
} from "@lahin31/debugcontext-core";
import type { Request } from "express";

// ---------------------------------------------------------------------------
// Augment Express Request to stash params before Express clears them
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** @internal Route params stashed before Express error-propagation clears them. */
      _debugContextParams?: Record<string, string>;
    }
  }
}

/**
 * Converts an Express `Request` into a `RequestContext` safe for logging.
 *
 * - Sensitive headers are redacted using the configured sensitive-header list.
 * - Sensitive body fields are redacted using the configured sensitive-field list.
 *
 * Note: Express clears `req.params` while propagating errors through the layer
 * stack. We recover params from `req.route.path` + `req.path` when necessary.
 */
export function extractRequest(req: Request): RequestContext {
  const { sensitiveHeaders, sensitiveFields } = getOptions();

  return {
    method: req.method,
    url: req.originalUrl ?? req.url,
    params: resolveParams(req),
    query: (req.query as Record<string, string | string[]>) ?? {},
    body: redactBody(req.body as unknown, sensitiveFields),
    headers: redactHeaders(
      req.headers as Record<string, string | string[] | undefined>,
      sensitiveHeaders
    ),
    ip: resolveIp(req),
    userAgent: req.get("user-agent") ?? "unknown",
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves route params from multiple sources in priority order:
 *
 * 1. `req.params` — works when the error happens asynchronously (via next(err))
 *    because Express has already set params and hasn't cleared them yet.
 * 2. Parse from `req.route.path` + `req.path` — works for synchronous throws
 *    where Express clears `req.params` during error propagation.
 * 3. `req._debugContextParams` — stashed by `requestMiddleware()` if used.
 */
function resolveParams(req: Request): Record<string, string> {
  // 1. Live params (works for next(err) style)
  const liveParams = req.params as Record<string, string> | undefined;
  if (liveParams && Object.keys(liveParams).length > 0) {
    return liveParams;
  }

  // 2. Parse from route path pattern (works for sync throws)
  const routePath = (req.route as { path?: string } | undefined)?.path;
  if (routePath && typeof routePath === "string") {
    const parsed = parseParamsFromRoute(routePath, req.path);
    if (Object.keys(parsed).length > 0) {
      return parsed;
    }
  }

  // 3. Stashed by requestMiddleware (fallback)
  if (req._debugContextParams && Object.keys(req._debugContextParams).length > 0) {
    return req._debugContextParams;
  }

  return {};
}

/**
 * Parses named route parameters from an Express-style route pattern and an
 * actual URL path segment.
 *
 * Example:
 *   pattern: "/users/:id/posts/:postId"
 *   actual:  "/users/42/posts/7"
 *   result:  { id: "42", postId: "7" }
 *
 * Supports `:param` style only (covers ~99% of real-world use).
 */
function parseParamsFromRoute(
  pattern: string,
  actualPath: string
): Record<string, string> {
  const patternParts = pattern.split("/");
  const actualParts = actualPath.split("/");

  if (patternParts.length !== actualParts.length) return {};

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const segment = patternParts[i];
    if (segment?.startsWith(":")) {
      const key = segment.slice(1).replace(/[?+*]$/, ""); // strip modifiers
      const value = actualParts[i];
      if (key && value !== undefined) {
        params[key] = decodeURIComponent(value);
      }
    }
  }
  return params;
}

/**
 * Resolves the client IP, respecting common proxy headers when present.
 */
function resolveIp(req: Request): string {
  if (req.ip) return req.ip;
  return req.socket?.remoteAddress ?? "unknown";
}
