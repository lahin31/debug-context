/**
 * @module collectors/error
 * Serialises a thrown value into a structured ErrorContext.
 */
import type { ErrorContext } from "../types.js";

/**
 * Converts any thrown value into a structured, serialisable ErrorContext.
 *
 * Handles:
 * - Standard `Error` instances (including subclasses).
 * - Errors with a `.cause` (ES2022 error chaining).
 * - Non-Error throws (strings, objects, etc.).
 */
export function collectError(thrown: unknown): ErrorContext {
  if (thrown instanceof Error) {
    return {
      name: thrown.name,
      message: thrown.message,
      stack: thrown.stack,
      cause: serialiseCause(thrown.cause),
    };
  }

  // Non-Error throw — wrap it so the shape is always consistent
  return {
    name: "UnknownError",
    message: String(thrown),
    stack: undefined,
    cause: undefined,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function serialiseCause(cause: unknown): unknown {
  if (cause === undefined || cause === null) return undefined;

  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
      cause: serialiseCause(cause.cause),
    };
  }

  // Primitive or plain object cause
  try {
    // Ensure it's JSON-safe
    return JSON.parse(JSON.stringify(cause)) as unknown;
  } catch {
    return String(cause);
  }
}
