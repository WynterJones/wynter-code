/**
 * Centralized error handling utility for stores
 *
 * Provides:
 * - Consistent error logging with context
 * - Error message extraction from unknown types
 * - Error categorization
 * - Type-safe error handling
 *
 * Usage:
 *   import { handleError, getErrorMessage, ErrorCategory } from '@/lib/errorHandler';
 *
 *   try {
 *     await someOperation();
 *   } catch (error) {
 *     const message = handleError(error, 'StoreName.methodName');
 *     set({ error: message });
 *   }
 */

import { debug } from "./debug";

/** Error categories for classification */
export type ErrorCategory =
  | "network"
  | "validation"
  | "permission"
  | "notFound"
  | "timeout"
  | "cancelled"
  | "unknown";

/**
 * Extract a user-friendly error message from an unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    // Handle Tauri invoke errors
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    // Handle error objects with string property
    if ("error" in error && typeof error.error === "string") {
      return error.error;
    }
  }

  return "An unknown error occurred";
}

/**
 * Categorize an error based on its message/type
 */
function categorizeError(error: unknown): ErrorCategory {
  const message = getErrorMessage(error).toLowerCase();

  // Network errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("offline")
  ) {
    return "network";
  }

  // Permission errors
  if (
    message.includes("permission") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("access denied") ||
    message.includes("401") ||
    message.includes("403")
  ) {
    return "permission";
  }

  // Not found errors
  if (
    message.includes("not found") ||
    message.includes("404") ||
    message.includes("no such file") ||
    message.includes("does not exist")
  ) {
    return "notFound";
  }

  // Timeout errors
  if (message.includes("timeout") || message.includes("timed out")) {
    return "timeout";
  }

  // Cancelled/aborted operations
  if (
    message.includes("cancelled") ||
    message.includes("canceled") ||
    message.includes("aborted") ||
    error instanceof DOMException && error.name === "AbortError"
  ) {
    return "cancelled";
  }

  // Validation errors
  if (
    message.includes("invalid") ||
    message.includes("validation") ||
    message.includes("required") ||
    message.includes("must be")
  ) {
    return "validation";
  }

  return "unknown";
}

/**
 * Handle an error with consistent logging and message extraction
 *
 * @param error - The caught error (unknown type)
 * @param context - Where the error occurred (e.g., "StoreName.methodName")
 * @param options - Additional options
 * @returns The error message string for use in state
 *
 * @example
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const message = handleError(error, 'DataStore.fetchData');
 *   set({ error: message });
 * }
 */
export function handleError(
  error: unknown,
  context: string,
  options: {
    /** If true, suppresses console logging (for expected errors) */
    silent?: boolean;
    /** Additional data to log with the error */
    metadata?: Record<string, unknown>;
  } = {}
): string {
  const message = getErrorMessage(error);
  const category = categorizeError(error);

  // Log unless silent
  if (!options.silent) {
    const logContext = options.metadata
      ? { context, category, ...options.metadata }
      : { context, category };

    debug.error(`[${context}]`, message, logContext);

    // Also log to console.error for visibility in production
    console.error(`[${context}]`, message);
  }

  return message;
}
