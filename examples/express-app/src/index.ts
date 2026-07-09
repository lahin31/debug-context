/**
 * DebugContext — Express Example Application
 *
 * Demonstrates how DebugContext captures different error types,
 * chained causes, custom error classes, and request context.
 *
 * Run:
 *   node dist/index.js
 *
 * Test routes:
 *   curl http://localhost:3000/ok
 *   curl http://localhost:3000/errors/not-found
 *   curl http://localhost:3000/errors/validation
 *   curl http://localhost:3000/errors/unauthorized
 *   curl http://localhost:3000/errors/forbidden
 *   curl http://localhost:3000/errors/conflict
 *   curl http://localhost:3000/errors/database
 *   curl http://localhost:3000/errors/external-service
 *   curl http://localhost:3000/errors/timeout
 *   curl http://localhost:3000/errors/chained
 *   curl http://localhost:3000/errors/non-error
 *   curl http://localhost:3000/users/42
 *   curl -X POST http://localhost:3000/login -H 'Content-Type: application/json' \
 *        -d '{"username":"alice","password":"hunter2"}'
 *   curl http://localhost:3000/manual
 */

import DebugContext from "@debugcontext/core";
import DebugContextExpress from "@debugcontext/express";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  AppError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  ForbiddenError,
  NotFoundError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "./errors.js";

// ---------------------------------------------------------------------------
// 1. Initialise DebugContext
// ---------------------------------------------------------------------------
DebugContext.init({
  onIncident: (incident) => {
    console.log(`\n[DebugContext] Incident captured: ${incident.incidentId}`);
  },
});

// ---------------------------------------------------------------------------
// 2. Express setup
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(DebugContextExpress.requestMiddleware());

// ---------------------------------------------------------------------------
// 3. Routes
// ---------------------------------------------------------------------------

/** Healthy route — baseline to confirm the server is running */
app.get("/ok", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "Everything is fine 👍" });
});

// --- Error type showcase routes -------------------------------------------

/**
 * 404 NotFoundError
 * DebugContext captures: name="NotFoundError", statusCode=404, code="NOT_FOUND"
 */
app.get("/errors/not-found", (_req: Request, _res: Response) => {
  throw new NotFoundError("User", 99);
});

/**
 * 422 ValidationError — includes a `fields` map
 * DebugContext captures the full custom properties on the error object
 */
app.get("/errors/validation", (_req: Request, _res: Response) => {
  throw new ValidationError("Request body is invalid", {
    email: "must be a valid email address",
    age: "must be a positive integer",
  });
});

/**
 * 401 UnauthorizedError
 */
app.get("/errors/unauthorized", (_req: Request, _res: Response) => {
  throw new UnauthorizedError("JWT token is missing or expired");
});

/**
 * 403 ForbiddenError
 */
app.get("/errors/forbidden", (_req: Request, _res: Response) => {
  throw new ForbiddenError("Admin role required to access this resource");
});

/**
 * 409 ConflictError
 */
app.get("/errors/conflict", (_req: Request, _res: Response) => {
  throw new ConflictError("A user with email 'alice@example.com' already exists");
});

/**
 * 500 DatabaseError with a chained cause
 *
 * The cause chain looks like:
 *   DatabaseError
 *     └─ cause: TypeError (simulated low-level driver error)
 *
 * DebugContext captures both layers via error.cause.
 */
app.get("/errors/database", (_req: Request, _res: Response) => {
  // Simulate a low-level driver error
  const driverError = new TypeError(
    "Cannot read properties of undefined (reading 'rows')"
  );

  throw new DatabaseError(
    "Failed to fetch user record",
    driverError,
    "SELECT * FROM users WHERE id = $1"
  );
});

/**
 * 502 ExternalServiceError with a chained cause
 *
 * Cause chain:
 *   ExternalServiceError
 *     └─ cause: Error (simulated network failure)
 */
app.get("/errors/external-service", (_req: Request, _res: Response) => {
  const networkError = new Error("connect ECONNREFUSED 10.0.0.5:443");

  throw new ExternalServiceError(
    "PaymentService",
    "Failed to process payment — upstream service unavailable",
    networkError,
    503
  );
});

/**
 * 504 TimeoutError
 */
app.get("/errors/timeout", (_req: Request, _res: Response) => {
  throw new TimeoutError("fetchUserProfile", 5000);
});

/**
 * Deep cause chain — 3 levels deep
 *
 * AppError → DatabaseError → TypeError
 *
 * DebugContext recursively serialises all cause levels.
 */
