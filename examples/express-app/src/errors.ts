/**
 * Custom application error types.
 *
 * These demonstrate how DebugContext captures the full error hierarchy —
 * name, message, stack, HTTP status, and nested causes.
 */

// ---------------------------------------------------------------------------
// Base application error
// ---------------------------------------------------------------------------

export class AppError extends Error {
  /** HTTP status code to send in the response */
  readonly statusCode: number;
  /** Machine-readable error code */
  readonly code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// HTTP-layer errors
// ---------------------------------------------------------------------------

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id
      ? `${resource} with id '${id}' was not found`
      : `${resource} was not found`;
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 422, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to access this resource") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Service / infrastructure errors (with cause chaining)
// ---------------------------------------------------------------------------

export class DatabaseError extends AppError {
  readonly query: string | undefined;

  constructor(message: string, cause?: unknown, query?: string) {
    super(message, 500, "DATABASE_ERROR");
    this.name = "DatabaseError";
    this.query = query;
    // ES2022 error cause — DebugContext captures this automatically
    if (cause !== undefined) {
      (this as Error & { cause: unknown }).cause = cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ExternalServiceError extends AppError {
  readonly service: string;
  readonly upstreamStatus: number | undefined;

  constructor(service: string, message: string, cause?: unknown, upstreamStatus?: number) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR");
    this.name = "ExternalServiceError";
    this.service = service;
    this.upstreamStatus = upstreamStatus;
    if (cause !== undefined) {
      (this as Error & { cause: unknown }).cause = cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TimeoutError extends AppError {
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`, 504, "TIMEOUT");
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