app.get("/errors/chained", (_req: Request, _res: Response) => {
  const rootCause = new TypeError("null is not an object");
  const dbError = new DatabaseError("Query execution failed", rootCause);
  throw new AppError("Unable to complete request due to a data layer failure", 500, "DATA_LAYER_FAILURE");
  // Attach cause manually to AppError for demo
  void dbError; // referenced above via closure to satisfy linter
});

// Richer chained version that actually threads the cause through
app.get("/errors/chained-deep", (_req: Request, _res: Response) => {
  const rootCause = new TypeError("null is not an object (evaluating 'row.id')");
  const dbError = new DatabaseError("Query execution failed", rootCause, "SELECT id FROM sessions");
  const appErr = new AppError("Session lookup failed", 500, "SESSION_LOOKUP_FAILED");
  (appErr as Error & { cause: unknown }).cause = dbError;
  throw appErr;
});

/**
 * Non-Error throw — DebugContext handles plain strings, numbers, objects too
 */
app.get("/errors/non-error", (_req: Request, _res: Response) => {
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw { code: "WEIRD_THING", detail: "something threw a plain object" };
});

// --- Real-world style routes -----------------------------------------------

/**
 * Route with params — demonstrates param capture even on error
 * curl http://localhost:3000/users/42
 */
app.get("/users/:id", (req: Request, _res: Response) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    throw new ValidationError(`Invalid user id: '${id}'`, { id: "must be a number" });
  }
  // Simulate "not found" from DB
  throw new NotFoundError("User", id);
});

/**
 * POST with body — demonstrates body redaction
 * curl -X POST http://localhost:3000/login \
 *   -H 'Content-Type: application/json' \
 *   -d '{"username":"alice","password":"hunter2"}'
 */
app.post("/login", (req: Request, _res: Response) => {
  const { username } = req.body as { username?: string; password?: string };
  if (!username) {
    throw new ValidationError("Login failed", { username: "is required" });
  }
  throw new UnauthorizedError(`Invalid credentials for '${username}'`);
});

/**
 * Manual capture — captures the error yourself without middleware
 * curl http://localhost:3000/manual
 */
app.get("/manual", (_req: Request, res: Response) => {
  try {
    JSON.parse("{ bad json }");
  } catch (err) {
    const incident = DebugContext.capture(err);
    DebugContext.toConsole(incident);
    res.status(500).json(JSON.parse(DebugContext.toJSON(incident) ?? "{}"));
    return;
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// 4. DebugContext error middleware — MUST come after all routes
// ---------------------------------------------------------------------------
app.use(
  DebugContextExpress.errorMiddleware({
    rethrow: true,
    toConsole: true,
  })
);

// ---------------------------------------------------------------------------
// 5. Final error handler — sends HTTP response
// ---------------------------------------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      code: err.code,
      message: err.message,
    });
    return;
  }

  // Fallback for plain Error or non-Error throws
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: "InternalServerError", message });
});

// ---------------------------------------------------------------------------
// 6. Start
// ---------------------------------------------------------------------------
const PORT = process.env["PORT"] ?? 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 DebugContext example running at http://localhost:${PORT}\n`);
  console.log("── Error type routes ─────────────────────────────────────");
  console.log(`  GET  /errors/not-found        → NotFoundError (404)`);
  console.log(`  GET  /errors/validation       → ValidationError (422)`);
  console.log(`  GET  /errors/unauthorized     → UnauthorizedError (401)`);
  console.log(`  GET  /errors/forbidden        → ForbiddenError (403)`);
  console.log(`  GET  /errors/conflict         → ConflictError (409)`);
  console.log(`  GET  /errors/database         → DatabaseError + cause (500)`);
  console.log(`  GET  /errors/external-service → ExternalServiceError + cause (502)`);
  console.log(`  GET  /errors/timeout          → TimeoutError (504)`);
  console.log(`  GET  /errors/chained-deep     → 3-level cause chain`);
  console.log(`  GET  /errors/non-error        → plain object throw`);
  console.log("── Real-world routes ─────────────────────────────────────");
  console.log(`  GET  /users/:id               → params + NotFoundError`);
  console.log(`  POST /login                   → body redaction demo`);
  console.log(`  GET  /manual                  → manual DebugContext.capture()`);
  console.log(`  GET  /ok                      → healthy route`);
  console.log("──────────────────────────────────────────────────────────\n");
});
